const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    loaded: false,
    totalEarnings: '0.00',
    pendingEarnings: '0.00',
    settledEarnings: '0.00',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'settled', label: '已结算' },
      { key: 'pending', label: '待结算' }
    ],
    activeTab: 'all',
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadEarnings()
  },

  onShow() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadEarnings()
  },

  loadEarnings() {
    this.setData({ loaded: false })
    const { activeTab, page, pageSize } = this.data
    const status = activeTab === 'all' ? '' : activeTab === 'settled' ? 'settled' : 'pending'

    get('/koc/earnings', { status, page, pageSize }).then(data => {
      const list = (data.list || []).map(this.formatItem)
      this.setData({
        loaded: true,
        totalEarnings: this.fmtPrice(data.totalEarnings),
        pendingEarnings: this.fmtPrice(data.pendingEarnings),
        settledEarnings: this.fmtPrice(data.settledEarnings),
        list: page === 1 ? list : this.data.list.concat(list),
        hasMore: data.hasMore !== false && list.length >= pageSize
      })
    }).catch(() => {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loaded: true })
    })
  },

  formatItem(item) {
    const settled = item.status === 'settled'
    return {
      ...item,
      orderAmount: this.fmtPrice(item.orderAmount),
      commission: this.fmtPrice(item.commission),
      statusText: settled ? '已结算' : item.status === 'pending' ? '待结算' : item.status,
      statusClass: settled ? 'settled' : item.status === 'pending' ? 'pending' : ''
    }
  },

  fmtPrice(val) {
    const n = Number(val)
    return isNaN(n) ? '0.00' : n.toFixed(2)
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key, page: 1, list: [], hasMore: true })
    this.loadEarnings()
  },

  loadMore() {
    if (!this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.loadEarnings()
  }
})
