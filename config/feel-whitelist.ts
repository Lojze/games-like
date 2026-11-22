/**
 * 「游玩感受」标签白名单 —— 全站唯一的感受标签来源（15 个规范词）。
 *
 * 这里严格使用规范化的小写连字符词形，写入 data/feel-tags.json 的也是这些词形。
 * 判定标准是「玩家会不会用它描述『我想要一个什么样的游戏体验』」，
 * 而不是「它是不是情绪词」：所以 story-rich（叙事密度）、difficult（挑战等级）保留，
 * 而 Valve Anti-Cheat enabled / vr mod / Singleplayer / FPS / 1990's 这类
 * 技术、功能、人数、视角与年代标签一律不在其中。
 *
 * 归一化（见 normalizeFeelTag）会把 RAWG 的原始标签统一成同一套词形后再做严格相等比较：
 *   "Atmospheric" / "atmospheric" / "ATMOSPHERIC"  -> "atmospheric"
 *   "Story Rich"  / "story rich"  / "Story-Rich"   -> "story-rich"
 * 注意是严格相等，不是子串匹配，因此 "Dark Fantasy"、"Puzzle-Platformer"
 * 不会误命中 "dark"、"puzzle-heavy"。
 *
 * 原本 20 词，经全量 RAWG 数据空窗诊断后精简为 15 词，删除以下 5 个
 * 在 RAWG 数据源上确无有效供给的维度：
 *   podcast-friendly（无 podcast / audiobook / listen 类标签）、
 *   immersive（只有 Immersive Sim 类型名与视角/硬件词）、
 *   wholesome（只有题材/分级词，无 heartwarm / uplift 类标签）、
 *   tense（只有 Horror / Stealth 等类型词，语义多目标）、
 *   cozy（原始标签仅 1 次，且与 relaxing / cute 语义重叠）。
 * 保留的 punishing 由 config/tag-aliases.ts 的 Souls-like / Perma Death 别名供给。
 *
 * 低频词不在本文件里手工删除：clean-tags.ts 会用 MIN_DF=5 统计全量 df 后，
 * 把出现次数 < 5 的词从「最终词汇表」中移除并逐条打印日志。
 * 这样白名单本身保持完整、可审计，且每次数据更新都能重新判定。
 */

export const FEEL_WHITELIST: string[] = [
  'atmospheric',
  'story-rich',
  'relaxing',
  'dark',
  'funny',
  'cute',
  'difficult',
  'punishing',
  'short-session',
  'exploration-driven',
  'narrative-choice',
  'combat-focused',
  'puzzle-heavy',
  'emotional',
  'surreal',
];

/**
 * 把任意来源的标签归一化成「小写 + 连字符」的规范词形。
 * RAWG 返回的标签大小写与分隔符都不统一（Atmospheric / atmospheric、
 * Story Rich / story-rich），比较前两侧都必须走这一步。
 */
export function normalizeFeelTag(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
