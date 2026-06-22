Page({
  data: {
    cacheSize: '12.5MB',
    version: 'v1.0.0'
  },
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ cacheSize: '0KB' })
          wx.showToast({ title: '缓存已清除', icon: 'success' })
        }
      }
    })
  },
  showAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '《鲜到家用户服务协议》\n《鲜到家隐私政策》\n\n鲜到家致力于为您提供新鲜优质的果蔬产品，保护您的个人信息安全。',
      showCancel: false
    })
  },
  showAbout() {
    wx.showModal({
      title: '关于鲜到家',
      content: '鲜到家 v1.0.0\n新鲜果蔬，直达您家\n\n产地直采 | 当日下单 | 次日送达',
      showCancel: false
    })
  }
})
