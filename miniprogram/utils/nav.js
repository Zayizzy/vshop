/**
 * 导航栏尺寸工具。
 *
 * 替代各页面重复调用已废弃的 wx.getSystemInfoSync()。
 * 用 wx.getWindowInfo() 取状态栏高度，导航栏高度 = 状态栏 + 44px（与原实现一致）。
 * 首次调用缓存到 app.globalData.navInfo，避免重复计算。
 */

function getNavInfo() {
  const app = getApp()
  if (app && app.globalData && app.globalData.navInfo) {
    return app.globalData.navInfo
  }
  let statusBarHeight = 20
  try {
    // wx.getWindowInfo 基础库 2.20.1+ 支持，回退到 getSystemInfoSync
    if (wx.getWindowInfo) {
      statusBarHeight = wx.getWindowInfo().statusBarHeight || 20
    } else {
      statusBarHeight = wx.getSystemInfoSync().statusBarHeight || 20
    }
  } catch (e) {
    statusBarHeight = 20
  }
  const navInfo = {
    statusBarHeight,
    navHeight: statusBarHeight + 44,
  }
  if (app && app.globalData) {
    app.globalData.navInfo = navInfo
  }
  return navInfo
}

module.exports = { getNavInfo }
