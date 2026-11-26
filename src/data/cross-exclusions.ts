/**
 * 交叉页渲染前的「体验明显不符」最小剔除名单。
 *
 * 边界（严格遵守）：
 *   - 只影响 /feels/* 交叉页，不写回 games.json，不影响 /tags/* 与详情页；
 *   - 只放体验与页面 feel 冲突的条目：恐怖冒险 Bulb Boy、恐怖解谜 Pony Island；
 *   - Florence（叙事）等其余条目一律保留，不因主观判断剔除；
 *   - 名单不是数据修正，games.json 的 genres 字段保持原样。
 */

export const crossExclusions: Record<string, string[]> = {
  'cozy-puzzle': ['bulb-boy', 'pony-island'],
};
