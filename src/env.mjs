import process from 'node:process'

/**
 * 组装注入 agent 首条 system 消息的 CI 运行环境摘要。
 * @returns {string} Markdown 列表，每行一项环境信息
 */
export function buildEnvDescription() {
	return [
		`- Repository: ${process.env.GITHUB_REPOSITORY || '(local)'}`,
		`- Ref: ${process.env.GITHUB_REF || '(local)'}`,
		`- Commit: ${process.env.GITHUB_SHA || '(local)'}`,
		`- Workspace: ${process.env.GITHUB_WORKSPACE || process.cwd()}`,
		`- Runner OS: ${process.env.RUNNER_OS || process.platform}`,
		`- Runner arch: ${process.env.RUNNER_ARCH || process.arch}`,
		`- Event: ${process.env.GITHUB_EVENT_NAME || '(local)'}`,
		`- Time: ${new Date().toISOString()}`,
	].join('\n')
}
