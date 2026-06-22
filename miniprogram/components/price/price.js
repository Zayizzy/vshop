const { formatPrice } = require('../../utils/money')

/**
 * 金额展示组件。
 * ¥符号与数字分色，可选划线原价。
 * 复用全局 .price / .price-sm / .price-lg / .price-old 样式。
 */
Component({
  properties: {
    value: { type: null, value: 0 },        // 现价（number 或字符串）
    oldValue: { type: null, value: null },  // 原价（划线），为空不显示
    size: { type: String, value: 'md' },    // sm | md | lg
    showSymbol: { type: Boolean, value: true },
  },
  data: {
    priceText: '0.00',
    oldText: '',
  },
  observers: {
    'value, oldValue'() {
      this.setData({
        priceText: formatPrice(this.data.value),
        oldText: this.data.oldValue != null && this.data.oldValue !== ''
          ? formatPrice(this.data.oldValue)
          : '',
      })
    },
  },
  lifetimes: {
    attached() {
      this.setData({
        priceText: formatPrice(this.data.value),
        oldText: this.data.oldValue != null && this.data.oldValue !== ''
          ? formatPrice(this.data.oldValue)
          : '',
      })
    },
  },
})
