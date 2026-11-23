/**
 * RAWG 原词 -> 感受规范词 的别名映射层。
 *
 * 键必须与 config/feel-whitelist.ts 的 normalizeFeelTag() 输出一致：
 * 小写 + 连字符，例如 `choices-matter`，而不是 "Choices Matter" / "choices matter"。
 *
 * 值支持两种形式（一对多）：
 *   'loot': 'satisfying'         单值：原词被替换为规范词
 *   'cute': ['cute', 'cozy']     数组：原词同时贡献多个规范词
 * 数组里可以保留原词本身（如 'cute'），这样新标签有供给、又不会把已有官方标签抽空。
 * 所有目标值都必须是 FEEL_WHITELIST（19 个规范词）中的一员，clean-tags.ts 启动时会校验。
 *
 * 收录标准：只保留「玩家会用它描述想要一个什么样游玩体验」的同义 / 近义词。
 * 类型、题材、机制、视角、硬件、平台功能与评价词原则上不映射。
 * 2026-11-23 起有两个有意例外（依据 data/reddit-analysis.md 的玩家语料）：
 *   immersive-sim -> immersive     类型名，但语义直接指向「沉浸式体验」
 *   hack-and-slash -> satisfying   机制名，但语料显示玩家用它表达「爽快反馈」
 * 仍刻意不映射的高频技术词：First-Person(102) / Third-Person(99) / VR /
 *   Singleplayer / Multiplayer / Open World / Horror / Walking Simulator 等。
 *   Atmospheric(226) 也不做二次映射：它是 df 最高的官方词，若再贡献给 immersive
 *   会让 immersive 变成超高频标签、稀释 IDF 权重并损害推荐区分度。
 * 特别注意：Puzzle-Platformer 不得误命中 puzzle-heavy，这是刻意设计。
 *
 * 映射发生在「① 小写归一化」之后、「③ 白名单过滤」之前；
 * 不在本表里的词保留原样，随后只保留白名单词。
 * MIN_DF 统计的是映射后的规范词频次：一对多时每个目标各计一次，
 * 但同一游戏内的重复只计 1 次（df = 含该规范词的游戏数）。
 */
export const TAG_ALIASES: Record<string, string | string[]> = {
  // ---- 原有映射（保持不变）----
  exploration: 'exploration-driven',
  explore: 'exploration-driven',
  puzzles: 'puzzle-heavy',
  combat: 'combat-focused',
  'choices-matter': 'narrative-choice',
  'choose-your-own-adventure': 'narrative-choice',
  short: 'short-session',
  'souls-like': 'punishing',
  'perma-death': 'punishing',

  // ---- cozy：保留 relaxing / cute 原有官方标签，额外贡献 cozy ----
  // RAWG 实测 df：relaxing 14、cute 31、family-friendly 26、cozy 原词仅 1
  relaxing: ['relaxing', 'cozy'],
  cute: ['cute', 'cozy'],
  'family-friendly': 'cozy',

  // ---- immersive：只用语义贴合的 immersive-sim（RAWG df=11）----
  // 不复用 Atmospheric(226) / First-Person(102)：前者是最高频官方词，后者是视角技术词
  'immersive-sim': 'immersive',

  // ---- satisfying：刷取与爽快反馈（RAWG df：loot 8、hack-and-slash 26）----
  loot: 'satisfying',
  'hack-and-slash': 'satisfying',

  // ---- linear：RAWG 原生标签 Linear（df=12）----
  // 归一化后已是白名单规范词，本条是显式登记的自映射（no-op）：
  // clean-tags 的严格相等过滤本身就能命中，不经过它会得到完全相同的结果。
  // 写在这里是为了让「Reddit 挖出的 4 个新标签」在配置层都可审计，
  // 也便于将来把表达线性流程的近义原词补进数组（如 on-rails）。
  linear: 'linear',
};
