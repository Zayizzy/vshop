const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    id: '', editing: false, saving: false, region: [], regionText: '',
    form: { name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false }
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, editing: true })
      get('/addresses').then(list => {
        const addr = list.find(a => a.id === Number(options.id))
        if (addr) {
          this.setData({
            form: addr,
            regionText: `${addr.province} ${addr.city} ${addr.district}`,
            region: [addr.province, addr.city, addr.district]
          })
        }
      })
    }
  },
  setField(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  selectRegion(e) {
    const [province, city, district] = e.detail.value
    this.setData({
      region: e.detail.value,
      regionText: `${province} ${city} ${district}`,
      'form.province': province, 'form.city': city, 'form.district': district
    })
  },
  toggleDefault() {
    this.setData({ 'form.isDefault': !this.data.form.isDefault })
  },
  save() {
    const f = this.data.form
    if (!f.name || !f.phone || !f.province || !f.detail) return wx.showToast({ title: '请完善信息', icon: 'none' })
    this.setData({ saving: true })
    const req = this.data.editing ? app.request({ url: `/addresses/${this.data.id}`, method: 'PUT', data: f }) : post('/addresses', f)
    req.then(() => {
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    }).catch(() => this.setData({ saving: false }))
  },
  del() {
    wx.showModal({ title: '删除地址', content: '确定删除吗？', success: res => {
      if (!res.confirm) return
      app.request({ url: `/addresses/${this.data.id}`, method: 'DELETE' }).then(() => {
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1000)
      })
    }})
  }
})
