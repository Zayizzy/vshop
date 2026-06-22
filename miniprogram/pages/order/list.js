const api = require('../../api/index')

Page({
  data: {
    statusTabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待付款' },
      { key: 'shipping', label: '待发货' },
      { key: 'receiving', label: '待收货' },
      { key: 'done', label: '已完成' }
    ],
    activeTab: '',
    orders: [],
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadOrders()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadOrders()
  },

  switchTab(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.activeTab) return
    this.setData({ activeTab: status, orders: [], page: 1, hasMore: true })
    this.loadOrders()
  },

  onTabChange(e) {
    this.switchTab({ currentTarget: { dataset: { status: e.detail.value } } })
  },

  loadOrders() {
    const { activeTab, page } = this.data
    this.setData({ loading: true })
    api.get('/orders', { status: activeTab, page, pageSize: 10 }).then(data => {
      // 后端订单列表为扁平 items[]，wxml 期望 packages[].items[].coverImage/title 结构，
      // 这里做一次映射：单包裹包裹所有明细，并补 totalCount。
      const mapped = (data.list || []).map(o => ({
        id: o.id,
        orderSn: o.orderSn,
        status: o.status,
        totalAmount: o.totalAmount,
        totalCount: (o.items || []).reduce((s, i) => s + i.quantity, 0),
        packages: [{
          supplierId: o.supplierId || 1,
          supplierName: o.supplierName || '鲜到家',
          logisticsType: '',
          items: (o.items || []).map(i => ({
            id: i.id,
            title: i.goodTitle,
            coverImage: i.image,
            specName: i.specName,
            price: i.price,
            quantity: i.quantity
          }))
        }]
      }))
      const list = this.data.orders.concat(mapped)
      this.setData({
        orders: list,
        page: this.data.page + 1,
        hasMore: data.hasMore,
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false, hasMore: false })
      if (page === 1) wx.showToast({ title: '订单加载失败', icon: 'none' })
    })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/subpackages/order/pages/order/detail?id=${id}` })
  },

  goLogistics(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/subpackages/order/pages/order/logistics?id=${id}` })
  },

  confirmReceive(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: res => {
        if (res.confirm) {
          api.post('/orders/confirm', { orderId: id }).then(() => {
            wx.showToast({ title: '已确认收货', icon: 'success' })
            this.setData({ orders: [], page: 1, hasMore: true })
            this.loadOrders()
          })
        }
      }
    })
  },

  rebuy(e) {
    const id = e.currentTarget.dataset.id
    api.post('/orders/rebuy', { orderId: id }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    })
  },

  getStatusBadge(status) {
    const map = {
      pending: { text: '待付款', class: 'badge-orange' },
      shipping: { text: '待发货', class: 'badge-gray' },
      receiving: { text: '待收货', class: 'badge-orange' },
      done: { text: '已完成', class: 'badge-green' }
    }
    return map[status] || { text: '已取消', class: 'badge-gray' }
  }
})
