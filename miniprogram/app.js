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

  // 防止 401 自动重登与登录请求互相递归
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

    this.trackChannel(options.query)
    this.checkLogin()
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
    wx.request({
      url: `${this.globalData.apiBase}/channel/report`,
      method: 'POST',
      data: {
        source: this.globalData.channelSource,
        kocId: this.globalData.channelKocId,
        batchId: this.globalData.channelCardBatch
      }
    })
  },

  checkLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
    }
  },

  /**
   * 统一请求封装。
   * - 自动携带 Authorization: Bearer <token>
   * - 401 自动重登一次后重试（登录接口本身不重试，避免递归死循环）
   */
  request(options) {
    return new Promise((resolve, reject) => {
      const header = { 'Content-Type': 'application/json' }
      if (this.globalData.token) {
        header['Authorization'] = `Bearer ${this.globalData.token}`
      }
      // url 以 http 开头视为完整地址直接用（如 /api/admin 等无 v1 前缀的接口），
      // 否则拼接 apiBase
      const fullUrl = /^https?:\/\//.test(options.url)
        ? options.url
        : `${this.globalData.apiBase}${options.url}`
      wx.request({
        url: fullUrl,
        method: options.method || 'GET',
        data: options.data,
        header,
        timeout: 10000,
        success: (res) => {
          if (res.data && res.data.code === 0) {
            resolve(res.data.data)
          } else if (res.data && res.data.code === 401) {
            // 登录接口自身的 401 不再重试，直接失败
            if (options._isAuthRequest) {
              reject(res.data)
              return
            }
            // 已带过重试标记仍 401，说明重登后依旧失败，停止递归
            if (options._retried) {
              this.clearToken()
              reject(res.data)
              return
            }
            this.login().then(() => {
              this.request({ ...options, _retried: true }).then(resolve).catch(reject)
            }).catch(reject)
          } else {
            reject(res.data)
          }
        },
        fail: reject
      })
    })
  },

  login() {
    // 并发调用 login 时复用同一个 Promise，避免重复登录
    if (this._loginPromise) return this._loginPromise
    this._loginPromise = new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          this.request({
            url: '/auth/wechat-login',
            method: 'POST',
            data: { code: res.code },
            _isAuthRequest: true  // 标记：自身 401 不触发重登
          }).then((data) => {
            this.globalData.token = data.token
            this.globalData.userInfo = data.userInfo
            wx.setStorageSync('token', data.token)
            this._loginPromise = null
            resolve(data)
          }).catch((err) => {
            this._loginPromise = null
            reject(err)
          })
        },
        fail: (err) => {
          this._loginPromise = null
          reject(err)
        }
      })
    })
    return this._loginPromise
  },

  clearToken() {
    this.globalData.token = null
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
  }
})
