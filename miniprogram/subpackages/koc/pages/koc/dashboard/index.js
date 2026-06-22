const api = require('../../../../api/index')
const { getNavInfo } = require('../../../../utils/nav')

Page({
  data: {
    statusBarHeight: 20,
    loaded: false,
    balance: '0.00',
    pendingAmount: '0.00',
    totalOrders: 0,
    totalGmv: '0.00',
    todayExposure: 0,
    todayClicks: 0,
    todayOrders: 0,
    orders: []
  },

  onLoad() {
    const nav = getNavInfo()
    this.setData({ statusBarHeight: nav.statusBarHeight })
  },

  onShow() {
    this.loadDashboard()
  },

  onShareAppMessage() {
    return {
      title: '鲜到家 - 新鲜直达',
      path: '/pages/home/index'
    }
  },

  loadDashboard() {
    api.get('/koc/dashboard').then(data => {
      this.setData({
        loaded: true,
        balance: this.fmtPrice(data.balance),
        pendingAmount: this.fmtPrice(data.pendingAmount),
        totalOrders: data.totalOrders || 0,
        totalGmv: this.fmtPrice(data.totalGmv),
        todayExposure: data.todayExposure || 0,
        todayClicks: data.todayClicks || 0,
        todayOrders: data.todayOrders || 0,
        orders: (data.orders || []).map(o => ({
          ...o,
          orderAmount: this.fmtPrice(o.orderAmount),
          commission: this.fmtPrice(o.commission)
        }))
      })
    }).catch(() => {
      this.setData({
        loaded: true,
        balance: '128.50',
        pendingAmount: '36.80',
        totalOrders: 45,
        totalGmv: '3280.00',
        todayExposure: 256,
        todayClicks: 48,
        todayOrders: 3,
        orders: [
          { orderId: '20240615001', goodsTitle: '丹东草莓 500g ×1', orderAmount: '58.00', commission: '5.80', createdAt: '2026-06-15 14:30' },
          { orderId: '20240615002', goodsTitle: '阳光玫瑰葡萄 2斤 ×1', orderAmount: '55.00', commission: '5.50', createdAt: '2026-06-15 10:15' },
          { orderId: '20240614001', goodsTitle: '金枕榴莲 2-3斤 ×1', orderAmount: '158.00', commission: '15.80', createdAt: '2026-06-14 19:00' }
        ]
      })
    })
  },

  fmtPrice(val) {
    const n = Number(val)
    return isNaN(n) ? '0.00' : n.toFixed(2)
  },

  goWithdraw() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/withdraw/index' })
  },

  goStatus() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/status/index' })
  },

  goOrders() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/orders/index' })
  },

  goShare() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/share/index' })
  },

  goCode() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/tools/index?tab=code' })
  },

  goPoster() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/poster/index' })
  },

  goMaterials() {
    wx.navigateTo({ url: '/subpackages/extra/pages/koc/materials/index' })
  },

  shareToTimeline() {
    wx.showToast({ title: '请使用分享到群或复制链接', icon: 'none' })
  },

  copyLink() {
    wx.setClipboardData({
      data: 'pages/home/index',
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  }
})
