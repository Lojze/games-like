/**
 * 「游玩感受」标签白名单 —— 全站唯一的感受标签来源（19 个规范词）。
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
 * 历史：原本 20 词，经全量 RAWG 数据空窗诊断后精简为 15 词，删除
 *   podcast-friendly / immersive / wholesome / tense / cozy 这 5 个
 *   「在 RAWG 原始数据上确无有效供给」的维度。
 *
 * 2026-11-23 依据 Reddit 真实玩家讨论分析（见 data/reddit-analysis.md）重新纳入 3 词：
 *   cozy       语料 40 次 / 27 帖，但 RAWG 原词 cozy 仅 1 次
 *   immersive  语料 22 次 / 16 帖，RAWG 原词 immersive 为 0 次
 *   satisfying 语料 21 次 / 16 帖，RAWG 原词 satisfying 为 0 次
 * 这三词本身没有 RAWG 供给，全部由 config/tag-aliases.ts 的一对多别名层供给；
 * 仍删除的 podcast-friendly / wholesome / tense 在 Reddit 语料里也只有 0 / 1 / 2 次，
 * 属于「玩家不表达 + RAWG 无供给」的双低维度，暂不恢复。
 * 保留的 punishing 由 Souls-like / Perma Death 别名供给。
 *
 * 2026-11-23 追加 linear（第 19 词）：Reddit 语料 16 次 / 10 帖，且 RAWG 原词
 *   Linear 真实存在（df=12），是四个新词里唯一有 RAWG 原生供给的维度，
 *   归一化后即规范词，走白名单严格相等命中，不依赖别名层。
 *   注意玩家语料多为 "no linear story" 这类排除性表达，作为正向标签的语义
 *   需要结合推荐结果持续观察，因此不参与任何自动扩词。
 *
 * 15 + 3 + 1 = 19 词；刻意保留 1 个空位，不为凑满 20 词引入低质维度。
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
  // 2026-11-23 依据 Reddit 玩家讨论重新纳入（供给来自 tag-aliases.ts）
  'cozy',
  'immersive',
  'satisfying',
  // 2026-11-23：RAWG 原生标签 Linear（df=12）直接命中，无需别名即可供给
  'linear',
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
