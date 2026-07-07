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

    wx.login({
      success: (loginRes) => {
        console.log('[login] wx.login 成功，code=', loginRes.code?.slice(0, 8) + '...')
        // 先用 code 完成账号登录，保证授权/网络异常时也能进入小程序
        app.syncLogin({ code: loginRes.code })
          .then((data) => {
            console.log('[login] 服务端登录成功，userId=', data?.userInfo?.id)
            // 再尝试同步微信昵称头像（失败不影响主流程）
            this.syncProfileAfterLogin()
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

  /**
   * 登录成功后尝试同步微信资料。
   * wx.getUserProfile 在部分基础库/模拟器下可能超时，失败仅记录日志。
   */
  syncProfileAfterLogin() {
    if (!wx.getUserProfile) {
      console.warn('[login] 当前基础库不支持 wx.getUserProfile')
      return
    }
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        console.log('[login] 获取微信资料成功:', profileRes.userInfo?.nickName)
        const { nickName, avatarUrl } = profileRes.userInfo || {}
        app.request({
          url: '/user/profile',
          method: 'PUT',
          data: { nickname: nickName, avatar: avatarUrl },
          timeout: 10000
        }).then(() => {
          // 刷新本地缓存
          app.refreshUserInfo().catch(() => {})
        }).catch((err) => {
          console.warn('[login] 同步资料到后端失败:', err)
        })
      },
      fail: (err) => {
        console.warn('[login] 获取微信资料失败:', err)
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
