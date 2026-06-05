import process from 'node:process'

/**
 * 注册全局未捕获异常处理器，将致命错误交给调用方写入 context 并走正常退出流程。
 * @param {(error: unknown) => void} onFatal 收到 rejection 或 exception 时调用
 */
export function registerErrorHandlers(onFatal) {
	process.on('unhandledRejection', error => {
		console.error('Unhandled rejection:', error)
		onFatal(error)
	})
	process.on('uncaughtException', error => {
		console.error('Uncaught exception:', error)
		onFatal(error)
	})
}
