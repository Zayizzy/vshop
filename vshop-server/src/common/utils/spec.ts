/**
 * 多规格维度工具。
 *
 * 约定：Sku.specValues 在库内以 JSON 字符串存储（SQLite 不支持标量列表，
 * 沿用 evidenceImages 的存法），形如 [{"name":"颜色","value":"红"},...]。
 * 本模块是 specValues 跨边界的唯一解析/拼装出入口。
 *
 * - parseSpecValues：入库 JSON → 结构化数组（容错）
 * - formatSpecText：结构化数组 → 可读规格文案 "红色 / 500g"（展示/订单快照用）
 * - aggregateSpecs：从一批 sku 聚合推导出维度分组（详情页分组选择用）
 */

export interface SpecValue {
  name: string;
  value: string;
}

/**
 * 解析 specValues JSON 字符串为结构化数组。
 * 容错：空/非法 JSON/非数组 → 返回 []。
 */
export function parseSpecValues(
  raw: string | null | undefined,
): SpecValue[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x) =>
          x && typeof x.name === 'string' && typeof x.value === 'string',
      )
      .map((x) => ({ name: x.name, value: x.value }));
  } catch {
    return [];
  }
}

/**
 * 把 specValues 拼成可读规格文案，如 "红色 / 500g"。
 * specValues 为空 → 回退 fallbackName（兼容旧单规格商品）；都空 → 空串。
 */
export function formatSpecText(
  raw: string | null | undefined,
  fallbackName?: string | null,
): string {
  const specs = parseSpecValues(raw);
  if (specs.length > 0) {
    return specs.map((s) => s.value).join(' / ');
  }
  return fallbackName || '';
}

/**
 * 从一批 sku 的 specValues 聚合推导维度分组，供详情页按维度渲染选择器。
 * 维度顺序按首次出现保持；每维度的值去重并按首次出现排序。
 * 例：两个 sku 分别 [颜色:红,重量:500g] / [颜色:绿,重量:500g]
 *   → [{name:"颜色",values:["红","绿"]},{name:"重量",values:["500g"]}]
 */
export function aggregateSpecs(
  skus: { specValues?: string | null }[],
): { name: string; values: string[] }[] {
  const order: string[] = []; // 维度名首次出现顺序
  const map = new Map<string, string[]>(); // 维度名 → 值集合（保持顺序）

  for (const sku of skus) {
    const specs = parseSpecValues(sku?.specValues);
    for (const s of specs) {
      if (!map.has(s.name)) {
        map.set(s.name, []);
        order.push(s.name);
      }
      const vals = map.get(s.name)!;
      if (!vals.includes(s.value)) vals.push(s.value);
    }
  }

  return order.map((name) => ({ name, values: map.get(name)! }));
}
