/**
 * 金额单位工具。
 *
 * 约定：数据库内一律存「分」(Int)，service 层对外（API 响应/请求体）以「元」(number, 2 位小数) 表达。
 * 此模块是金额跨边界的唯一转换出入口，避免散落的 *100/100 计算和浮点累计误差。
 */

/** 元 → 分。任何前端/外部输入金额转入库前必须经此转换。 */
export function yuanToCent(yuan: number | string | null | undefined): number {
  if (yuan == null || yuan === '') return 0;
  const n = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  if (!Number.isFinite(n)) return 0;
  // 先 round 再取整，规避 0.1+0.2 类浮点
  return Math.round(n * 100);
}

/** 分 → 元（number, 保留两位）。仅在向 API 响应输出时使用。 */
export function centToYuan(cent: number | null | undefined): number {
  if (cent == null) return 0;
  return Math.round(cent) / 100;
}

/** 分 → 元，允许 null 透传（用于 marketPrice 这类可空字段）。 */
export function centToYuanNullable(
  cent: number | null | undefined,
): number | null {
  if (cent == null) return null;
  return Math.round(cent) / 100;
}
