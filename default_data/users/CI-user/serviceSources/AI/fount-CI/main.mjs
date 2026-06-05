import path from 'node:path'

import { setPartData } from '../../../../../../src/public/parts/shells/config/src/manager.mjs'
import { loadJsonFileIfExists, saveJsonFile } from '../../../../../../src/scripts/json_loader.mjs'
import { loadPart } from '../../../../../../src/server/parts_loader.mjs'

const configPath = import.meta.dirname + '/config.json'
const data = loadJsonFileIfExists(configPath, { generator: '', config: {} })

let username = ''
const filename = path.basename(import.meta.dirname)

/** @type {import('../../../../../../src/decl/AIsource.ts').AIsource_interfaces_and_AIsource_t} */
const self = {
	filename,
	/**
	 * 从 config.json 委托 serviceSourceType 加载生成器实现（OpenAI 兼容等）。
	 * @param {{ username: string }} initialData part 加载上下文
	 * @returns {Promise<void>} 生成器挂载完成后返回
	 */
	async Load(initialData) {
		username = initialData.username
		const manager = await loadPart(username, 'serviceSources/AI')
		Object.assign(this, await manager.interfaces.serviceSourceType.loadFromConfigData(username, data, {
			/** @returns {void} 配置变更时写回 vm_data */
			SaveConfig: () => setPartData(username, `serviceSources/AI/${filename}`, data)
		}))
		Object.assign(this.interfaces, defaultInterfaces)
	},
}
const defaultInterfaces = self.interfaces = {
	config: {
		/**
		 * 返回当前 AI 源配置（generator + config 字段）。
		 * @returns {typeof data} 当前持久化配置
		 */
		async GetData() {
			return data
		},
		/**
		 * 合并新配置、重新 Load 并持久化到 config.json。
		 * @param {typeof data} new_data 新配置对象
		 * @returns {Promise<void>} 写入 config.json 后返回
		 */
		async SetData(new_data) {
			if (new_data !== data) {
				if (new_data.generator) data.generator = new_data.generator
				if (new_data.config) {
					for (const key in data.config ??= {}) delete data.config[key]
					Object.assign(data.config, new_data.config)
				}
				await self.Load({ username })
			}
			saveJsonFile(configPath, data)
		}
	}
}

/** fount OpenAI 兼容 AI 源 part（config 由 Action 注入 OPENAI_* secret） */
export default self
