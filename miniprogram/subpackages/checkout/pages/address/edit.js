const api = require('../../../../api/index')
const { handleError } = require('../../../../utils/error')
const { validate, isPhone } = require('../../../../utils/validation')

Page({
  data: {
    id: '', editing: false, saving: false, region: [], regionText: '',
    form: { name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false }
  },
  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, editing: true })
      api.address.list().then(list => {
        const addr = list.find(a => a.id === Number(options.id))
        if (addr) {
          this.setData({
            form: addr,
            regionText: `${addr.province} ${addr.city} ${addr.district}`,
            region: [addr.province, addr.city, addr.district]
          })
        }
      }).catch((err) => handleError(err, { defaultMsg: '地址加载失败' }))
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
    const error = validate(f, [
      { key: 'name', name: '收货人' },
      { key: 'phone', name: '手机号', validator: isPhone },
      { key: 'province', name: '所在地区' },
      { key: 'detail', name: '详细地址' },
    ])
    if (error) return wx.showToast({ title: error, icon: 'none' })

    this.setData({ saving: true })
    const req = this.data.editing
      ? api.address.update(this.data.id, f)
      : api.address.create(f)
    req.then(() => {
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    }).catch((err) => {
      this.setData({ saving: false })
      handleError(err, { defaultMsg: '保存失败' })
    })
  },
  del() {
    wx.showModal({
      title: '删除地址',
      content: '确定删除吗？',
      success: res => {
        if (!res.confirm) return
        api.address.remove(this.data.id).then(() => {
          wx.showToast({ title: '已删除', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 1000)
        }).catch((err) => handleError(err, { defaultMsg: '删除失败' }))
      }
    })
  }
})
