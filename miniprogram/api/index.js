const app = getApp()

function get(url, data) { return app.request({ url, data, method: 'GET' }) }
function post(url, data) { return app.request({ url, data, method: 'POST' }) }
function put(url, data) { return app.request({ url, data, method: 'PUT' }) }
function del(url, data) { return app.request({ url, data, method: 'DELETE' }) }

module.exports = { get, post, put, del }
