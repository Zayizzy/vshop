const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: { aftersale: {}, statusColor: '#FF6B35', statusText: '', typeText: '', canCancel: false },
  onLoad(options) {
    get(`/aftersales/${options.id}`).then(data => {
      const statusMap = { 0: { c: '#FF6B35', t: '待审核' }, 1: { c: '#07C160', t: '已同意' }, 2: { c: '#E24B4A', t: '已拒绝' }, 3: { c: '#FF6B35', t: '退款中' }, 4: { c: '#07C160', t: '已退款' }, 5: { c: '#999', t: '已完成' } }
      const s = statusMap[data.status] || { c: '#999', t: '--' }
      this.setData({
        aftersale: data,
        statusColor: s.c, statusText: s.t,
        typeText: { 1: '仅退款', 2: '退货退款' }[data.type] || '--',
        canCancel: data.status === 0
      })
    })
  },
  cancelAfterSale() {
    wx.showModal({ title: '提示', content: '确定取消售后申请吗？', success: res => {
      if (!res.confirm) return
      post(`/aftersales/${this.data.aftersale.id}/cancel`).then(() => {
        wx.showToast({ title: '已取消', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
    }})
  }
})
