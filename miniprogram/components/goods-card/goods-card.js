/**
 * 商品卡片组件（覆盖首页推荐/分类/搜索/收藏场景）。
 *
 * 接收 item 对象，内部兼容字段别名：
 *   名称 name||title、图片 image||coverImage、已售 sold||sales、
 *   供应商 supplier||supplierName
 *
 * 价格字段（后端契约）：
 *   price         折后价（对外主价）
 *   originalPrice 折前价（划线价，仅当 > price 即有折扣时展示）
 *
 * 点击触发 tap 事件，detail = { id }；页面用 bindtap 取 e.detail.id 跳转。
 * slot="action" 用于收藏页等场景放置操作按钮（取消收藏等）。
 */
const { full: fullImg } = require('../../utils/image')

Component({
  properties: {
    item: { type: Object, value: {} },
    imgHeight: { type: null, value: '280rpx' },  // 图片高度（rpx）
    imgBg: { type: String, value: '#E8F8EE' },
    showSold: { type: Boolean, value: true },
    // 是否展示划线价（折前价）。无折扣商品即便开启也不显示
    showMarketPrice: { type: Boolean, value: true },
  },
  data: {
    resolved: {},
  },
  observers: {
    item(val) {
      this.setData({ resolved: this.resolve(val) })
    },
  },
  lifetimes: {
    attached() {
      this.setData({ resolved: this.resolve(this.data.item) })
    },
  },
  methods: {
    resolve(it) {
      const i = it || {}
      const price = Number(i.price)
      // 划线价取折前价 originalPrice；无折扣（originalPrice 缺失或 ≤ price）时不显示
      const original = i.originalPrice != null ? Number(i.originalPrice) : null
      const hasDiscount = original != null && Number.isFinite(original) && original > price
      return {
        id: i.id,
        name: i.name || i.title || '',
        image: fullImg(i.image || i.coverImage || ''),
        price,
        // 划线价：有折扣时为 originalPrice，否则 null
        oldPrice: hasDiscount ? original : null,
        sold: i.sold != null ? i.sold : (i.sales != null ? i.sales : null),
        tag: i.tag || '',
        desc: i.supplier || i.supplierName || '',
        specName: i.specName || '',
      }
    },
    onTap() {
      this.triggerEvent('tap', { id: this.data.resolved.id })
    },
  },
})
