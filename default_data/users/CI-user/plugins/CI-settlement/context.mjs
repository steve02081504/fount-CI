import path from 'node:path'
import process from 'node:process'
import url from 'node:url'

let CIModule

/**
 * 懒加载 fount-CI 入口模块（与 index.mjs 共享 context / finalizeAndExit）。
 * @returns {Promise<{ context: object, finalizeAndExit: () => void }>} index.mjs 导出的共享模块
 */
export function loadCIModule() {
	return CIModule ??= import(url.pathToFileURL(path.resolve(process.env.GITHUB_ACTION_PATH, 'index.mjs')))
}
