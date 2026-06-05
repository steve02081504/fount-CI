import process from 'node:process'

import { loadCharConfig, resolveCharConfigPath } from './charConfig.mjs'
import { charname, context, username } from './context.mjs'
import { buildEnvDescription } from './env.mjs'
import { char, getChatRequest, loadChar } from './fount.mjs'
import { logAgentStep } from './stepLog.mjs'

/**
 * 将环境变量解析为正整数；空串或非正数返回 null（表示无限制）。
 * @param {string | undefined} value 环境变量原始值
 * @returns {number | null} 解析成功为正整数，否则 null
 */
function parseOptionalInt(value) {
	const number = Number(value)
	return value && Number.isFinite(number) && number > 0 ? number : null
}

/**
 * 把一轮 GetReply 结果（含 logContext 前后缀）追加到 chat log。
 * @param {import('../../fount/src/public/parts/shells/chat/decl/chatLog.ts').chatReply_t} reply GetReply 返回值
 * @param {import('../../fount/src/public/parts/shells/chat/decl/chatLog.ts').chatLogEntry_t[]} chatLog 可变 chat log 数组
 */
function appendReplyToChatLog(reply, chatLog) {
	if (reply.logContextBefore?.length)
		chatLog.push(...reply.logContextBefore.map(entry => ({ ...entry })))
	chatLog.push({
		role: 'char',
		name: charname,
		content: reply.content ?? '',
		files: reply.files ?? [],
	})
	if (reply.logContextAfter?.length)
		chatLog.push(...reply.logContextAfter.map(entry => ({ ...entry })))
}

/**
 * 从环境变量填充 context，校验必需 secret 与 task，并切换到 GITHUB_WORKSPACE。
 * @returns {Promise<void>} 校验失败时 process.exit(1)
 */
export async function setupContextFromEnv() {
	context.task = process.env.FOUNT_CI_TASK || ''
	context.maxSteps = parseOptionalInt(process.env.FOUNT_CI_MAX_STEPS)
	context.maxTimeSeconds = parseOptionalInt(process.env.FOUNT_CI_MAX_TIME_SECONDS)
	context.aisourceName = process.env.FOUNT_CI_AISOURCE_NAME || 'fount-CI'
	context.startTime = Date.now()

	for (const key of ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL'])
		if (!process.env[key]) {
			console.error(`::error::Missing required secrets/env: ${key}`)
			process.exit(1)
		}

	if (!context.task.trim()) {
		console.error('::error::task is required')
		process.exit(1)
	}

	if (process.env.GITHUB_WORKSPACE)
		process.chdir(process.env.GITHUB_WORKSPACE)
}

/**
 * 加载角色后，用 char-config JSON 调用 SetData 绑定 AI 源与插件。
 * @returns {Promise<void>} SetData 完成后返回
 */
export async function configureChar() {
	await loadChar()

	const config = loadCharConfig(
		resolveCharConfigPath(process.env.FOUNT_CI_CHAR_CONFIG_PATH || 'default_data/char-config.json'),
		{ AIsource: context.aisourceName, CIPlugin: 'CI-settlement', charname, username },
	)

	console.log('⚙️ Char config:', JSON.stringify(config))
	await char.interfaces.config.SetData(config)
}

/**
 * 循环调用 GetReply 直至 CI-settlement 设置 exitStatus 或 GetReply 抛错。
 * @returns {Promise<void>} exitStatus 被设置或 GetReply 失败时结束
 */
export async function runAgentLoop() {
	const chatLog = [{
		role: 'system',
		name: 'CI',
		content: `${context.task}\n\n## Environment\n${buildEnvDescription()}`,
		files: [],
	}]
	context.chatLog = chatLog

	console.log('👟 Starting Agent Loop...')
	for (let step = 1; ; step++) {
		const chatLogLengthBefore = chatLog.length
		let reply
		try {
			reply = await char.interfaces.chat.GetReply(getChatRequest({ chat_log: chatLog }))
		}
		catch (error) {
			context.exitStatus = 'failure'
			context.exitReason = error?.message || String(error)
			console.error(`::error::GetReply failed at agent step ${step}:`, error)
			return
		}

		appendReplyToChatLog(reply, chatLog)
		context.chatLog = chatLog

		logAgentStep({ step, chatLogLengthBefore, reply, chatLogLengthAfter: chatLog.length })

		if (context.exitStatus) return
	}
}
