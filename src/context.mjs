import process from 'node:process'

/** 当前 CI 角色目录名，来自 `CI_charname` 环境变量 */
export const charname = process.env.CI_charname || 'fount-CI-agent'
/** fount 虚拟用户名，来自 `CI_username` 环境变量 */
export const username = process.env.CI_username || 'CI-user'
/** 进程启动时刻（performance.now），用于 Step Summary 总耗时 */
export const mainStartTime = performance.now()

/** fount-CI 全局共享状态，供 index.mjs 与 CI-settlement 插件使用 */
export const context = {
	maxSteps: null,
	maxTimeSeconds: null,
	exitStatus: null,
	exitReason: null,
	task: '',
	aisourceName: 'fount-CI',
	startTime: 0,
	chatLog: [],
	stepLogs: [],
}
