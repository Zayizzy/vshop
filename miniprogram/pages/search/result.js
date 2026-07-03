const api = require('../../api/index')
const { handleError } = require('../../utils/error')

Page({
  data: {
    keyword: '',
    list: [],
    sort: 'default',
    page: 1,
    hasMore: true
  },
  onLoad(options) {
    if (options.keyword) {
      this.setData({ keyword: options.keyword })
      this.search()
    }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() {
    this.setData({ page: 1, list: [] })
    this.search()
  },
  setSort(e) {
    this.setData({ sort: e.currentTarget.dataset.sort, page: 1, list: [] })
    this.search()
  },
  search() {
    const { keyword, sort, page } = this.data
    if (!keyword) return
    api.goods.search({ keyword, sort, page, pageSize: 10 }).then(data => {
      this.setData({
        list: this.data.list.concat(data.list || []),
        page: page + 1,
        hasMore: data.hasMore
      })
    }).catch((err) => {
      this.setData({ hasMore: false })
      if (page === 1) handleError(err, { defaultMsg: '搜索失败' })
    })
  },
  onReachBottom() {
    if (this.data.hasMore) this.search()
  },
  goDetail(e) {
    const id = e.detail.id != null ? e.detail.id : e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/goods/detail?id=${id}` })
  }
})