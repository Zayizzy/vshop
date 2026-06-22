const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: {
    balance: '0.00',
    minAmount: '0.01',
    amount: '',
    canSubmit: false,
    submiting: false,
    inputFocus: false,
    records: [],
    recordsLoaded: false
  },

  onLoad() {
    this.loadBalance()
    this.loadRecords()
  },

  onShow() {
    this.loadBalance()
    this.loadRecords()
  },

  loadBalance() {
    get('/koc/dashboard').then(data => {
      this.setData({
        balance: this.fmtPrice(data.balance),
        minAmount: this.fmtPrice(data.minWithdraw || 0.01)
      })
    }).catch(err => {
      wx.showToast({ title: '加载余额失败', icon: 'none' })
    })
  },

  loadRecords() {
    get('/koc/withdraw', { page: 1, pageSize: 50 }).then(data => {
      const records = (data.list || []).map(item => ({
        ...item,
        amount: this.fmtPrice(item.amount),
        statusText: this.getStatusText(item.status),
        statusClass: this.getStatusClass(item.status)
      }))
      this.setData({ records, recordsLoaded: true })
    }).catch(() => {
      this.setData({ recordsLoaded: true })
    })
  },

  onAmountInput(e) {
    const amount = e.detail.value
    const numAmount = parseFloat(amount)
    const numBalance = parseFloat(this.data.balance)
    const canSubmit = numAmount > 0 && numAmount <= numBalance

    this.setData({ amount, canSubmit })
  },

  withdrawAll() {
    this.setData({
      amount: this.data.balance,
      canSubmit: true,
      inputFocus: true
    })
  },

  submit() {
    const { amount, balance, minAmount } = this.data
    const numAmount = parseFloat(amount)
    const numBalance = parseFloat(balance)
    const numMin = parseFloat(minAmount)

    if (!amount || numAmount <= 0) {
      return wx.showToast({ title: '请输入提现金额', icon: 'none' })
    }
    if (numAmount < numMin) {
      return wx.showToast({ title: `最低提现 ¥${minAmount}`, icon: 'none' })
    }
    if (numAmount > numBalance) {
      return wx.showToast({ title: '超出可提现余额', icon: 'none' })
    }

    this.setData({ submiting: true })

    post('/koc/withdraw', { amount: numAmount }).then(res => {
      wx.showToast({ title: '提现申请已提交', icon: 'success' })
      this.setData({
        amount: '',
        canSubmit: false,
        balance: this.fmtPrice(numBalance - numAmount)
      })
      this.loadRecords()
    }).catch(err => {
      wx.showToast({ title: err.message || '提现失败', icon: 'none' })
    }).finally(() => {
      this.setData({ submiting: false })
    })
  },

  fmtPrice(val) {
    const n = Number(val)
    return isNaN(n) ? '0.00' : n.toFixed(2)
  },

  getStatusText(status) {
    const map = { pending: '处理中', success: '已到账', failed: '失败' }
    return map[status] || status || '处理中'
  },

  getStatusClass(status) {
    const map = { pending: 'pending', success: 'success', failed: 'failed' }
    return map[status] || 'pending'
  }
})
