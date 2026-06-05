import { loadCIModule } from './context.mjs'
import { exitWithFinalize } from './finalize.mjs'

const CIExitPattern = /<CI-exit\s+status="(?<status>success|failure)"(?:\s+reason="(?<reason>[\s\S]*)")?(?:\s*\/>|\s*>[^<]*<\/CI-exit>)/i

/**
 * @type {import('../../../../../src/decl/pluginAPI.ts').ReplyHandler_t}
 */
export async function CISettlementReplyHandler(reply, args) {
	const match = (reply.content ?? '').match(CIExitPattern)
	if (!match?.groups) return false

	const { context } = await loadCIModule()
	const status = match.groups.status
	const reason = match.groups.reason?.trim() || (status === 'success' ? 'Task completed' : 'Task failed')

	args.AddLongTimeLog?.({
		name: 'CI-settlement',
		role: 'tool',
		content: `CI exit: status=${status}, reason=${reason}`,
	})

	await exitWithFinalize(context, args.chat_log, status, reason)
	return false
}
