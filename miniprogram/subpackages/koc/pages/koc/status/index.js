const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    loaded: false,
    status: -1, // -1=未申请, 0=审核中, 1=已通过, 2=已驳回
    reason: ''
  },

  onShow() {
    this.loadStatus()
  },

  loadStatus() {
    this.setData({ loaded: false })
    get('/koc/status').then(data => {
      this.setData({
        loaded: true,
        status: data.status != null ? data.status : -1,
        reason: data.reason || ''
      })
    }).catch(() => {
      this.setData({ loaded: true, status: -1 })
    })
  },

  goDashboard() {
    wx.redirectTo({ url: '/subpackages/koc/pages/koc/dashboard/dashboard' })
  },

  reapply() {
    wx.redirectTo({ url: '/subpackages/koc/pages/koc/register/register' })
  },

  goRegister() {
    wx.navigateTo({ url: '/subpackages/koc/pages/koc/register/register' })
  }
})
