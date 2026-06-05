import { loadCIModule } from './context.mjs'
import { exitWithFinalize } from './finalize.mjs'

/**
 * 超出 maxTimeSeconds 或 maxSteps 时触发退出。
 * @param {object} context fount-CI 共享 context
 * @param {object[]} chatLog 当前 chat_log
 * @returns {Promise<void>} 未超限时不退出
 */
async function checkLimits(context, chatLog) {
	if (context.maxTimeSeconds != null && context.startTime) {
		const elapsed = (Date.now() - context.startTime) / 1000
		if (elapsed > context.maxTimeSeconds)
			await exitWithFinalize(context, chatLog, 'timeout', `Runtime exceeded ${context.maxTimeSeconds} seconds`)
	}

	if (context.maxSteps != null && chatLog.length > context.maxSteps)
		await exitWithFinalize(context, chatLog, 'max-steps', 'Chat log step limit exceeded')
}

/**
 * 每轮 GetReply 前注入退出格式说明与剩余步长/时间；并在此检查硬性限制。
 * @param {import('../../../../../src/decl/pluginAPI.ts').chatReplyRequest_t} args fount chat 请求
 * @returns {Promise<import('../../../../../src/decl/prompt_struct.ts').single_part_prompt_t>} 含 `<CI-exit>` 格式说明的 prompt 片段
 */
export async function getCISettlementPrompt(args) {
	let result = `
任务完成后，使用以下格式标记退出：
<CI-exit status="success|failure" reason="说明"/>

status 为 success 表示任务成功完成，failure 表示任务失败。
reason 应简要说明完成或失败的原因。
`
	const { context } = await loadCIModule()
	const chatLog = args.chat_log

	await checkLimits(context, chatLog)

	if (context.maxSteps)
		result += `
剩余对话步长：${String(Math.max(0, context.maxSteps - chatLog.length))}
`

	if (context.maxTimeSeconds) {
		const elapsed = context.startTime ? (Date.now() - context.startTime) / 1000 : 0
		result += `
剩余时间（秒）：${String(Math.max(0, Math.ceil(context.maxTimeSeconds - elapsed)))}
`
	}

	return {
		text: [{
			content: result,
			important: 0,
		}],
		additional_chat_log: [],
		extension: {},
	}
}
