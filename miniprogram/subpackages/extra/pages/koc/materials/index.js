Page({
  data: {
    materials: [
      { id: 1, type: '文案', title: '鲜到家·新鲜果蔬直达', content: '产地直采，每日20:00前下单次日达！🛒 点击进入小程序，首单立减5元！', copied: false },
      { id: 2, type: '海报', title: '周末特惠海报', content: '时令水果低至5折，满39元免邮', image: '/assets/images/promo-fruit.png' },
      { id: 3, type: '文案', title: '水果安利', content: '这个阿克苏苹果真的绝了！糖度18+，果肉细腻多汁，家里老人小孩都爱吃🍎 链接在评论区~', copied: false },
      { id: 4, type: '文案', title: '蔬菜推荐', content: '有机菠菜、普罗旺斯番茄、水果黄瓜...全是当日采摘，鲜嫩到家！🥬 点击下单', copied: false },
      { id: 5, type: '图片', title: '丹东草莓实拍', image: '/assets/images/strawberry.png' },
      { id: 6, type: '图片', title: '金枕榴莲开果', image: '/assets/images/durian.png' }
    ],
    activeTab: 'all'
  },
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },
  copyText(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({ data: text })
    wx.showToast({ title: '已复制', icon: 'success' })
    const id = e.currentTarget.dataset.id
    const materials = this.data.materials.map(m => m.id === id ? {...m, copied: true} : m)
    this.setData({ materials })
  },
  saveImage(e) {
    const url = e.currentTarget.dataset.url
    wx.showLoading({ title: '保存中' })
    wx.saveImageToPhotosAlbum({ filePath: url, success: () => { wx.hideLoading(); wx.showToast({ title: '已保存', icon: 'success' }) }, fail: () => { wx.hideLoading(); wx.showToast({ title: '保存失败', icon: 'none' }) } })
  },
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({ urls: [url] })
  }
})
