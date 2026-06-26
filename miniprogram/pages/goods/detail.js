const api = require('../../api/index')
const { getNavInfo } = require('../../utils/nav')
const { full: fullImg } = require('../../utils/image')

Page({
  data: {
    statusBarHeight: 20,
    goodsId: '',
    goods: {},
    images: [],
    detailImages: [],
    skus: [],
    selectedSkuId: '',
    selectedSku: null,
    collected: false,
    cartCount: 0,
    loading: true
  },

  onLoad(options) {
    const { id } = options
    if (!id) {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({ goodsId: id })

    const nav = getNavInfo()
    this.setData({ statusBarHeight: nav.statusBarHeight })

    this.loadDetail()
  },

  onShow() {
    this.loadCartCount()
  },

  loadDetail() {
    wx.showLoading({ title: '加载中' })
    api.get(`/goods/${this.data.goodsId}`).then(data => {
      wx.hideLoading()
      this.setData({
        loading: false,
        goods: {
          name: data.name || '',
          price: Number(data.price) || 0,
          originalPrice: data.originalPrice != null ? Number(data.originalPrice) : '',
          discountRate: data.discountRate != null ? data.discountRate : null,
          marketPrice: data.marketPrice != null ? Number(data.marketPrice) : '',
          discount: data.discount || '',
          sales: data.sales || 0,
          delivery: data.delivery || 'nextDay',
          origin: data.origin || true,
          supplier: data.supplier || '',
          originDesc: data.originDesc || '',
          detail: data.detail || ''
        },
        images: (data.images || []).map(fullImg),
        detailImages: (data.detailImages || []).map(fullImg),
        skus: data.skus || [],
        selectedSkuId: data.skus && data.skus.length > 0 ? data.skus[0].id : '',
        selectedSku: data.skus && data.skus.length > 0 ? data.skus[0] : null,
        collected: data.collected || false
      })
    }).catch(() => {
      wx.hideLoading()
      this.setData({ loading: false })
      wx.showToast({ title: '商品加载失败', icon: 'none' })
    })
  },

  loadCartCount() {
    api.get('/cart/count').then(data => {
      this.setData({ cartCount: data.count || 0 })
    }).catch(() => {})
  },

  selectSku(e) {
    const skuId = e.currentTarget.dataset.id
    const sku = this.data.skus.find(s => s.id === skuId)
    if (sku) {
      // sku.price 为折前价；有折扣率时折后价 = 折前 × discountRate
      const original = Number(sku.price) || 0
      const rate = this.data.goods.discountRate
      const paid = rate != null ? Math.round(original * rate * 100) / 100 : original
      this.setData({
        selectedSkuId: skuId,
        selectedSku: sku,
        'goods.originalPrice': original,
        'goods.price': paid,
        'goods.marketPrice': sku.marketPrice != null ? Number(sku.marketPrice) : ''
      })
    }
  },

  toggleCollect() {
    const newState = !this.data.collected
    this.setData({ collected: newState })
    // 后端契约：{ goodId, isCollected }
    api.post('/goods/collect', {
      goodId: this.data.goodsId,
      isCollected: newState
    }).catch(() => {
      this.setData({ collected: !newState })
    })
  },

  addToCart() {
    if (!this.data.selectedSkuId && this.data.skus.length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    // 后端契约：{ skuId, quantity }（DTO 会拒绝多余字段）
    api.post('/cart', {
      skuId: this.data.selectedSkuId,
      quantity: 1
    }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
      this.loadCartCount()
    }).catch(() => {
      wx.showToast({ title: '添加失败，请重试', icon: 'none' })
    })
  },

  buyNow() {
    if (!this.data.selectedSkuId && this.data.skus.length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    const params = `goodsId=${this.data.goodsId}&skuId=${this.data.selectedSkuId}&quantity=1`
    wx.navigateTo({
      url: `/subpackages/checkout/pages/checkout/index?${params}`
    })
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/index' })
  },

  goKefu() {
    const title = encodeURIComponent(this.data.goods.name || '商品咨询')
    wx.navigateTo({
      url: `/subpackages/extra/pages/chat/index?goodId=${this.data.goodsId}&title=${title}`
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: this.data.goods.name || '发现一个好物',
      path: `/pages/goods/detail?id=${this.data.goodsId}`
    }
  }
})
