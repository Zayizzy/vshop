const api = require('../../../../api/index')
const { getNavInfo } = require('../../../../utils/nav')

Page({
  data: {
    statusBarHeight: 20,
    navHeight: 64,
    goodId: '',
    title: '',
    sessionId: '',
    messages: [],
    inputContent: '',
    sending: false,
    loading: true,
    scrollIntoView: '',
    sessionClosed: false
  },

  _pollTimer: null,

  onLoad(options) {
    const nav = getNavInfo()
    this.setData({
      statusBarHeight: nav.statusBarHeight,
      navHeight: nav.navHeight,
      goodId: options.goodId || '',
      title: options.title ? decodeURIComponent(options.title) : ''
    })
    this.initSession()
  },

  onShow() {
    if (this.data.sessionId) this.refresh(true)
    this.startPoll()
  },

  onHide() {
    this.stopPoll()
  },

  onUnload() {
    this.stopPoll()
  },

  initSession() {
    const body = {}
    if (this.data.goodId) body.goodId = this.data.goodId
    if (this.data.title) body.title = this.data.title
    api.post('/support/sessions', body).then((session) => {
      this.setData({ sessionId: session.id, sessionClosed: !!session.closed, loading: false })
      this.refresh(false)
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '连接客服失败', icon: 'none' })
    })
  },

  refresh(silent) {
    if (!this.data.sessionId) return
    api.get('/support/sessions/' + this.data.sessionId + '/messages').then((data) => {
      const msgs = (data.messages || []).map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        time: this.fmtTime(m.createdAt),
        isMine: m.sender === 'user'
      }))
      this.setData({
        messages: msgs,
        sessionClosed: !!(data.session && data.session.closed)
      })
      // 滚到底部
      if (msgs.length) {
        this.setData({ scrollIntoView: 'msg-' + msgs[msgs.length - 1].id })
      }
      // 进入/拉取时标记已读
      api.put('/support/sessions/' + this.data.sessionId + '/read', {}).catch(() => {})
    }).catch(() => {
      if (!silent) wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onInput(e) {
    this.setData({ inputContent: e.detail.value })
  },

  send() {
    const content = (this.data.inputContent || '').trim()
    if (!content || this.data.sending) return
    if (this.data.sessionClosed) {
      wx.showToast({ title: '会话已关闭', icon: 'none' })
      return
    }
    this.setData({ sending: true })
    api.post('/support/sessions/' + this.data.sessionId + '/messages', { content }).then(() => {
      this.setData({ inputContent: '', sending: false })
      this.refresh(true)
    }).catch(() => {
      this.setData({ sending: false })
      wx.showToast({ title: '发送失败', icon: 'none' })
    })
  },

  startPoll() {
    this.stopPoll()
    this._pollTimer = setInterval(() => {
      this.refresh(true)
    }, 5000)
  },

  stopPoll() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  },

  goFaq() {
    wx.navigateTo({ url: '/subpackages/extra/pages/service/index' })
  },

  callService() {
    wx.makePhoneCall({ phoneNumber: '13888888888' })
  },

  goBack() {
    wx.navigateBack()
  },

  fmtTime(t) {
    if (!t) return ''
    const d = new Date(t)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2)
    if (d.toDateString() === now.toDateString()) return hm
    return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + hm
  }
})
