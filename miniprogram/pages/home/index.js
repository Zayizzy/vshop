const app = getApp()
const api = require('../../api/index')

Page({
  data: {
    city: '厦门',
    cutoffCountdown: '--:--:--',
    nextDay: '',
    banners: [],
    categories: [],
    recommendList: [],
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadHome()
    this.startCutoffTimer()
  },

  onShow() {
    this.setData({ page: 1, recommendList: [], hasMore: true })
    this.loadRecommend()
    // 从后台/其他页返回时恢复倒计时（onHide 已暂停）
    if (!this._cutoffTimer) this.startCutoffTimer()
  },

  onHide() {
    // 页面隐藏时暂停倒计时，避免后台空转
    if (this._cutoffTimer) {
      clearInterval(this._cutoffTimer)
      this._cutoffTimer = null
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadRecommend()
  },

  loadHome() {
    api.get('/home').then(data => {
      this.setData({
        banners: data.banners || [],
        categories: data.categories || [],
        cutoffCountdown: data.cutoffCountdown || '--:--:--',
        nextDay: data.nextDay || ''
      })
    }).catch(() => {
      wx.showToast({ title: '首页加载失败', icon: 'none' })
    })
  },

  loadRecommend() {
    if (this.data.loading) return
    this.setData({ loading: true })
    api.get('/goods/list', { page: this.data.page, pageSize: 10, sort: 'recommend' }).then(data => {
      // goods-card 内部兼容 name/title、image/coverImage、sold/sales、marketPrice/originalPrice
      const list = this.data.recommendList.concat(data.list || [])
      this.setData({
        recommendList: list,
        page: this.data.page + 1,
        hasMore: data.hasMore,
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false, hasMore: false })
    })
  },

  startCutoffTimer() {
    const update = () => {
      const now = new Date()
      const cutoff = new Date(now)
      cutoff.setHours(20, 0, 0, 0)
      if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1)
      const diff = cutoff - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      this.setData({ cutoffCountdown: `${h}小时${m}分${s}秒` })
    }
    update()
    this._cutoffTimer = setInterval(update, 1000)
  },

  switchCity() {
    wx.showToast({ title: '城市切换开发中', icon: 'none' })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/result' })
  },

  onBannerTap(e) {
    const link = e.currentTarget.dataset.link
    if (link && link.type === 'goods') {
      wx.navigateTo({ url: `/pages/goods/detail?id=${link.id}` })
    }
  },

  goCategory(e) {
    wx.switchTab({ url: '/pages/category/index' })
  },

  goDetail(e) {
    const id = e.detail.id != null ? e.detail.id : e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/goods/detail?id=${id}` })
  },

  goMore() {
    wx.switchTab({ url: '/pages/category/index' })
  },

  onUnload() {
    if (this._cutoffTimer) {
      clearInterval(this._cutoffTimer)
      this._cutoffTimer = null
    }
  }
})
