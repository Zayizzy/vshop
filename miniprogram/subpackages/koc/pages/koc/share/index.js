const app = getApp()

Page({
  data: {
    keyword: '',
    goodsList: [],
    selectedGood: null,
    shareReady: false,
    shareLink: '',
    mode: 'list' // 'list' | 'share'
  },

  onLoad() {
    this.loadGoods()
  },

  loadGoods() {
    // Mock 商品列表
    this.setData({
      goodsList: [
        { id: 'g1', name: '新疆阿克苏苹果 5斤装', image: '/assets/images/apple.png', price: '29.90', commission: '2.99', tag: '高佣金' },
        { id: 'g2', name: '丹东红颜草莓 500g', image: '/assets/images/strawberry.png', price: '58.00', commission: '5.80', tag: '热销' },
        { id: 'g3', name: '泰国金枕头榴莲 2-3斤', image: '/assets/images/durian.png', price: '158.00', commission: '15.80', tag: '爆款' },
        { id: 'g4', name: '阳光玫瑰葡萄 2斤装', image: '/assets/images/grape.png', price: '55.00', commission: '5.50', tag: '精品' },
        { id: 'g5', name: '普罗旺斯番茄 1kg', image: '/assets/images/tomato.png', price: '12.80', commission: '1.28', tag: '有机' },
        { id: 'g6', name: '有机菠菜 500g', image: '/assets/images/spinach.png', price: '9.90', commission: '0.99', tag: '有机' },
        { id: 'g7', name: '进口蓝莓 125g×4盒', image: '/assets/images/blueberry.png', price: '39.90', commission: '3.99', tag: '热销' },
        { id: 'g8', name: '阳山水蜜桃 6个装', image: '/assets/images/peach.png', price: '68.00', commission: '6.80', tag: '时令' }
      ]
    })
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    const kw = this.data.keyword.trim()
    if (!kw) {
      this.loadGoods()
      return
    }
    const filtered = this.data.goodsList.filter(g =>
      g.name.includes(kw)
    )
    this.setData({ goodsList: filtered.length ? filtered : this.data.goodsList })
  },

  selectGood(e) {
    const id = e.currentTarget.dataset.id
    const good = this.data.goodsList.find(g => g.id === id)
    if (!good) return

    const kocId = app.globalData.channelKocId || 'mock_koc_001'
    const sharePath = `/pages/goods/detail?id=${good.id}&kocId=${kocId}`
    const shareLink = `https://vshop.xdianjia.com/share?path=${encodeURIComponent(sharePath)}`

    this.setData({
      selectedGood: good,
      mode: 'share',
      shareReady: true,
      shareLink
    })
  },

  backToList() {
    this.setData({ mode: 'list', selectedGood: null, shareReady: false })
  },

  copyLink() {
    wx.setClipboardData({ data: this.data.shareLink })
    wx.showToast({ title: '链接已复制', icon: 'success' })
  },

  copyText() {
    if (!this.data.selectedGood) return
    const g = this.data.selectedGood
    const text = `🔥 ${g.name}\n💰 价格：¥${g.price}\n🛒 产地直采，次日到家\n👉 点击购买：${this.data.shareLink}`
    wx.setClipboardData({ data: text })
    wx.showToast({ title: '文案已复制', icon: 'success' })
  },

  saveQrcode() {
    wx.showToast({ title: '请长按保存小程序码', icon: 'none' })
  },

  onShareAppMessage() {
    if (!this.data.selectedGood) {
      return { title: '鲜到家·新鲜果蔬直达', path: '/pages/home/index' }
    }
    const g = this.data.selectedGood
    return {
      title: `🔥 ${g.name} ¥${g.price} | 鲜到家`,
      path: `/pages/goods/detail?id=${g.id}&kocId=${app.globalData.channelKocId || 'mock_koc_001'}`,
      imageUrl: g.image
    }
  }
})
