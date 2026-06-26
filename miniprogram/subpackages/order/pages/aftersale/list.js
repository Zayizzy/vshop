const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

function formatTime(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

Page({
  data: { list: [], filter: 'all', page: 1, hasMore: true },
  onLoad() { this.loadList() },
  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter, page: 1, list: [] })
    this.loadList()
  },
  loadList() {
    const params = { page: this.data.page, pageSize: 20 }
    if (this.data.filter !== 'all') params.status = this.data.filter
    get('/aftersales', params).then(data => {
      const statusMap = { 0: { c: '#FF6B35', t: '审核中' }, 1: { c: '#07C160', t: '已同意' }, 2: { c: '#E24B4A', t: '已拒绝' }, 3: { c: '#FF6B35', t: '退款中' }, 4: { c: '#07C160', t: '已退款' }, 5: { c: '#999', t: '已完成' } }
      const list = data.list.map(item => ({
        ...item,
        createdAt: formatTime(item.createdAt),
        statusColor: statusMap[item.status]?.c || '#999',
        statusText: statusMap[item.status]?.t || '--',
        typeText: { 1: '仅退款', 2: '退货退款' }[item.type] || '--'
      }))
      this.setData({ list: this.data.list.concat(list), page: this.data.page + 1, hasMore: data.hasMore })
    })
  },
  goDetail(e) {
    wx.navigateTo({ url: `/subpackages/order/pages/aftersale/detail?id=${e.currentTarget.dataset.id}` })
  },
  onReachBottom() {
    if (this.data.hasMore) this.loadList()
  }
})
