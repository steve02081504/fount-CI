import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * 解析 char SetData 配置文件路径：优先消费仓库工作区，否则回退到 Action 包内路径。
 * @param {string} configPath 相对路径（如 `default_data/char-config.json`）
 * @returns {string} 可用于 `readFileSync` 的绝对路径
 */
export function resolveCharConfigPath(configPath) {
	const actionPath = process.env.GITHUB_ACTION_PATH || path.join(import.meta.dirname, '..')
	const workspace = process.env.GITHUB_WORKSPACE || process.cwd()
	const workspacePath = path.resolve(workspace, configPath)
	if (fs.existsSync(workspacePath)) return workspacePath
	return path.resolve(actionPath, configPath)
}

/**
 * 读取 JSON 模板并替换 `${key}` 占位符后解析。
 * @param {string} filePath 配置文件绝对路径
 * @param {Record<string, string>} vars 占位符名到替换值的映射
 * @returns {object} 解析后的 SetData 对象
 */
export function loadCharConfig(filePath, vars) {
	const raw = fs.readFileSync(filePath, 'utf-8')
	return JSON.parse(raw.replace(/\$\{(\w+)\}/g, (match, key) => vars[key]))
}
