Page({
  data: {
    faqList: [
      { q: '下单后多久可以送达？', a: '每日20:00前下单，次日下午送达。超过截单时间的订单将顺延一天配送。' },
      { q: '如何申请售后？', a: '在订单详情页面点击"申请售后"，填写原因并提交，我们会在24小时内处理。' },
      { q: '运费如何计算？', a: '订单满39元免配送费，不满39元收取5元配送费。' },
      { q: '商品质量问题怎么办？', a: '请在收到商品后24小时内联系客服并提供照片，核实后为您办理退款或补发。' },
      { q: '可以指定配送时间吗？', a: '目前仅支持次日达，无法指定具体时段。配送员会在送达前电话联系您。' }
    ],
    showAnswer: -1
  },
  toggleFaq(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ showAnswer: this.data.showAnswer === idx ? -1 : idx })
  },
  callService() {
    wx.makePhoneCall({ phoneNumber: '13888888888' })
  },
  goChat() {
    wx.navigateTo({ url: '/subpackages/extra/pages/chat/index' })
  },
  copyWechat() {
    wx.setClipboardData({ data: 'xiandaijia_kefu' })
    wx.showToast({ title: '微信号已复制', icon: 'success' })
  }
})
