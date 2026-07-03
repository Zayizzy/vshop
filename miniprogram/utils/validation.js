/**
 * 通用表单校验工具。
 */

/** 校验手机号（中国大陆） */
export function isPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone))
}

/** 校验非空字符串 */
export function isRequired(value) {
  return value != null && String(value).trim().length > 0
}

/** 校验正整数 */
export function isPositiveInteger(n) {
  const num = Number(n)
  return Number.isInteger(num) && num > 0
}

/**
 * 校验对象必填字段。
 * @param {Object} obj
 * @param {Array<{key:string, name:string, validator?:(v:any)=>boolean}>} rules
 * @returns {string|null} 错误提示或 null
 */
export function validate(obj, rules) {
  for (const rule of rules) {
    const value = obj[rule.key]
    const valid = rule.validator ? rule.validator(value) : isRequired(value)
    if (!valid) {
      return rule.message || `${rule.name || rule.key} 不能为空`
    }
  }
  return null
}
