import { loadCIModule } from './context.mjs'

/**
 * 写入退出状态、同步 chat log，并调用 fount-CI 的 finalizeAndExit（process.exit）。
 * @param {object} context fount-CI 共享 context
 * @param {object[] | undefined} chatLog 最终 chat_log；有值时写回 context.chatLog
 * @param {string} status 退出状态（success / failure / timeout / max-steps）
 * @param {string} reason 人类可读的退出原因
 * @returns {Promise<void>} 触发 finalizeAndExit 后不会返回
 */
export async function exitWithFinalize(context, chatLog, status, reason) {
	context.exitStatus = status
	context.exitReason = reason
	if (chatLog) context.chatLog = chatLog
	const { finalizeAndExit } = await loadCIModule()
	finalizeAndExit()
}
