import path from 'node:path'
import process from 'node:process'

import { charname, username } from './context.mjs'
import { importModule } from './utils.mjs'

/** @type {import('../../fount/src/decl/charAPI.ts').CharAPI_t} */
export let char

/**
 * 启动 headless fount 服务（关闭 Web/IPC/Tray 等子系统）。
 * @returns {Promise<void>} 服务就绪后返回
 */
export async function initFount() {
	console.log('⛲ Initializing fount server...')
	const fountServer = await importModule(path.join(import.meta.dirname, '../fount/src/server/server.mjs'))
	if (!await fountServer.init({
		data_path: path.resolve(import.meta.dirname, '../fount/.vm_data_fountCI'),
		starts: {
			Web: false,
			IPC: false,
			Tray: false,
			DiscordRPC: false,
			Base: { AutoUpdate: false },
		},
	})) {
		console.error('💀 Fount server failed to start')
		process.exit(1)
	}
	console.log('✅ Fount server started')
}

/**
 * 加载当前 CI 角色并写入模块级 `char` 引用。
 * @returns {Promise<void>} char 赋值完成后返回
 */
export async function loadChar() {
	const { loadPart } = await importModule(path.join(import.meta.dirname, '../fount/src/server/parts_loader.mjs'))
	console.log(`🚗 Loading char: ${charname}`)
	char = await loadPart(username, 'chars/' + charname)
}

/**
 * 卸载 CI 角色并释放 `char` 引用。
 * @returns {Promise<void>} char 置 null 后返回
 */
export async function unloadChar() {
	const { unloadPart } = await importModule(path.join(import.meta.dirname, '../fount/src/server/parts_loader.mjs'))
	console.log(`👋 Unloading char: ${charname}`)
	await unloadPart(username, 'chars/' + charname, 'fount-CI complete')
	char = null
}

/**
 * 构造 fount chat GetReply 请求对象；`diff` 字段会覆盖默认值（如传入 `chat_log`）。
 * @param {object} [diff] 覆盖默认请求字段
 * @returns {import('../../fount/src/public/parts/shells/chat/decl/chatLog.ts').chatReplyRequest_t} 可传入 GetReply 的请求对象
 */
export function getChatRequest(diff = {}) {
	const request = {
		supported_functions: {
			markdown: true, mathjax: true, html: true, unsafe_html: true, files: true, add_message: true,
		},
		chat_name: 'fount-CI',
		chat_id: 0,
		char_id: charname,
		username,
		UserCharname: username,
		Charname: Object.values(char.info)[0]?.name || charname,
		locales: ['en-UK'],
		chat_log: [],
		/** @returns {typeof request} 返回自身，供 fount 增量更新同一请求对象 */
		Update: async () => request,
		/**
		 * 向请求内 chat_log 追加一条消息。
		 * @param {import('../../fount/src/public/parts/shells/chat/decl/chatLog.ts').chatLogEntry_t} entry 待追加的 chat log 条目
		 */
		AddChatLogEntry: async entry => {
			request.chat_log.push({ name: entry.role, content: '', files: [], ...entry })
		},
		world: null,
		char,
		user: null,
		other_chars: {},
		chat_scoped_char_memory: {},
		plugins: {},
		extension: {},
		...diff,
	}
	return request
}
