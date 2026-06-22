const { getNavInfo } = require('../../utils/nav')

/**
 * 自定义导航栏组件。
 * 替代各页面重复的 statusBarHeight/navHeight 计算与 wxml。
 * 尺寸来源：utils/nav.getNavInfo（优先读 app.globalData.navInfo 缓存）。
 */
Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    bg: { type: String, value: '#FFFFFF' },
    color: { type: String, value: '#333333' },
  },
  data: {
    statusBarHeight: 20,
    navHeight: 64,
  },
  lifetimes: {
    attached() {
      const info = getNavInfo()
      this.setData({ statusBarHeight: info.statusBarHeight, navHeight: info.navHeight })
    },
  },
  methods: {
    onBack() {
      this.triggerEvent('back')
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.switchTab({ url: '/pages/home/index' })
      }
    },
  },
})
