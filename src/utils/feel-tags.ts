/**
 * 卡片「感受标签 chips」的统一选取规则（纯展示层）。
 *
 * 首页 Popular 网格、标签聚合页、游戏详情页推荐列表三个页面都调用本函数，
 * 保证同一款游戏在站内任意位置展示的感受标签完全一致：
 *   1. 先去重，避免 feel-tags.json 里同一标签重复出现；
 *   2. Reddit 验证过的 4 个 trending 词按语料热度优先靠前
 *      （cozy / immersive / satisfying / linear），让新验证的高频词能出现在
 *      卡片第一屏，而不是被游戏已有的 atmospheric / story-rich 挤到后面；
 *   3. 最多取 3 个，避免 chips 撑高卡片、破坏网格对齐。
 *
 * 非 trending 项的 rank 同为 999，Array.prototype.sort 是稳定排序，
 * 因此它们保持 feel-tags.json 里的原始顺序，结果可复现。
 * 本文件只做筛选与排序，不产生、不修改任何标签，也不参与相似度计算。
 */
import { TRENDING_FEELS } from '../../config/trending-feels';

const TRENDING_RANK = new Map<string, number>(
  TRENDING_FEELS.map((tag, index): [string, number] => [tag, index]),
);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * 从 feel-tags.json 中某个 slug 对应的标签数组里，挑出要展示在卡片上的感受标签。
 * 传入未知结构（undefined / null / 非数组）时安全返回空数组，整块 chips 不渲染。
 */
export function pickFeelTags(raw: unknown, limit = 3): string[] {
  return [...new Set(asStringArray(raw))]
    .sort((a, b) => (TRENDING_RANK.get(a) ?? 999) - (TRENDING_RANK.get(b) ?? 999))
    .slice(0, limit);
}
