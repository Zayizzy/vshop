const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: { tab: 'usable', list: [] },
  onLoad() { this.loadList() },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }); this.loadList() },
  loadList() {
    get('/coupons/my', { status: this.data.tab }).then(data => {
      const list = (data.list || []).map(item => ({
        ...item,
        scopeText: this.getScopeText(item),
        validPeriod: this.getValidPeriod(item)
      }))
      this.setData({ list })
    }).catch(() => {
      if (this.data.tab === 'usable') {
        this.setData({
          list: [
            { id: 1, type: 'cash', value: 5, minAmount: 39, name: '新人专享券', scopeText: '全场果蔬通用', validPeriod: '2026.06.01 - 2026.07.01', status: 'usable' },
            { id: 2, type: 'discount', discountValue: 0.85, name: '夏日清凉券', scopeText: '水果类商品', validPeriod: '2026.06.10 - 2026.06.30', status: 'usable' }
          ]
        })
      } else if (this.data.tab === 'used') {
        this.setData({
          list: [
            { id: 3, type: 'cash', value: 10, minAmount: 69, name: '满减券', scopeText: '全场通用', validPeriod: '2026.05.01 - 2026.06.01', status: 'used' }
          ]
        })
      } else {
        this.setData({
          list: [
            { id: 4, type: 'cash', value: 3, minAmount: 0, name: '无门槛券', scopeText: '全场通用', validPeriod: '2026.04.01 - 2026.05.01', status: 'expired' }
          ]
        })
      }
    })
  },
  getScopeText(item) {
    if (item.scopeType === 'all') return '全部商品可用'
    if (item.scopeType === 'category') return '指定分类可用'
    if (item.scopeType === 'goods') return '指定商品可用'
    return ''
  },
  getValidPeriod(item) {
    return item.expireTime ? `有效期至 ${item.expireTime.slice(0, 10)}` : ''
  }
})
