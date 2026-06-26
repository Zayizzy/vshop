/**
 * 图片 URL 补全工具。
 *
 * 后端返回的图片地址为相对路径（如 /admin/uploads/goods/x.png、
 * /assets/images/apple.png），小程序 <image src> 无法直接加载相对路径，
 * 需补全为完整 URL（http://<host><path>）。
 *
 * host 取自 app.globalData.apiBase（形如 http://172.22.10.95:3000/v1），
 * 去掉末尾的 /v1 即得图片服务根。
 *
 * - 已是 http(s):// 开头：原样返回（外部图床）
 * - data: / blob: 等协议：原样返回
 * - 空值：返回空串
 * - 其余（/开头或不以协议开头）：补全 host
 */
function hostBase() {
  const app = getApp()
  const base = (app && app.globalData && app.globalData.apiBase) || ''
  // 去掉末尾的 /v1（或 / 前缀的 api 版本段）
  return base.replace(/\/v\d+\/?$/, '').replace(/\/$/, '')
}

function full(url) {
  if (!url) return ''
  if (/^(https?:)?\/\//i.test(url)) return url
  if (/^(data:|blob:|wxfile:|wechatfile:)/i.test(url)) return url
  const base = hostBase()
  if (!base) return url
  const path = url.startsWith('/') ? url : '/' + url
  return base + path
}

module.exports = { full }
