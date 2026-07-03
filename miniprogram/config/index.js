// 小程序环境配置
// __wxConfig.envVersion 取值：develop（开发版）/ trial（体验版）/ release（正式版）
const env = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) || 'develop'

const configs = {
  develop: {
    apiBase: 'http://172.22.10.95:3000/v1',
  },
  trial: {
    apiBase: 'https://test-api.yourdomain.com/v1',
  },
  release: {
    apiBase: 'https://api.yourdomain.com/v1',
  },
}

module.exports = configs[env] || configs.develop
