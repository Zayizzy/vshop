const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: { logistics: { tracks: [] } },
  onLoad(options) {
    get(`/orders/${options.orderId}/packages/${options.packageIndex}/logistics`).then(data => {
      if (data.tracks?.length) {
        data.tracks[0].isLatest = true
      }
      this.setData({ logistics: data })
    })
  },
  copyNo() {
    wx.setClipboardData({ data: this.data.logistics.expressNo })
    wx.showToast({ title: '已复制', icon: 'none' })
  }
})
