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

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject })
  })
}

function wxGetUserProfile(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject({ errMsg: 'getUserProfile:timeout' })
    }, timeout)
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        clearTimeout(timer)
        resolve(res)
      },
      fail: (err) => {
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

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

    // wx.login 与 wx.getUserProfile 同时发起，避免嵌套回调导致授权手势上下文丢失
    Promise.all([
      wxLogin().catch(err => ({ _error: err })),
      wxGetUserProfile().catch(err => ({ _error: err }))
    ]).then(([loginRes, profileRes]) => {
      if (loginRes && loginRes._error) {
        this.setData({ loading: false })
        handleError(loginRes._error, { defaultMsg: '微信登录失败' })
        return
      }

      const payload = {
        code: loginRes.code
      }

      if (profileRes && !profileRes._error && profileRes.userInfo) {
        payload.nickName = profileRes.userInfo.nickName
        payload.avatarUrl = profileRes.userInfo.avatarUrl
        payload.rawData = profileRes.rawData
        payload.signature = profileRes.signature
        payload.encryptedData = profileRes.encryptedData
        payload.iv = profileRes.iv
      } else {
        console.warn('[login] 未获取到微信资料，使用默认信息登录:', profileRes && profileRes._error)
      }

      app.syncLogin(payload)
        .then(() => {
          this.navigateAfterLogin()
        })
        .catch((err) => {
          this.setData({ loading: false })
          handleError(err, { defaultMsg: '登录失败，请重试' })
        })
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
