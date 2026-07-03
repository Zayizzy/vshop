/**
 * 金额格式化工具。
 *
 * 约定：后端返回金额为 number（元，如 29.9 / 45 / 0）。
 * 本工具负责把 number 安全地格式化为展示字符串，处理 null/undefined/字符串/0 等边界。
 */

/** 格式化为带两位小数的字符串（不带符号）：29.9 → "29.90" */
function formatPrice(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '0.00'
  return num.toFixed(2)
}

/** 带人民币符号：29.9 → "¥29.90" */
function formatYuan(n) {
  return '¥' + formatPrice(n)
}

/**
 * 计算折后价。
 * @param {number} originalPrice 原价（元）
 * @param {number|null|undefined} discountRate 折扣率 0~1，null/undefined 表示无折扣
 * @returns {number} 折后价（元），保留两位小数精度
 */
function calculatePrice(originalPrice, discountRate) {
  const original = Number(originalPrice) || 0
  if (discountRate == null) return original
  return Math.round(original * discountRate * 100) / 100
}

module.exports = { formatPrice, formatYuan, calculatePrice }
