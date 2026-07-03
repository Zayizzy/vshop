const api = require('../../api/index')
const app = getApp()
const { handleError } = require('../../utils/error')

Page({
  data: {
    categories: [],
    activeCategoryId: '',
    promoBanner: null,
    subCategories: [],
    goodsMap: {},
    loading: false
  },

  onLoad() {
    this.loadCategories()
  },

  loadCategories() {
    api.home.getHome().then(data => {
      const cats = (data && data.categories) || []
      this.setData({ categories: cats })
      if (cats[0]) {
        this.switchCategory({ currentTarget: { dataset: { id: cats[0].id } } })
      } else {
        this.setData({ loading: false })
      }
    }).catch((err) => {
      this.setData({ loading: false })
      handleError(err, { defaultMsg: '分类加载失败' })
    })
  },

  switchCategory(e) {
    const catId = e.currentTarget.dataset.id
    this.setData({ activeCategoryId: catId, loading: true, subCategories: [], goodsMap: {} })

    // admin 子分类接口前缀为 /api/admin（无 v1 前缀），需用完整 URL 绕过 apiBase 的 /v1 拼接。
    // host 从 apiBase 去掉末尾 /v1 得到。
    const host = app.globalData.apiBase.replace(/\/v1\/?$/, '')
    Promise.all([
      app.request({ url: `${host}/api/admin/subcategories`, method: 'GET', data: { categoryId: catId } }).catch((err) => { handleError(err, { silent: true }); return [] }),
      api.goods.getList({ categoryId: catId, pageSize: 50 }).catch((err) => { handleError(err, { silent: true }); return { list: [] } })
    ]).then(([subs, goodsData]) => {
      const subList = Array.isArray(subs) ? subs : (subs && subs.data) || []
      const goodsList = (goodsData && goodsData.list) || []

      // 按子分类分组
      const goodsMap = {}
      goodsList.forEach(g => {
        const subId = g.subCategoryId || ''
        if (!goodsMap[subId]) goodsMap[subId] = []
        goodsMap[subId].push({
          id: g.id,
          name: g.name,
          price: Number(g.price) || 0,
          originalPrice: g.originalPrice != null ? Number(g.originalPrice) : null,
          image: g.image || g.coverImage || '',
          bgColor: this.getColor(subList.findIndex(s => s.id === subId))
        })
      })
      this.setData({ subCategories: subList, goodsMap, loading: false })
    }).catch((err) => {
      this.setData({ loading: false })
      handleError(err, { defaultMsg: '商品加载失败' })
    })
  },

  getColor(idx) {
    const colors = ['#E8F8EE', '#FFF3E0', '#FCE4EC', '#E3F2FD', '#F3E5F5', '#FFFDE7', '#EDE7F6', '#FFEBEE']
    return colors[idx % colors.length]
  },

  goDetail(e) {
    const id = e.detail.id != null ? e.detail.id : e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/goods/detail?id=${id}` })
  }
})
