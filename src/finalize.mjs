import process from 'node:process'

import { context } from './context.mjs'
import { writeOutputs, writeSummary } from './summary.mjs'

/**
 *
 */
export function finalizeAndExit() {
	writeSummary()
	writeOutputs()

	const success = context.exitStatus === 'success'
	if (success)
		console.log(`🎉 fount-CI succeeded: ${context.exitReason}`)
	else
		console.log(`😭 fount-CI failed (${context.exitStatus}): ${context.exitReason}`)


	process.exit(success ? 0 : 1)
}
