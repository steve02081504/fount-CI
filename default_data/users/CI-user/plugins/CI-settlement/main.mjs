import { CISettlementReplyHandler } from './handler.mjs'
import { getCISettlementPrompt } from './prompt.mjs'

const info = {
	'en-UK': {
		name: 'CI Settlement',
		avatar: '',
		description: 'fount-CI task exit status plugin',
		description_markdown: 'Allows the character to mark CI task completion and exit.',
		version: '0.0.0',
		author: 'steve02081504',
		home_page: '',
		tags: ['CI'],
	},
}

/** @type {import('../../../../../src/decl/pluginAPI.ts').PluginAPI_t} */
export default {
	info,
	/** fount PluginAPI 生命周期：part 加载钩子 */
	Load: async () => { },
	/** fount PluginAPI 生命周期：part 卸载钩子 */
	Unload: async () => { },
	interfaces: {
		chat: {
			GetPrompt: getCISettlementPrompt,
			ReplyHandler: CISettlementReplyHandler,
		},
	},
}
