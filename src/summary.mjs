import fs from 'node:fs'
import process from 'node:process'

import { context, mainStartTime } from './context.mjs'
import { formatStepLogsMarkdown } from './stepLog.mjs'
import { escapeHtml } from './utils.mjs'

/**
 *
 */
export function writeSummary() {
	if (!process.env.GITHUB_STEP_SUMMARY) return

	fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
		`## ${context.exitStatus === 'success' ? '✅' : '❌'} fount-CI: ${context.exitStatus || 'failure'}\n`,
		'| Field | Value |\n|-------|-------|\n',
		`| Status | ${context.exitStatus || 'failure'} |\n`,
		`| Reason | ${escapeHtml(context.exitReason || 'unknown')} |\n`,
		`| Steps (chat_log) | ${context.chatLog.length} |\n`,
		`| Duration | ${((performance.now() - mainStartTime) / 1000).toFixed(2)}s |\n`,
		`| Agent rounds | ${context.stepLogs.length} |\n\n`,
		formatStepLogsMarkdown(),
		context.chatLog.length
			? `### Chat log\n\n<pre><code>${escapeHtml(
				context.chatLog.map(entry => `${entry.name || entry.role}: ${(entry.content || '').slice(0, 500)}`).join('\n---\n')
			)}</code></pre>\n`
			: '',
	].join(''))
}

/**
 *
 */
export function writeOutputs() {
	if (!process.env.GITHUB_OUTPUT) return
	fs.appendFileSync(process.env.GITHUB_OUTPUT, [
		`status=${context.exitStatus || 'failure'}`,
		`reason=${(context.exitReason || '').replace(/\n/g, '%0A')}`,
		`steps-used=${context.chatLog.length}`,
	].join('\n') + '\n')
}
