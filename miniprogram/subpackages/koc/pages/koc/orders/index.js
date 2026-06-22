Page({
  data: {
    orders: [],
    loading: true
  },
  onLoad() {
    this.loadOrders()
  },
  loadOrders() {
    // Mock data for development
    setTimeout(() => {
      this.setData({
        loading: false,
        orders: [
          { id: '20240615001', goodsTitle: '丹东草莓 500g ×1', goodsImage: '/assets/images/strawberry.png', orderAmount: '58.00', commission: '5.80', status: 'done', createdAt: '2026-06-15 14:30' },
          { id: '20240615002', goodsTitle: '阳光玫瑰葡萄 2斤 ×1', goodsImage: '/assets/images/grape.png', orderAmount: '55.00', commission: '5.50', status: 'pending', createdAt: '2026-06-15 10:15' },
          { id: '20240614003', goodsTitle: '金枕榴莲 2-3斤 ×1', goodsImage: '/assets/images/durian.png', orderAmount: '158.00', commission: '15.80', status: 'done', createdAt: '2026-06-14 19:00' },
          { id: '20240613004', goodsTitle: '有机菠菜 500g ×2', goodsImage: '/assets/images/spinach.png', orderAmount: '19.80', commission: '1.98', status: 'settled', createdAt: '2026-06-13 08:30' }
        ]
      })
    }, 300)
  },
  getStatusText(status) {
    const map = { pending: '待结算', done: '已结算', settled: '已提现' }
    return map[status] || '--'
  },
  getStatusTheme(status) {
    const map = { pending: 'warning', done: 'success', settled: 'default' }
    return map[status] || 'default'
  }
})
