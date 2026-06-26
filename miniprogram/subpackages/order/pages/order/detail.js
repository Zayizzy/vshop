const app = getApp(); function get(url, data) { return app.request({ url, method: 'GET', data }) }; function post(url, data) { return app.request({ url, method: 'POST', data }) }

Page({
  data: { order: {} },
  onLoad(options) {
    get(`/orders/${options.id}`).then(data => {
      data.createdAt = this.formatTime(data.createdAt)
      if (data.payTime) data.payTime = this.formatTime(data.payTime)
      data.packages.forEach(pkg => {
        const colors = { 0:'#999', 1:'#FF6B35', 2:'#FF6B35', 3:'#FF6B35', 4:'#FF6B35', 5:'#07C160' }
        const texts = { 0:'待发货', 1:'已打单', 2:'已发货', 3:'运输中', 4:'派送中', 5:'已签收' }
        const themes = { 0:'default', 1:'warning', 2:'warning', 3:'warning', 4:'warning', 5:'success' }
        pkg.statusColor = colors[pkg.status] || '#999'
        pkg.statusText = texts[pkg.status] || '--'
        pkg.statusTheme = themes[pkg.status] || 'default'
      })
      // 售后申请关联首条明细（订单级入口），退款金额默认取订单实付
      data.applyItemId = (data.items && data.items[0] && data.items[0].id) || ''
      this.setData({ order: data })
    }).catch(() => {
      this.setData({
        order: {
          id: '20240614001',
          orderNo: '20240614001',
          status: 1,
          deliveryDate: '6月16日',
          receiverName: '张三',
          receiverPhone: '138****8888',
          receiverFullAddress: '福建省厦门市思明区软件园二期观日路88号',
          totalAmount: '77.80',
          payAmount: '77.80',
          createdAt: '2024-06-14 18:30',
          packages: [{
            packageIndex: 0,
            supplierName: '鲜果园旗舰店',
            status: 2,
            statusColor: '#FF6B35',
            statusText: '已发货',
            statusTheme: 'warning',
            expressCompany: '顺丰速运',
            expressNo: 'SF1234567890',
            items: [
              { id: 1, goodsImage: '/assets/images/watermelon.png', goodsTitle: '麒麟西瓜 约2.5kg/个', specName: '约2.5kg', price: '29.90', quantity: 1 },
              { id: 2, goodsImage: '/assets/images/strawberry.png', goodsTitle: '丹东草莓 500g盒装', specName: '500g/盒', price: '58.00', quantity: 1 }
            ]
          }, {
            packageIndex: 1,
            supplierName: '绿叶蔬菜直供',
            status: 0,
            statusColor: '#999',
            statusText: '待发货',
            statusTheme: 'default',
            items: [
              { id: 3, goodsImage: '/assets/images/spinach.png', goodsTitle: '有机菠菜 500g', specName: '500g', price: '9.90', quantity: 2 }
            ]
          }]
        }
      })
    })
  },
  formatTime(str) {
    if (!str) return ''
    const d = new Date(str)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
  viewLogistics(e) {
    const { orderId, pkgIdx } = e.currentTarget.dataset
    wx.navigateTo({ url: `/subpackages/order/pages/order/logistics?orderId=${orderId}&packageIndex=${pkgIdx}` })
  },
  applyAfterSale(e) {
    const { orderId, itemId, amount } = e.currentTarget.dataset
    wx.navigateTo({ url: `/subpackages/order/pages/aftersale/apply?orderId=${orderId}&packageIndex=0&orderItemId=${itemId || ''}&amount=${amount || ''}` })
  }
})
