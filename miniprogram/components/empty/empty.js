/**
 * 空状态组件。
 * 支持 icon、description 与 action slot（如"去逛逛"按钮）。
 */
Component({
  properties: {
    icon: { type: String, value: 'empty' },        // emoji 或图标名
    description: { type: String, value: '暂无数据' },
  },
})
