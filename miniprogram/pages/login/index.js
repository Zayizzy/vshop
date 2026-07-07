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

    wx.login({
      success: (loginRes) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (profileRes) => {
            const payload = {
              code: loginRes.code,
              nickName: profileRes.userInfo.nickName,
              avatarUrl: profileRes.userInfo.avatarUrl,
              rawData: profileRes.rawData,
              signature: profileRes.signature,
              encryptedData: profileRes.encryptedData,
              iv: profileRes.iv
            }
            app.syncLogin(payload)
              .then(() => {
                this.navigateAfterLogin()
              })
              .catch((err) => {
                this.setData({ loading: false })
                handleError(err, { defaultMsg: '登录失败，请重试' })
              })
          },
          fail: (err) => {
            this.setData({ loading: false })
            wx.showToast({ title: '需要授权才能继续使用', icon: 'none' })
            console.warn('[login] getUserProfile 取消或失败:', err)
          }
        })
      },
      fail: (err) => {
        this.setData({ loading: false })
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
