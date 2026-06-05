import path from 'node:path'
import process from 'node:process'

/**
 *
 */
export { context } from './src/context.mjs'
/**
 *
 */
export { finalizeAndExit } from './src/finalize.mjs'

import { context } from './src/context.mjs'
import { registerErrorHandlers } from './src/errors.mjs'
import { finalizeAndExit } from './src/finalize.mjs'
import { initFount, unloadChar } from './src/fount.mjs'
import { configureChar, runAgentLoop, setupContextFromEnv } from './src/runner.mjs'
import { importModule } from './src/utils.mjs'

process.on('warning', error => console.warn(error.stack))

/**
 *
 */
async function main() {
	registerErrorHandlers(error => {
		context.exitStatus = 'failure'
		context.exitReason = error?.message || String(error)
	})

	const { set_start } = await importModule(path.join(import.meta.dirname, './fount/src/server/base.mjs'))
	await set_start()

	await setupContextFromEnv()
	await initFount()
	await configureChar()
	await runAgentLoop()
	await unloadChar()

	finalizeAndExit()
}

main()
