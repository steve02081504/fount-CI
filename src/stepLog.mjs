import { charname, context } from './context.mjs'
import { escapeHtml } from './utils.mjs'

const CONSOLE_PREVIEW = 2000
const SUMMARY_PREVIEW = 4000

/**
 * 截断过长文本并在末尾标注剩余字符数。
 * @param {unknown} text 原始内容
 * @param {number} limit 最大字符数
 * @returns {string} 原文或截断后的文本
 */
function preview(text, limit) {
	const string = String(text ?? '')
	return string.length <= limit ? string : string.slice(0, limit) + `\n... (${string.length - limit} more chars)`
}

/**
 * 将一步 agent 回复与其 logContext 合并为按时间顺序的条目列表。
 * @param {object} record stepLogs 中的一项
 * @returns {object[]} 含 tool/char 条目的有序列表
 */
function buildStepEntries(record) {
	return [
		...record.logContextBefore,
		{ role: 'char', name: charname, content: record.replyContent },
		...record.logContextAfter,
	]
}

/**
 * 记录并打印一轮 agent GetReply（GitHub Actions log group + stepLogs 快照）。
 * @param {object} args 单步日志参数
 * @param {number} args.step 当前轮次（从 1 起）
 * @param {number} args.chatLogLengthBefore 本轮 GetReply 前的 chat_log 长度
 * @param {import('../../fount/src/public/parts/shells/chat/decl/chatLog.ts').chatReply_t} args.reply GetReply 返回值
 * @param {number} args.chatLogLengthAfter 本轮追加后的 chat_log 长度
 */
export function logAgentStep({ step, chatLogLengthBefore, reply, chatLogLengthAfter }) {
	const elapsed = context.startTime ? ((Date.now() - context.startTime) / 1000).toFixed(1) : '?'
	const record = {
		step,
		elapsedSeconds: elapsed,
		chatLogLengthBefore,
		chatLogLengthAfter,
		replyContent: reply.content ?? '',
		logContextBefore: reply.logContextBefore ?? [],
		logContextAfter: reply.logContextAfter ?? [],
		exitStatus: context.exitStatus,
		exitReason: context.exitReason,
	}
	context.stepLogs.push(record)

	console.log(`::group::🔄 Agent step ${step} | chat_log ${chatLogLengthBefore}→${chatLogLengthAfter} | ${elapsed}s`)

	for (const entry of buildStepEntries(record))
		console.log(`--- ${entry.role == 'char' ? '💬' : '🛠️'} ${entry.name} (${entry.role}) ---\n${preview(entry.content, CONSOLE_PREVIEW)}`)

	if (context.exitStatus)
		console.log(`🚪 Exit signaled: ${context.exitStatus} — ${context.exitReason ?? ''}`)

	console.log('::endgroup::')
}

/**
 * 将 stepLogs 格式化为 GitHub Step Summary 用的 Markdown（折叠 details）。
 * @returns {string} 空字符串表示尚无步骤
 */
export function formatStepLogsMarkdown() {
	if (!context.stepLogs.length) return ''

	let markdown = '### Agent steps\n\n'
	for (const record of context.stepLogs) {
		markdown += `<details><summary>Step ${record.step} · chat_log ${record.chatLogLengthBefore}→${record.chatLogLengthAfter} · ${record.elapsedSeconds}s`
		if (record.exitStatus) markdown += ` · ${record.exitStatus}`
		markdown += '</summary>\n\n'

		for (const entry of buildStepEntries(record))
			markdown += `- **${escapeHtml(entry.name)}** (${escapeHtml(entry.role)}):\n\n\`\`\`\n${escapeHtml(preview(entry.content, SUMMARY_PREVIEW))}\n\`\`\`\n\n`

		if (record.exitStatus)
			markdown += `**Exit**: \`${escapeHtml(record.exitStatus)}\` — ${escapeHtml(record.exitReason ?? '')}\n\n`

		markdown += '</details>\n\n'
	}
	return markdown
}
