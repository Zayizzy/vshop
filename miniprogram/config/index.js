// 小程序环境配置
// __wxConfig.envVersion 取值：develop（开发版）/ trial（体验版）/ release（正式版）
const env = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) || 'develop'

const configs = {
  develop: {
    // 微信开发者工具模拟器内使用 localhost（需勾选「不校验合法域名」）
    // 真机预览/调试时，请改为电脑当前局域网 IP，例如 http://192.168.240.1:3000/v1
    apiBase: 'http://localhost:3000/v1',
  },
  trial: {
    apiBase: 'https://test-api.yourdomain.com/v1',
  },
  release: {
    apiBase: 'https://api.yourdomain.com/v1',
  },
}

module.exports = configs[env] || configs.develop
