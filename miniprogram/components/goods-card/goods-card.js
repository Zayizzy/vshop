/**
 * 商品卡片组件（覆盖首页推荐/分类/搜索/收藏场景）。
 *
 * 接收 item 对象，内部兼容字段别名：
 *   名称 name||title、图片 image||coverImage、已售 sold||sales、
 *   供应商 supplier||supplierName
 *
 * 价格字段（后端契约）：
 *   price         折后价（对外主价）
 *   marketPrice   市场价/划线价（商家显式设置，优先展示）
 *   originalPrice 折前价（折扣率场景下作为划线价回退）
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
    // 是否展示划线价。无折扣商品即便开启也不显示
    showMarketPrice: { type: Boolean, value: true },
  },
  data: {
    resolved: {},
    // 图片加载失败标记（true 时显示占位，避免空白卡片让整体布局看起来错乱）
    imgError: false,
  },
  observers: {
    item(val) {
      // 切换 item 时重置 imgError，避免上一张图的失败状态残留
      this.setData({ resolved: this.resolve(val), imgError: false })
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
      // 划线价：优先 marketPrice（商家显式设置，有值即展示）；
      // 回退 originalPrice（折扣率场景，须大于折后价才有意义）
      const mkt = i.marketPrice != null ? Number(i.marketPrice) : NaN
      const original = i.originalPrice != null ? Number(i.originalPrice) : NaN
      const linePrice = Number.isFinite(mkt) ? mkt
        : (Number.isFinite(original) && original > price) ? original
        : null
      return {
        id: i.id,
        name: i.name || i.title || '',
        image: fullImg(i.image || i.coverImage || ''),
        price,
        // 划线价：优先 marketPrice，回退 originalPrice
        oldPrice: linePrice,
        sold: i.sold != null ? i.sold : (i.sales != null ? i.sales : null),
        tag: i.tag || '',
        desc: i.supplier || i.supplierName || '',
        specName: i.specName || '',
      }
    },
    onTap() {
      this.triggerEvent('tap', { id: this.data.resolved.id })
    },
    // 图片加载失败（404/网络错误）→ 显示占位，避免空白卡片
    onImgError() {
      this.setData({ imgError: true })
    },
  },
})
