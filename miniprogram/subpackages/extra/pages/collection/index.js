const api = require('../../../../api/index')

Page({
  data: {
    list: [],
    loading: true
  },
  onLoad() {
    this.loadList()
  },
  // TODO: 后端暂无收藏列表接口 /goods/favorites，补齐后此处自动生效
  loadList() {
    api.get('/goods/favorites').then(data => {
      this.setData({ loading: false, list: (data && data.list) || [] })
    }).catch(() => {
      this.setData({ loading: false, list: [] })
    })
  },
  goDetail(e) {
    const id = e.detail.id != null ? e.detail.id : e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/goods/detail?id=${id}` })
  },
  uncollect(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏吗？',
      success: (res) => {
        if (res.confirm) {
          // 后端 toggle 收藏接口：{ goodId, isCollected:false }
          api.post('/goods/collect', { goodId: id, isCollected: false }).then(() => {
            const list = this.data.list.filter(item => item.id !== id)
            this.setData({ list })
            wx.showToast({ title: '已取消收藏', icon: 'success' })
          }).catch(() => {
            wx.showToast({ title: '操作失败', icon: 'none' })
          })
        }
      }
    })
  }
})
