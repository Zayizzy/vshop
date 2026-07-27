// 小程序环境配置
// __wxConfig.envVersion 取值：develop（开发版）/ trial（体验版）/ release（正式版）
const env = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) || 'develop'

const configs = {
  develop: {
    // 微信开发者工具模拟器内使用 localhost（需勾选「不校验合法域名」）
    // 真机预览/调试时，请改为电脑当前局域网 IP，例如 http://192.168.240.1:3000/v1
    apiBase: 'http://localhost:3000/v1',
    apiPrefix: '/v1',
    // 开发环境走 wx.request（本地后端）
    useCloudContainer: false,
    cloudEnv: '',
  },
  trial: {
    // 公网地址（callContainer 不可用时的 fallback）
    apiBase: 'https://vshop-279953-8-1452085588.sh.run.tcloudbase.com/v1',
    apiPrefix: '/v1',
    // 体验版走 wx.cloud.callContainer（内网专线，免域名配置）
    useCloudContainer: true,
    // 云托管环境 ID（在云托管控制台首页顶部可以看到）
    cloudEnv: '1452085588',
  },
  release: {
    apiBase: 'https://vshop-279953-8-1452085588.sh.run.tcloudbase.com/v1',
    apiPrefix: '/v1',
    useCloudContainer: true,
    cloudEnv: '1452085588',
  },
}

module.exports = configs[env] || configs.develop
