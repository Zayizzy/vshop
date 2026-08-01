// 小程序环境配置
// __wxConfig.envVersion 取值：develop（开发版）/ trial（体验版）/ release（正式版）
const env = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion) || 'develop'

const configs = {
  develop: {
    // 开发环境直连云端内网地址
    apiBase: 'https://jgboutyc.vshop.0ep1jdim.2czxvo7x.com/v1',
    apiPrefix: '/v1',
    // 开发环境也走 wx.cloud.callContainer（内网专线）
    useCloudContainer: true,
    cloudEnv: 'prod-d8gf4sglmae440765',
  },
  trial: {
    // 内网地址（callContainer 不可用时的 fallback）
    apiBase: 'https://jgboutyc.vshop.0ep1jdim.2czxvo7x.com/v1',
    apiPrefix: '/v1',
    // 体验版走 wx.cloud.callContainer（内网专线，免域名配置）
    useCloudContainer: true,
    // 云托管环境 ID（在云托管控制台首页顶部可以看到）
    cloudEnv: 'prod-d8gf4sglmae440765',
  },
  release: {
    apiBase: 'https://jgboutyc.vshop.0ep1jdim.2czxvo7x.com/v1',
    apiPrefix: '/v1',
    useCloudContainer: true,
    cloudEnv: 'prod-d8gf4sglmae440765',
  },
}

module.exports = configs[env] || configs.develop
