const api = require('../../api/index')
const { getNavInfo } = require('../../utils/nav')
const { full: fullImg } = require('../../utils/image')

Page({
  data: {
    statusBarHeight: 20,
    navHeight: 64,
    supplierGroups: [],
    recommendList: [],
    loading: false,
    isManaging: false,
    hasItems: false
  },

  // 计算属性
  getSelectedCount() {
    let count = 0
    this.data.supplierGroups.forEach(g => {
      g.items.forEach(item => {
        if (item.selected) count += item.quantity
      })
    })
    return count
  },

  getTotalPrice() {
    let total = 0
    this.data.supplierGroups.forEach(g => {
      g.items.forEach(item => {
        if (item.selected) total += item.price * item.quantity
      })
    })
    return total
  },

  getAllSelected() {
    if (this.data.supplierGroups.length === 0) return false
    return this.data.supplierGroups.every(g => g.items.every(item => item.selected))
  },

  getHasItems() {
    return this.data.supplierGroups.length > 0
  },

  onLoad() {
    const nav = getNavInfo()
    this.setData({ statusBarHeight: nav.statusBarHeight, navHeight: nav.navHeight })
    this.loadCart()
    this.loadRecommend()
  },

  onShow() {
    this.loadCart()
  },

  loadCart() {
    this.setData({ loading: true })
    api.get('/cart').then(data => {
      // 后端契约：{ suppliers: [{ supplierId, supplierName, items: [...], totalPrice, freight }], totalAmount }
      const groups = (data.suppliers || []).map(g => ({
        supplierId: g.supplierId,
        supplierName: g.supplierName || '供应商',
        freeShipping: true,
        freeShippingThreshold: 39,
        checked: false,
        items: (g.items || []).map(item => ({
          id: item.skuId || item.id,
          skuId: item.skuId,
          title: item.name || item.title,
          spec: item.spec || item.specName || '',
          price: Number(item.price) || 0,
          image: fullImg(item.image || item.coverImage || ''),
          quantity: item.quantity || 1,
          stock: item.stock || 0,
          selected: true
        }))
      }))

      // 计算每个供应商的总金额、邮寄进度和选中状态
      groups.forEach(g => {
        g.totalAmount = g.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
        g.shippingPercent = g.freeShippingThreshold > 0 ? Math.min((g.totalAmount / g.freeShippingThreshold) * 100, 100) : 100
        g.checked = g.items.every(i => i.selected)
      })

      this.setData({
        supplierGroups: groups,
        loading: false
      })
      this.updateSummary()
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '购物车加载失败', icon: 'none' })
    })
  },

  loadRecommend() {
    api.get('/goods/list', { page: 1, pageSize: 2, sort: 'recommend' }).then(data => {
      const list = (data.list || []).slice(0, 2).map(item => ({
        id: item.id,
        title: item.title || item.name,
        price: item.price,
        image: fullImg(item.coverImage || item.image || item.picUrl || '')
      }))
      this.setData({ recommendList: list })
    }).catch(() => {
      // 静默加载失败
    })
  },

  // 切换商品选中
  toggleSelect(e) {
    const { gidx, iidx } = e.currentTarget.dataset
    const key = `supplierGroups[${gidx}].items[${iidx}].selected`
    const current = this.data.supplierGroups[gidx].items[iidx].selected
    this.setData({ [key]: !current })
    this.afterItemChange(gidx)
  },

  // 切换供应商全选
  toggleSupplier(e) {
    const gidx = e.currentTarget.dataset.index
    const group = this.data.supplierGroups[gidx]
    const newChecked = !group.checked
    const updates = {}
    group.items.forEach((_, i) => {
      updates[`supplierGroups[${gidx}].items[${i}].selected`] = newChecked
    })
    updates[`supplierGroups[${gidx}].checked`] = newChecked
    this.setData(updates)
    this.updateSummary()
  },

  // 全选/取消全选
  toggleAll() {
    const newVal = !this.getAllSelected()
    const updates = {}
    this.data.supplierGroups.forEach((g, gi) => {
      g.items.forEach((_, ii) => {
        updates[`supplierGroups[${gi}].items[${ii}].selected`] = newVal
      })
      updates[`supplierGroups[${gi}].checked`] = newVal
    })
    this.setData(updates)
    this.updateSummary()
  },

  // 商品单项变化后刷新供应商状态和汇总
  afterItemChange(gidx) {
    const group = this.data.supplierGroups[gidx]
    const allChecked = group.items.every(i => i.selected)
    this.setData({ [`supplierGroups[${gidx}].checked`]: allChecked })
    this.updateSummary()
  },

  // 更新汇总数据
  updateSummary() {
    const selectedCount = this.getSelectedCount()
    const totalPrice = this.getTotalPrice()
    const allSelected = this.getAllSelected()
    const hasItems = this.getHasItems()
    this.setData({ selectedCount, totalPrice, allSelected, hasItems })
  },

  // 数量变更 (t-stepper)
  onQtyChange(e) {
    const { value, gidx, iidx } = { ...e.detail, ...e.currentTarget.dataset }
    this.changeQty(e, gidx, iidx, value)
  },

  // 数量变更
  changeQty(e, gidx, iidx, newQty) {
    // 兼容旧的自定义 stepper (action: minus/plus)
    if (newQty === undefined) {
      const { gidx: gIdx, iidx: iIdx, action } = e.currentTarget.dataset
      gidx = parseInt(gIdx)
      iidx = parseInt(iIdx)
      const item = this.data.supplierGroups[gidx].items[iidx]
      newQty = item.quantity
      if (action === 'minus') {
        if (newQty <= 1) return
        newQty -= 1
      } else {
        newQty += 1
      }
    }

    const key = `supplierGroups[${gidx}].items[${iidx}].quantity`
    this.setData({ [key]: newQty })

    // 更新供应商总金额和邮寄进度
    const group = this.data.supplierGroups[gidx]
    const totalAmount = group.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const shippingPercent = group.freeShippingThreshold > 0 ? Math.min((totalAmount / group.freeShippingThreshold) * 100, 100) : 100
    this.setData({
      [`supplierGroups[${gidx}].totalAmount`]: totalAmount,
      [`supplierGroups[${gidx}].shippingPercent`]: shippingPercent
    })

    // 同步到后端
    this.syncQuantity(gidx, iidx, newQty)

    this.updateSummary()
  },

  syncQuantity(gIdx, iIdx, quantity) {
    const item = this.data.supplierGroups[gIdx].items[iIdx]
    // 后端契约：PUT /cart/update { skuId, quantity }
    api.put('/cart/update', {
      skuId: item.skuId,
      quantity
    }).catch(() => {})
  },

  // 切换管理模式
  toggleManage() {
    this.setData({ isManaging: !this.data.isManaging })
  },

  // 删除选中
  deleteSelected() {
    if (!this.getSelectedCount()) return
    wx.showModal({
      title: '提示',
      content: '确定要删除选中的商品吗？',
      success: (res) => {
        if (!res.confirm) return
        // 收集所有选中项的 skuId，逐项把数量置 0 触发后端删除
        // （后端 updateQuantity 在 quantity<=0 时删除该条目）
        const skuIds = []
        this.data.supplierGroups.forEach(g => {
          g.items.forEach(item => {
            if (item.selected) skuIds.push(item.skuId)
          })
        })
        Promise.all(
          skuIds.map(skuId => api.put('/cart/update', { skuId, quantity: 0 }).catch(() => {}))
        ).then(() => {
          this.loadCart()
        })
      }
    })
  },

  // 去结算
  checkout() {
    if (this.getSelectedCount() === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/subpackages/checkout/pages/checkout/index' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/goods/detail?id=${id}` })
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  }
})
