const config = require('./config/index')
const { NAV_HEIGHT_OFFSET } = require('./constants/index')

App({
  globalData: {
    userInfo: null,
    token: null,
    channelSource: '',
    channelKocId: null,
    channelCardBatch: null,
    // 后端地址按环境读取，开发版默认使用本机局域网 IP
    apiBase: config.apiBase,
    navInfo: null  // 导航栏尺寸 { statusBarHeight, navHeight }，onLaunch 预算缓存
  },

  // 防止并发登录请求
  _loginPromise: null,

  onLaunch(options) {
    // 预算导航栏尺寸并缓存，供 utils/nav.getNavInfo 与 nav-bar 组件复用
    let statusBarHeight = 20
    try {
      if (wx.getWindowInfo) {
        statusBarHeight = wx.getWindowInfo().statusBarHeight || 20
      } else {
        statusBarHeight = wx.getSystemInfoSync().statusBarHeight || 20
      }
    } catch (e) {
      statusBarHeight = 20
    }
    this.globalData.navInfo = { statusBarHeight, navHeight: statusBarHeight + NAV_HEIGHT_OFFSET }

    // 生产环境初始化云托管 SDK（用于 callContainer 内网调用）
    if (config.useCloudContainer && wx.cloud) {
      wx.cloud.init({ env: config.cloudEnv })
    }

    this.trackChannel(options.query)
    this.checkLogin(options)
  },

  onShow(options) {
    this.trackChannel(options.query)
  },

  trackChannel(query = {}) {
    if (query.kocId) {
      this.globalData.channelSource = 'koc'
      this.globalData.channelKocId = query.kocId
    } else if (query.source === 'card') {
      this.globalData.channelSource = 'card'
      this.globalData.channelCardBatch = query.batchId
    }
    this.reportChannel()
  },

  reportChannel() {
    if (!this.globalData.channelSource) return
    // 走统一请求方法（自动选择 callContainer 或 wx.request）
    this.request({
      url: '/channel/report',
      method: 'POST',
      data: {
        source: this.globalData.channelSource,
        kocId: this.globalData.channelKocId,
        batchId: this.globalData.channelCardBatch
      }
    }).catch(() => {}) // 渠道上报失败不阻断流程
  },

  /**
   * 启动时强制登录检查。
   * - 无 token：重定向到登录页。
   * - 有 token：刷新用户信息；若 token 已失效则清理并去登录。
   */
  checkLogin(options = {}) {
    const token = wx.getStorageSync('token')
    const redirect = this.buildRedirectUrl(options)

    if (!token) {
      this.goLogin(redirect)
      return
    }

    this.globalData.token = token
    this.refreshUserInfo().catch(() => {
      this.clearToken()
      this.goLogin(redirect)
    })
  },

  buildRedirectUrl(options = {}) {
    const path = options.path || 'pages/home/index'
    const query = options.query || {}
    const pairs = Object.keys(query).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    const queryStr = pairs.length ? '?' + pairs.join('&') : ''
    return `/${path}${queryStr}`
  },

  refreshUserInfo() {
    return this.request({ url: '/user/info', method: 'GET' }).then(data => {
      this.globalData.userInfo = data
      wx.setStorageSync('userInfo', data)
      return data
    })
  },

  /**
   * 统一请求封装。
   * - 自动携带 Authorization: Bearer <token>
   * - 生产环境走 wx.cloud.callContainer（内网专线，免域名配置）
   * - 开发环境走 wx.request + apiBase
   * - 401 时清理 token 并跳转登录页（同步头像需用户手势，不再静默重试）
   */
  request(options) {
    return new Promise((resolve, reject) => {
      const header = { 'Content-Type': 'application/json' }
      if (this.globalData.token) {
        header['Authorization'] = `Bearer ${this.globalData.token}`
      }

      // url 以 http 开头视为完整地址，直接走 wx.request（如第三方接口）
      const isFullUrl = /^https?:\/\//.test(options.url)
      const skipPrefix = options.skipPrefix === true

      // 开发环境或完整 URL：走 wx.request
      if (!config.useCloudContainer || isFullUrl) {
        const fullUrl = isFullUrl
          ? options.url
          : skipPrefix
            ? `${this.globalData.apiBase.replace(/\/v1\/?$/, '')}${options.url}`
            : `${this.globalData.apiBase}${options.url}`
        wx.request({
          url: fullUrl,
          method: options.method || 'GET',
          data: options.data,
          header,
          timeout: options.timeout || 10000,
          success: (res) => {
            if (res.data && res.data.code === 0) {
              resolve(res.data.data)
            } else if (res.data && res.data.code === 401) {
              if (options._isAuthRequest) { reject(res.data); return }
              this.clearToken()
              this.goLogin()
              reject(res.data)
            } else {
              reject(res.data)
            }
          },
          fail: reject
        })
        return
      }

      // 生产环境：走 wx.cloud.callContainer（内网专线）
      wx.cloud.callContainer({
        config: { env: config.cloudEnv },
        path: skipPrefix ? options.url : `${config.apiPrefix}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header: { ...header, 'X-WX-SERVICE': 'vshop' },
        success: (res) => {
          if (res.data && res.data.code === 0) {
            resolve(res.data.data)
          } else if (res.data && res.data.code === 401) {
            if (options._isAuthRequest) { reject(res.data); return }
            this.clearToken()
            this.goLogin()
            reject(res.data)
          } else {
            reject(res.data)
          }
        },
        fail: reject
      })
    })
  },

  /**
   * 小程序微信授权登录。
   * 由登录页调用，传入 wx.login + wx.getUserProfile 的结果。
   */
  syncLogin(payload) {
    // 并发调用时复用同一个 Promise，避免重复登录
    if (this._loginPromise) return this._loginPromise
    this._loginPromise = new Promise((resolve, reject) => {
      this.request({
        url: '/auth/wechat-login',
        method: 'POST',
        data: payload,
        timeout: 30000,        // 登录接口放宽超时
        _isAuthRequest: true  // 标记：自身 401 不触发跳转
      }).then((data) => {
        this.globalData.token = data.token
        this.globalData.userInfo = data.userInfo
        wx.setStorageSync('token', data.token)
        wx.setStorageSync('userInfo', data.userInfo)
        this._loginPromise = null
        resolve(data)
      }).catch((err) => {
        this._loginPromise = null
        reject(err)
      })
    })
    return this._loginPromise
  },

  /**
   * 跳转登录页。
   * 若当前页已是登录页则忽略，避免循环跳转。
   */
  goLogin(redirect = '/pages/home/index') {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    if (current && current.route === 'pages/login/index') return

    const encoded = encodeURIComponent(redirect)
    wx.redirectTo({ url: `/pages/login/index?redirect=${encoded}` })
  },

  clearToken() {
    this.globalData.token = null
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
  }
})
