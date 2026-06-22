const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: { addresses: [], selectable: false },
  onLoad(options) { this.setData({ selectable: options.selectable === '1' }) },
  onShow() {
    get('/addresses').then(data => this.setData({ addresses: data || [] }))
      .catch(() => {
        this.setData({
          addresses: [
            { id: 1, name: '张三', phone: '138****8888', province: '福建省', city: '厦门市', district: '思明区', detail: '软件园二期观日路88号', isDefault: true },
            { id: 2, name: '李四', phone: '159****6666', province: '福建省', city: '厦门市', district: '湖里区', detail: '火炬园创业大厦15楼', isDefault: false }
          ]
        })
      })
  },
  selectAddr(e) {
    if (!this.data.selectable) return
    const id = e.currentTarget.dataset.id
    const addr = this.data.addresses.find(a => a.id === id)
    const pages = getCurrentPages()
    const prev = pages[pages.length - 2]
    if (prev && prev.setData) prev.setData({ address: addr })
    wx.navigateBack()
  },
  edit(e) {
    wx.navigateTo({ url: `/subpackages/checkout/pages/address/edit?id=${e.currentTarget.dataset.id}` })
  },
  add() {
    wx.navigateTo({ url: '/subpackages/checkout/pages/address/edit' })
  },
  deleteAddr(e) {
    wx.showModal({ title: '确认删除', content: '确定删除该地址吗？', success: res => {
      if (!res.confirm) return
      app.request({ url: `/addresses/${e.currentTarget.dataset.id}`, method: 'DELETE' }).then(() => {
        wx.showToast({ title: '已删除', icon: 'none' })
        this.onShow()
      })
    }})
  }
})
