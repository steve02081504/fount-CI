import url from 'node:url'

/**
 * 动态 import 本地 .mjs 模块（file URL）。
 * @param {string} file 模块绝对或相对路径
 * @returns {Promise<Record<string, unknown>>} 动态 import 的模块 namespace
 */
export function importModule(file) {
	return import(url.pathToFileURL(file))
}

/**
 * 转义 HTML 特殊字符，供 GitHub Step Summary 安全嵌入。
 * @param {unknown} text 原始文本
 * @returns {string} 转义后的 HTML 字符串
 */
export function escapeHtml(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}
