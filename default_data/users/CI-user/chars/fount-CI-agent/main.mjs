/**
 * @typedef {import('../../../../../src/decl/charAPI.ts').CharAPI_t} CharAPI_t
 */
import { buildPromptStruct } from '../../../../../src/public/parts/shells/chat/src/prompt_struct.mjs'
import { loadPart, loadAnyPreferredDefaultPart } from '../../../../../src/server/parts_loader.mjs'

const info = {
	'en-UK': {
		name: 'fount-CI Agent',
		avatar: '',
		description: 'Built-in engineering assistant for fount-CI',
		description_markdown: 'CI engineering assistant with code execution and file operations in GitHub Actions.',
		version: '0.0.0',
		author: 'steve02081504',
		home_page: '',
		tags: ['CI'],
	},
}

const greeting = ['Ready. Awaiting task instructions.']
const groupGreeting = ['fount-CI Agent joined.']
const noAISourceFeedback = 'No AI source configured. Check OPENAI_BASE_URL, OPENAI_API_KEY, and OPENAI_MODEL secrets.'

/** @type {import('../../../../../src/decl/AIsource.ts').AIsource_t} */
let AIsource = null
/** @type {Record<string, import('../../../../../src/decl/pluginAPI.ts').PluginAPI_t>} */
let plugins = {}
let username = ''

/** @type {CharAPI_t} */
export default {
	info,
	/** fount CharAPI 生命周期：安装后初始化钩子（CI 角色无额外状态） */
	Init: () => { },
	/** fount CharAPI 生命周期：卸载前清理钩子 */
	Uninstall: () => { },
	/**
	 * 记录所属 fount 用户名，供后续 loadPart 使用。
	 * @param {{ username: string }} stat part 加载统计信息
	 */
	Load: stat => { username = stat.username },
	/** fount CharAPI 生命周期：part 卸载钩子 */
	Unload: () => { },
	interfaces: {
		config: {
			/**
			 * 返回当前绑定的 AI 源与插件列表（供 config UI 或调试）。
			 * @returns {{ AIsource: string, plugins: string[] }} 当前绑定摘要
			 */
			GetData: () => ({
				AIsource: AIsource?.filename || '',
				plugins: Object.keys(plugins),
			}),
			/**
			 * 按 SetData 加载 AI 源与插件 part。
			 * @param {{ AIsource?: string, plugins?: string[] }} data char-config.json 解析结果
			 * @returns {Promise<void>} 加载完成后返回
			 */
			SetData: async data => {
				AIsource = data.AIsource
					? await loadPart(username, 'serviceSources/AI/' + data.AIsource)
					: await loadAnyPreferredDefaultPart(username, 'serviceSources/AI')
				if (data.plugins)
					plugins = Object.fromEntries(await Promise.all(data.plugins.map(async name => [name, await loadPart(username, 'plugins/' + name)])))
			},
		},
		chat: {
			/**
			 * 单聊开场白。
			 * @param {object} request chat 请求（未使用 locale）
			 * @param {number} index 开场白变体下标
			 * @returns {{ content: string }} 开场白文本
			 */
			GetGreeting: (request, index) => ({ content: greeting[index] ?? greeting[0] }),
			/**
			 * 群聊开场白。
			 * @param {object} request chat 请求（未使用 locale）
			 * @param {number} index 开场白变体下标
			 * @returns {{ content: string }} 群聊开场白文本
			 */
			GetGroupGreeting: (request, index) => ({ content: groupGreeting[index] ?? groupGreeting[0] }),
			/**
			 * 角色主 system prompt：说明 CI 工程助手职责与 `<CI-exit>` 退出约定。
			 * @returns {Promise<import('../../../../../src/decl/prompt_struct.ts').single_part_prompt_t>} CI 工程助手 system prompt
			 */
			GetPrompt: async () => ({
				text: [{
					content: `\
你是 fount-CI 内置工程助手，在 GitHub Actions 环境中完成用户指定的任务。
优先做出实际改动并验证结果，再输出 <CI-exit> 标记退出。
`,
					important: 0,
				}],
				additional_chat_log: [],
				extension: {},
			}),
			/**
			 * 其他角色视角下的简短角色描述。
			 * @returns {import('../../../../../src/decl/prompt_struct.ts').single_part_prompt_t} 第三方视角角色简介
			 */
			GetPromptForOther: () => ({
				text: [{
					content: 'fount-CI 内置工程助手，负责在 CI 环境中完成工程任务。',
					important: 0,
				}],
				additional_chat_log: [],
				extension: {},
			}),
			/**
			 * 组装 prompt、调用 AI 源 StructCall，并运行插件 ReplyHandler 链（含 regen 循环）。
			 * @param {import('../../../../../src/decl/pluginAPI.ts').chatReplyRequest_t} args fount chat 请求
			 * @returns {Promise<import('../../../../../src/public/parts/shells/chat/decl/chatLog.ts').chatReply_t>} 含 content 与 logContext 的回复
			 */
			GetReply: async args => {
				if (!AIsource)
					return { content: noAISourceFeedback }

				args.plugins = Object.assign({}, plugins, args.plugins)
				const promptStruct = await buildPromptStruct(args)
				/** @type {import('../../../../../src/public/parts/shells/chat/decl/chatLog.ts').chatReply_t} */
				const result = {
					content: '',
					logContextBefore: [],
					logContextAfter: [],
					files: [],
					extension: {},
				}

				/**
				 * 将工具/中间步骤写入 logContextBefore 与 prompt 附加 chat log。
				 * @param {import('../../../../../src/public/parts/shells/chat/decl/chatLog.ts').chatLogEntry_t} entry 工具或中间步骤日志
				 */
				function AddLongTimeLog(entry) {
					entry.charVisibility = [args.char_id]
					result.logContextBefore.push(entry)
					promptStruct.char_prompt.additional_chat_log.push(entry)
				}

				args.generation_options ??= {}
				const baseReplyPreviewUpdater = args.generation_options.replyPreviewUpdater
				/**
				 * 插件链式包装的流式预览更新器。
				 * @param {import('../../../../../src/decl/pluginAPI.ts').chatReplyRequest_t} request 当前 chat 请求
				 * @param {import('../../../../../src/public/parts/shells/chat/decl/chatLog.ts').chatReply_t} reply 当前生成中的回复
				 * @returns {unknown} 链式 preview 更新结果
				 */
				let replyPreviewUpdater = (request, reply) => baseReplyPreviewUpdater?.(reply)
				for (const getUpdater of Object.values(args.plugins).map(plugin => plugin.interfaces?.chat?.GetReplyPreviewUpdater).filter(Boolean))
					replyPreviewUpdater = getUpdater(replyPreviewUpdater)

				/**
				 * 传给 AI 源的 preview 回调。
				 * @param {import('../../../../../src/public/parts/shells/chat/decl/chatLog.ts').chatReply_t} reply 流式生成片段
				 * @returns {unknown} preview 更新结果
				 */
				args.generation_options.replyPreviewUpdater = reply => replyPreviewUpdater(args, reply)

				regen: while (true) {
					args.generation_options.base_result = result
					await AIsource.StructCall(promptStruct, args.generation_options)
					let shouldRegen = false
					for (const replyHandler of Object.values(args.plugins).map(plugin => plugin.interfaces?.chat?.ReplyHandler).filter(Boolean))
						if (await replyHandler(result, { ...args, prompt_struct: promptStruct, AddLongTimeLog }))
							shouldRegen = true
					if (shouldRegen) continue regen
					break
				}
				return result
			},
		},
	},
}
