const app = getApp()
const { full } = require('../../../../utils/image')
function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

// 上传服务根：app.globalData.apiBase 形如 http://host:3000/v1，去掉末尾 /v1 即得
function uploadHost() {
  const base = (app.globalData && app.globalData.apiBase) || ''
  return base.replace(/\/v\d+\/?$/, '').replace(/\/$/, '')
}

Page({
  data: {
    orderId: '', packageIndex: 0, orderItemId: '',
    type: 1, refundAmount: '', reason: '', reasonIndex: -1,
    reasons: ['商品破损', '商品与描述不符', '质量/新鲜度问题', '发错商品', '漏发/少发', '不想要了', '其他'],
    description: '', images: [], displayImages: [], uploading: false, submitting: false
  },
  onLoad(options) {
    this.setData({
      orderId: options.orderId,
      packageIndex: options.packageIndex,
      orderItemId: options.orderItemId || '',
      refundAmount: options.amount || ''
    })
  },
  setType(e) { this.setData({ type: Number(e.currentTarget.dataset.type) }) },
  selectReason(e) { this.setData({ reason: this.data.reasons[e.detail.value], reasonIndex: e.detail.value }) },
  setDesc(e) { this.setData({ description: e.detail.value }) },
  chooseImage() {
    const remain = 6 - this.data.images.length
    if (remain <= 0) return wx.showToast({ title: '最多上传 6 张', icon: 'none' })
    wx.chooseMedia({ count: remain, mediaType: ['image'], sizeType: ['compressed'] }).then(res => {
      const tempPaths = (res.tempFiles || []).map(f => f.tempFilePath)
      if (tempPaths.length) this.uploadImages(tempPaths)
    }).catch(() => {})
  },
  // 上传凭证图到后端 /api/admin/upload，提交时只发送服务端返回的 URL
  uploadImages(tempPaths) {
    this.setData({ uploading: true })
    const uploadUrl = uploadHost() + '/api/admin/upload'
    Promise.all(tempPaths.map(p => new Promise((resolve, reject) => {
      wx.uploadFile({
        url: uploadUrl,
        filePath: p,
        name: 'files',
        success: r => {
          try {
            const data = JSON.parse(r.data)
            if (data && data.data && data.data.urls && data.data.urls[0]) resolve(data.data.urls[0])
            else reject(new Error('上传失败'))
          } catch (e) { reject(e) }
        },
        fail: reject
      })
    }))).then(urls => {
      const images = this.data.images.concat(urls)
      this.setData({ images, displayImages: images.map(full), uploading: false })
    }).catch(() => {
      this.setData({ uploading: false })
      wx.showToast({ title: '图片上传失败', icon: 'none' })
    })
  },
  removeImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.images.filter((_, i) => i !== idx)
    this.setData({ images, displayImages: images.map(full) })
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
