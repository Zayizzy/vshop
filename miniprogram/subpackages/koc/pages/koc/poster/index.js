const app = getApp()

Page({
  data: {
    posterUrl: '',
    generating: false,
    saved: false
  },
  onLoad() {
    this.generatePoster()
  },
  generatePoster() {
    this.setData({ generating: true, saved: false })
    // Mock poster generation
    setTimeout(() => {
      this.setData({
        generating: false,
        posterUrl: '/assets/images/promo-fruit.png'  // placeholder
      })
    }, 800)
  },
  savePoster() {
    if (!this.data.posterUrl) return
    wx.showLoading({ title: '保存中' })
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterUrl,
      success: () => {
        wx.hideLoading()
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        this.setData({ saved: true })
      },
      fail: () => {
        wx.hideLoading()
        wx.showModal({
          title: '需要授权',
          content: '请允许保存到相册',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          }
        })
      }
    })
  },
  sharePoster() {
    wx.showShareMenu({ withShareTicket: true })
  },
  onShareAppMessage() {
    return {
      title: '鲜到家·新鲜果蔬直达',
      path: `/pages/home/index?kocId=${app.globalData.channelKocId || ''}`,
      imageUrl: this.data.posterUrl
    }
  }
})
