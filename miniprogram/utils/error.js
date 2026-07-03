/**
 * 统一错误处理。
 * @param {any} error - 错误对象或后端响应
 * @param {Object} options
 * @param {string} [options.defaultMsg='操作失败'] - 默认提示文案
 * @param {boolean} [options.silent=false] - 为 true 时不弹 toast（仅记录）
 * @param {*} [options.fallback] - 静默时返回的默认值
 */
export function handleError(error, options = {}) {
  const { defaultMsg = '操作失败', silent = false, fallback } = options
  const message = error?.message || error?.data?.message || defaultMsg
  if (!silent) {
    wx.showToast({ title: message, icon: 'none', duration: 2000 })
  }
  return fallback
}
