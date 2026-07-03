const api = require('../../api/index')
const { getNavInfo } = require('../../utils/nav')
const { full: fullImg } = require('../../utils/image')
const { handleError } = require('../../utils/error')
const { calculatePrice } = require('../../utils/money')

Page({
  data: {
    statusBarHeight: 20,
    goodsId: '',
    goods: {},
    images: [],
    detailImages: [],
    skus: [],
    specs: [],
    selectedSpecs: {},
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
    api.goods.getDetail(this.data.goodsId).then(data => {
      wx.hideLoading()
      const skus = data.skus || []
      const specs = data.specs || []
      // 多规格：各维度默认选第一个值，定位匹配 sku；无维度回退首个 sku
      const selectedSpecs = {}
      specs.forEach(s => { if (s.values && s.values.length) selectedSpecs[s.name] = s.values[0] })
      const allSelected = specs.length > 0 && specs.every(s => selectedSpecs[s.name] != null)
      const matched = allSelected
        ? skus.find(s => s.specValues && s.specValues.length > 0 && s.specValues.every(sv => selectedSpecs[sv.name] === sv.value))
        : null
      const sku = matched || skus[0] || null
      const original = sku ? (Number(sku.price) || 0) : 0
      const rate = data.discountRate != null ? data.discountRate : null
      const paid = calculatePrice(original, rate)
      this.setData({
        loading: false,
        goods: {
          name: data.name || '',
          price: paid,
          originalPrice: original,
          discountRate: rate,
          marketPrice: sku && sku.marketPrice != null ? Number(sku.marketPrice) : '',
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
        skus,
        specs,
        selectedSpecs,
        selectedSkuId: sku ? sku.id : '',
        selectedSku: sku,
        collected: data.collected || false
      })
    }).catch((err) => {
      wx.hideLoading()
      this.setData({ loading: false })
      handleError(err, { defaultMsg: '商品加载失败' })
    })
  },

  loadCartCount() {
    api.cart.count().then(data => {
      this.setData({ cartCount: data.count || 0 })
    }).catch((err) => handleError(err, { silent: true }))
  },

  selectSku(e) {
    const skuId = e.currentTarget.dataset.id
    const sku = this.data.skus.find(s => s.id === skuId)
    if (sku) {
      // sku.price 为折前价；有折扣率时折后价 = 折前 × discountRate
      const original = Number(sku.price) || 0
      const rate = this.data.goods.discountRate
      const paid = calculatePrice(original, rate)
      this.setData({
        selectedSkuId: skuId,
        selectedSku: sku,
        'goods.originalPrice': original,
        'goods.price': paid,
        'goods.marketPrice': sku.marketPrice != null ? Number(sku.marketPrice) : ''
      })
    }
  },

  // 多规格：按维度点选，选齐所有维度后定位匹配 sku 并切换价格
  selectSpec(e) {
    const { name, val } = e.currentTarget.dataset
    const selectedSpecs = Object.assign({}, this.data.selectedSpecs, { [name]: val })
    const patch = { selectedSpecs }
    const allSelected = this.data.specs.every(s => selectedSpecs[s.name] != null)
    if (allSelected) {
      const sku = this.data.skus.find(s =>
        s.specValues && s.specValues.length > 0 &&
        s.specValues.every(sv => selectedSpecs[sv.name] === sv.value)
      )
      if (sku) {
        const original = Number(sku.price) || 0
        const rate = this.data.goods.discountRate
        const paid = calculatePrice(original, rate)
        patch.selectedSkuId = sku.id
        patch.selectedSku = sku
        patch['goods.originalPrice'] = original
        patch['goods.price'] = paid
        patch['goods.marketPrice'] = sku.marketPrice != null ? Number(sku.marketPrice) : ''
      } else {
        patch.selectedSkuId = ''
        patch.selectedSku = null
      }
    } else {
      patch.selectedSkuId = ''
      patch.selectedSku = null
    }
    this.setData(patch)
  },

  toggleCollect() {
    const newState = !this.data.collected
    this.setData({ collected: newState })
    // 后端契约：{ goodId, isCollected }
    api.goods.collect({
      goodId: this.data.goodsId,
      isCollected: newState
    }).catch((err) => {
      this.setData({ collected: !newState })
      handleError(err, { defaultMsg: '收藏失败' })
    })
  },

  addToCart() {
    if (!this.data.selectedSkuId && this.data.skus.length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    // 后端契约：{ skuId, quantity }（DTO 会拒绝多余字段）
    api.cart.add({
      skuId: this.data.selectedSkuId,
      quantity: 1
    }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
      this.loadCartCount()
    }).catch((err) => {
      handleError(err, { defaultMsg: '添加失败，请重试' })
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

  onDetailImageError(e) {
    const { index } = e.currentTarget.dataset
    const detailImages = this.data.detailImages
    detailImages[index] = '/assets/images/placeholder.png'
    this.setData({ detailImages })
  },

  onShareAppMessage() {
    return {
      title: this.data.goods.name || '发现一个好物',
      path: `/pages/goods/detail?id=${this.data.goodsId}`
    }
  }
})
