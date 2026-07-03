const app = getApp()

function get(url, data) { return app.request({ url, data, method: 'GET' }) }
function post(url, data) { return app.request({ url, data, method: 'POST' }) }
function put(url, data) { return app.request({ url, data, method: 'PUT' }) }
function del(url, data) { return app.request({ url, data, method: 'DELETE' }) }

// 业务 API 封装：页面不再直接拼 URL，便于统一维护和 mock
const api = {
  get,
  post,
  put,
  del,

  home: {
    getHome: () => get('/home'),
  },

  goods: {
    getList: (params) => get('/goods/list', params),
    search: (params) => get('/goods/search', params),
    getDetail: (id) => get(`/goods/${id}`),
    collect: (data) => post('/goods/collect', data),
  },

  cart: {
    get: () => get('/cart'),
    count: () => get('/cart/count'),
    add: (data) => post('/cart', data),
    update: (data) => put('/cart/update', data),
    remove: (skuId) => put('/cart/update', { skuId, quantity: 0 }),
  },

  order: {
    getList: (params) => get('/orders', params),
    getDetail: (id) => get(`/orders/${id}`),
    getStats: () => get('/orders/stats'),
    confirm: (orderId) => post('/orders/confirm', { orderId }),
    rebuy: (orderId) => post('/orders/rebuy', { orderId }),
    create: (data) => post('/orders', data),
  },

  payment: {
    unifiedOrder: (orderId) => post('/payment/unified-order', { orderId }),
  },

  coupon: {
    getList: (params) => get('/coupons', params),
    count: () => get('/coupons/count'),
    grant: (data) => post('/coupons/grant', data),
  },

  user: {
    getInfo: () => get('/user/info'),
  },

  address: {
    list: () => get('/addresses'),
    create: (data) => post('/addresses', data),
    update: (id, data) => put(`/addresses/${id}`, data),
    remove: (id) => del(`/addresses/${id}`),
    setDefault: (id) => put(`/addresses/${id}/default`),
  },

  koc: {
    getStatus: () => get('/koc/status'),
    getDashboard: () => get('/koc/dashboard'),
    apply: (data) => post('/koc/apply', data),
    withdraw: (data) => post('/koc/withdraw', data),
  },

  aftersale: {
    create: (data) => post('/aftersales', data),
    list: (params) => get('/aftersales', params),
    detail: (id) => get(`/aftersales/${id}`),
    cancel: (id) => del(`/aftersales/${id}`),
  },

  chat: {
    getSessions: () => get('/chat/sessions'),
    getMessages: (sessionId, params) => get(`/chat/sessions/${sessionId}/messages`, params),
    createSession: (data) => post('/chat/sessions', data),
    sendMessage: (sessionId, data) => post(`/chat/sessions/${sessionId}/messages`, data),
  },

  channel: {
    report: (data) => post('/channel/report', data),
  },
}

module.exports = api
