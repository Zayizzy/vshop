const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    status: '',
    orderId: '',
    resultText: '',
    resultIcon: '',
    resultDesc: '',
    showPayBtn: false
  },
  onLoad(options) {
    const orderId = options.orderId
    this.setData({ orderId })
    if (options.needPay === 'true') {
      this.setData({ status: 'pending', showPayBtn: true })
      this.requestPay(orderId)
    } else if (options.status === 'success') {
      this.setData({ status: 'success', resultText: '支付成功', resultIcon: '✅', resultDesc: '感谢您的购买，我们将尽快为您发货' })
    } else {
      this.setData({ status: 'fail', resultText: '支付失败', resultIcon: '❌', resultDesc: '请稍后重试或更换支付方式' })
    }
  },
  requestPay(orderId) {
    return post('/payment/unified-order', { orderId }).then(data => {
      // mock 模式：后端已直接置为已支付，跳过 wx.requestPayment
      if (data.mock) {
        this.setData({ status: 'success', showPayBtn: false, resultText: '支付成功', resultIcon: '✅', resultDesc: '感谢您的购买，我们将尽快为您发货' })
        return Promise.resolve()
      }
      return new Promise((resolve) => {
        wx.requestPayment({
          timeStamp: data.paymentParams.timeStamp,
          nonceStr: data.paymentParams.nonceStr,
          package: data.paymentParams.package,
          signType: data.paymentParams.signType,
          paySign: data.paymentParams.paySign,
          success: () => {
            this.setData({ status: 'success', showPayBtn: false, resultText: '支付成功', resultIcon: '✅', resultDesc: '感谢您的购买，我们将尽快为您发货' })
          },
          fail: (err) => {
            if (err.errMsg.includes('cancel')) {
              wx.showToast({ title: '已取消支付', icon: 'none' })
            } else {
              this.setData({ status: 'fail', showPayBtn: true, resultText: '支付失败', resultIcon: '❌', resultDesc: '请稍后重试或更换支付方式' })
            }
          },
          complete: resolve
        })
      })
    })
  },
  goOrder() {
    // 跳到刚支付订单的详情页（subpackage 页，redirectTo 可用）。
    // 注意：不能用 /pages/order/list，它是 tabBar 页，redirectTo/navigateTo 均无法跳转。
    wx.redirectTo({ url: `/subpackages/order/pages/order/detail?id=${this.data.orderId}` })
  },
  goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  },
  retryPay() {
    if (this._paying) return
    this._paying = true
    this.requestPay(this.data.orderId).finally(() => {
      this._paying = false
    })
  }
})
