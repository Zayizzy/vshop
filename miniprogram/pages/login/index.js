const app = getApp()
const { handleError } = require('../../utils/error')

// Tab 页面路径列表（跳转时需用 switchTab）
const TAB_PAGES = [
  'pages/home/index',
  'pages/category/index',
  'pages/cart/index',
  'pages/order/list',
  'pages/mine/index'
]

Page({
  data: {
    redirect: '/pages/home/index',
    loading: false
  },

  onLoad(options) {
    if (options.redirect) {
      this.setData({ redirect: decodeURIComponent(options.redirect) })
    }

    // 已有 token 时直接跳过
    if (wx.getStorageSync('token')) {
      this.navigateAfterLogin()
    }
  },

  onLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })
    console.log('[login] 开始登录流程')

    // wx.getUserProfile 必须在用户点击事件中直接调用，不能在异步回调里调
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        console.log('[login] 获取微信资料成功:', profileRes.userInfo?.nickName)
        this.doLogin(profileRes.userInfo)
      },
      fail: (err) => {
        console.warn('[login] 获取微信资料失败:', err)
        // 用户拒绝授权也继续登录，不传资料即可
        this.doLogin(null)
      }
    })
  },

  /**
   * 微信登录 + 服务端鉴权。
   * profile 可为 null（用户拒绝授权时）。
   */
  doLogin(profile) {
    wx.login({
      success: (loginRes) => {
        console.log('[login] wx.login 成功，code=', loginRes.code?.slice(0, 8) + '...')
        const payload = { code: loginRes.code }
        if (profile) {
          payload.nickName = profile.nickName
          payload.avatarUrl = profile.avatarUrl
        }
        app.syncLogin(payload)
          .then((data) => {
            console.log('[login] 服务端登录成功，userId=', data?.userInfo?.id)
            this.navigateAfterLogin()
          })
          .catch((err) => {
            this.setData({ loading: false })
            console.error('[login] 服务端登录失败:', err)
            handleError(err, { defaultMsg: '登录失败，请检查网络或后端服务' })
          })
      },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('[login] wx.login 失败:', err)
        handleError(err, { defaultMsg: '微信登录失败' })
      }
    })
  },

  navigateAfterLogin() {
    const redirect = this.data.redirect
    const pagePath = redirect.replace(/^\//, '').split('?')[0]

    if (TAB_PAGES.includes(pagePath)) {
      wx.switchTab({ url: redirect })
    } else {
      wx.redirectTo({ url: redirect })
    }
  }
})
