const api = require('../../../../api/index')
const { full: fullImg } = require('../../../../utils/image')

Page({
  data: {
    address: null, list: [], couponId: 0,
    totalAmount: '0.00', discountAmount: '0.00', freightAmount: '0.00', payAmount: '0.00',
    couponText: '暂无可用', remark: '', submitting: false,
    deliveryDate: ''
  },

  onLoad(options) {
    // 预计送达日（明天）
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    this.setData({ deliveryDate: `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日` })

    // 两种入口：
    //  1) 立即购买：options 带 goodsId + skuId + quantity
    //  2) 购物车结算：无 items，从 /cart 拉取
    if (options.skuId) {
      this.loadBuyNowItem(options)
    } else if (options.items) {
      // 兼容外部直接传入 items（JSON）
      this.setData({ list: JSON.parse(options.items) })
      this.calcTotal()
    } else {
      this.loadCartItems()
    }
  },

  onShow() {
    this.loadAddress()
  },

  // 立即购买：拉取商品详情，取出对应 SKU 信息用于展示
  loadBuyNowItem(options) {
    const quantity = Number(options.quantity) || 1
    api.get(`/goods/${options.goodsId}`).then(data => {
      const sku = (data.skus || []).find(s => s.id === options.skuId) || (data.skus || [])[0]
      const item = {
        skuId: options.skuId,
        goodsTitle: data.name,
        specName: sku ? sku.name : '',
        goodsImage: fullImg((data.images || [])[0] || ''),
        price: Number(sku ? sku.price : data.price) || 0,
        quantity
      }
      this.setData({ list: [item] })
      this.calcTotal()
    }).catch(() => {
      wx.showToast({ title: '商品信息加载失败', icon: 'none' })
    })
  },

  // 购物车结算：从后端购物车拉取（价格为服务端权威值）
  loadCartItems() {
    api.get('/cart').then(data => {
      const list = []
      ;(data.suppliers || []).forEach(g => {
        ;(g.items || []).forEach(item => {
          list.push({
            skuId: item.skuId,
            goodsTitle: item.name || item.title,
            specName: item.spec || item.specName || '',
            goodsImage: fullImg(item.image || ''),
            price: Number(item.price) || 0,
            quantity: item.quantity || 1
          })
        })
      })
      this.setData({ list })
      this.calcTotal()
    }).catch(() => {
      // 购物车为空或加载失败
      this.setData({ list: [] })
    })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  loadAddress() {
    api.get('/addresses').then(data => {
      const list = data || []
      const def = list.length ? (list.find(a => a.isDefault) || list[0]) : null
      this.setData({ address: def })
    }).catch(() => {})
  },

  calcTotal() {
    let total = 0
    this.data.list.forEach(item => { total += (Number(item.price) || 0) * item.quantity })
    this.setData({
      totalAmount: total.toFixed(2),
      payAmount: total.toFixed(2)
    })
  },

  goAddress() {
    wx.navigateTo({ url: '/subpackages/checkout/pages/address/list?selectable=1' })
  },

  submit() {
    if (!this.data.address) return wx.showToast({ title: '请选择收货地址', icon: 'none' })
    if (this.data.list.length === 0) return wx.showToast({ title: '没有可结算商品', icon: 'none' })
    this.setData({ submitting: true })
    // 后端契约：items 仅传 skuId + quantity（价格由服务端重算，DTO 会拒绝多余字段）
    const items = this.data.list.map(item => ({
      skuId: item.skuId,
      quantity: item.quantity
    }))
    api.post('/orders', {
      addressId: this.data.address.id,
      items,
      couponId: Number(this.data.couponId) || undefined,
      remark: this.data.remark
    }).then(data => {
      this.setData({ submitting: false })
      // 后端返回 { id, orderSn, payAmount }，用 id 跳转支付结果页
      wx.navigateTo({ url: `/subpackages/checkout/pages/payment/result?orderId=${data.id}&needPay=true` })
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({ title: '下单失败，请重试', icon: 'none' })
    })
  }
})
