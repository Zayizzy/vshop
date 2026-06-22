const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    kocCode: '',
    qrcodeUrl: '',
    shortLink: '',
    appPath: ''
  },

  onLoad(options) {
    this.loadTools()
  },

  loadTools() {
    get('/koc/tools').then(data => {
      this.setData({
        kocCode: data.kocCode || '',
        qrcodeUrl: data.qrcodeUrl || '',
        shortLink: data.shortLink || '',
        appPath: data.appPath || 'pages/home/index?kocId='
      })
    }).catch(err => {
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  copyCode() {
    wx.setClipboardData({
      data: this.data.kocCode,
      success: () => wx.showToast({ title: '推广码已复制', icon: 'success' })
    })
  },

  copyLink() {
    wx.setClipboardData({
      data: this.data.shortLink,
      success: () => wx.showToast({ title: '短链接已复制', icon: 'success' })
    })
  },

  copyPath() {
    wx.setClipboardData({
      data: this.data.appPath,
      success: () => wx.showToast({ title: '路径已复制', icon: 'success' })
    })
  },

  saveQrcode() {
    if (!this.data.qrcodeUrl) {
      return wx.showToast({ title: '暂无小程序码', icon: 'none' })
    }

    wx.showLoading({ title: '保存中' })
    wx.downloadFile({
      url: this.data.qrcodeUrl,
      success: res => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '已保存到相册', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '保存失败，请授权相册权限', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  }
})
