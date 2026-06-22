const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    realName: '',
    phone: '',
    phoneAuto: false,
    socialAccount: '',
    introduction: '',
    agreed: false,
    submiting: false
  },

  onLoad() {
    // 尝试获取微信手机号
    this.getPhoneNumber()
  },

  getPhoneNumber() {
    const app = getApp()
    if (app.globalData && app.globalData.userInfo && app.globalData.userInfo.phone) {
      this.setData({
        phone: app.globalData.userInfo.phone,
        phoneAuto: true
      })
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [field]: e.detail.value })
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  showAgreement() {
    wx.navigateTo({ url: '/pages/webview/index?title=分销合作协议' })
  },

  submit() {
    const { realName, phone, socialAccount, introduction, agreed } = this.data

    if (!realName.trim()) {
      return wx.showToast({ title: '请输入真实姓名', icon: 'none' })
    }
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return wx.showToast({ title: '手机号格式不正确', icon: 'none' })
    }
    if (!agreed) {
      return wx.showToast({ title: '请先阅读并同意协议', icon: 'none' })
    }

    this.setData({ submiting: true })

    post('/koc/register', {
      realName: realName.trim(),
      phone: phone.trim(),
      socialAccount: socialAccount.trim(),
      introduction: introduction.trim()
    }).then(res => {
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: '/subpackages/koc/pages/koc/status/status' })
      }, 1500)
    }).catch(err => {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    }).finally(() => {
      this.setData({ submiting: false })
    })
  }
})
