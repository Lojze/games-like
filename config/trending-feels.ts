/**
 * 「玩家高频感受标签」—— 首页置顶展示与卡片高亮的唯一数据源。
 *
 * 来源是 2026-11-23 对 r/gamingsuggestions 1000 帖真实玩家讨论的词频分析
 * （脚本 scripts/analyze-reddit.ts，报告 data/reddit-analysis.md）：
 *   cozy        40 次 / 27 帖
 *   immersive   22 次 / 16 帖
 *   satisfying  21 次 / 16 帖
 *   linear      16 次 / 10 帖
 * 这四个词都已纳入 config/feel-whitelist.ts，且 df 均 >= 5。
 *
 * 顺序即首页 Browse by feel 的置顶顺序（按语料热度降序）。
 * 本文件只影响展示层排序与配色，绝不参与标签清洗或相似度计算。
 */
export const TRENDING_FEELS: string[] = [
  'cozy',
  'immersive',
  'satisfying',
  'linear',
];
