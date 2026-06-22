const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    orderId: '', packageIndex: 0, orderItemId: '',
    type: 1, refundAmount: '', reason: '', reasonIndex: -1,
    reasons: ['商品破损', '商品与描述不符', '质量/新鲜度问题', '发错商品', '漏发/少发', '不想要了', '其他'],
    description: '', images: [], submitting: false
  },
  onLoad(options) {
    this.setData({
      orderId: options.orderId,
      packageIndex: options.packageIndex,
      orderItemId: options.orderItemId,
      refundAmount: options.amount || ''
    })
  },
  setType(e) { this.setData({ type: Number(e.currentTarget.dataset.type) }) },
  selectReason(e) { this.setData({ reason: this.data.reasons[e.detail.value], reasonIndex: e.detail.value }) },
  setDesc(e) { this.setData({ description: e.detail.value }) },
  chooseImage() {
    wx.chooseImage({ count: 6 - this.data.images.length, sizeType: ['compressed'] }).then(res => {
      this.setData({ images: this.data.images.concat(res.tempFilePaths) })
    })
  },
  removeImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.filter((_, i) => i !== idx)
    this.setData({ images })
  },
  submit() {
    if (!this.data.reason) return wx.showToast({ title: '请选择售后原因', icon: 'none' })
    this.setData({ submitting: true })
    post('/aftersales', {
      orderId: this.data.orderId,
      packageIndex: Number(this.data.packageIndex),
      orderItemId: this.data.orderItemId,
      type: this.data.type,
      reason: this.data.reason,
      description: this.data.description,
      evidenceImages: this.data.images,
      refundAmount: Number(this.data.refundAmount)
    }).then(() => {
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => {
      this.setData({ submitting: false })
    })
  }
})
