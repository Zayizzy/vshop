const app = getApp()
const api = require('../../api/index')
const { getNavInfo } = require('../../utils/nav')
const { handleError } = require('../../utils/error')

Page({
  data: {
    statusBarHeight: 44,
    userInfo: {},
    orderStats: {
      pending: 0,
      shipping: 0,
      receiving: 0
    },
    couponCount: 0,
    kocInfo: {
      isKoc: false,
      level: '',
      totalEarnings: '0.00',
      weeklyViews: 0,
      weeklyOrders: 0,
      weeklyCommission: '0.00'
    }
  },

  onLoad() {
    const nav = getNavInfo()
    this.setData({ statusBarHeight: nav.statusBarHeight })
  },

  onShow() {
    this.loadUserInfo()
    this.loadOrderStats()
    this.loadCouponCount()
    this.loadKocInfo()
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {}
    // 开发阶段默认用户信息
    if (!userInfo.nickName) {
      userInfo.nickName = '鲜到家用户'
      userInfo.location = '厦门市'
    }
    this.setData({ userInfo })
  },

  loadOrderStats() {
    api.order.getStats().then(data => {
      this.setData({
        orderStats: {
          pending: data.pending || 0,
          shipping: data.shipping || 0,
          receiving: data.receiving || 0
        }
      })
    }).catch((err) => {
      handleError(err, { silent: true })
      this.setData({ orderStats: { pending: 0, shipping: 0, receiving: 0 } })
    })
  },

  loadCouponCount() {
    api.coupon.count().then(data => {
      this.setData({ couponCount: data.count || 0 })
    }).catch((err) => {
      handleError(err, { silent: true })
      this.setData({ couponCount: 0 })
    })
  },

  loadKocInfo() {
    // /koc/status 提供 isKoc/level/commissionRate；/koc/dashboard 提供累计收益与订单数
    api.koc.getStatus().then(status => {
      const kocInfo = {
        isKoc: !!status.isKoc,
        level: status.level || '',
        commissionRate: status.commissionRate || 0,
        totalEarnings: '0.00',
        weeklyOrders: 0,
        weeklyCommission: '0.00'
      }
      this.setData({ kocInfo })
      // 已开通则再拉取收益看板
      if (kocInfo.isKoc) {
        api.koc.getDashboard().then(dash => {
          this.setData({
            kocInfo: {
              ...kocInfo,
              totalEarnings: Number(dash.total && dash.total.amount || 0).toFixed(2),
              weeklyOrders: (dash.monthly && dash.monthly.orderCount) || 0,
              weeklyCommission: Number(dash.monthly && dash.monthly.commission || 0).toFixed(2)
            }
          })
        }).catch((err) => handleError(err, { silent: true }))
      }
    }).catch((err) => {
      handleError(err, { silent: true })
      this.setData({
        kocInfo: { isKoc: false, level: '', totalEarnings: '0.00', weeklyOrders: 0, weeklyCommission: '0.00' }
      })
    })
  },

  goAllOrders() {
    wx.switchTab({ url: '/pages/order/list' })
  },

  goOrdersByStatus(e) {
    const status = e.currentTarget.dataset.status
    wx.switchTab({ url: '/pages/order/list' })
    app.globalData.orderTabStatus = status
  },

  goAddress() {
    wx.navigateTo({ url: '/subpackages/checkout/pages/address/list' })
  },

  goCoupon() {
    wx.navigateTo({ url: '/subpackages/extra/pages/coupon/list' })
  },

  goCollection() {
    wx.navigateTo({ url: '/subpackages/extra/pages/collection/index' })
  },

  goAftersale() {
    wx.navigateTo({ url: '/subpackages/order/pages/aftersale/list' })
  },

  goKoc() {
    if (this.data.kocInfo.isKoc) {
      wx.navigateTo({ url: '/subpackages/koc/pages/koc/dashboard/index' })
    } else {
      wx.navigateTo({ url: '/subpackages/koc/pages/koc/register' })
    }
  },

  goService() {
    wx.navigateTo({ url: '/subpackages/extra/pages/chat/index' })
  },

  goAbout() {
    wx.showModal({
      title: '关于鲜到家',
      content: '鲜到家 - 新鲜果蔬，直达您家',
      showCancel: false
    })
  },

  goEditProfile() {
    wx.navigateTo({ url: '/subpackages/extra/pages/settings/index' })
  }
})
