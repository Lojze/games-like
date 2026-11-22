/**
 * RAWG 原词 -> 感受规范词 的别名映射层（方案 B）。
 *
 * 键必须与 config/feel-whitelist.ts 的 normalizeFeelTag() 输出一致：
 * 小写 + 连字符，例如 `choices-matter`，而不是 "Choices Matter" / "choices matter"。
 * 值必须是 FEEL_WHITELIST（15 个规范词）中的一员；clean-tags.ts 启动时会校验。
 *
 * 收录标准：只保留「玩家会用它描述想要一个什么样游玩体验」的同义 / 近义词。
 * 类型、题材、机制、视角、硬件、平台功能与评价词一律不映射，例如：
 *   Open World / Horror / Sandbox / Multiple Endings / Puzzle-Platformer /
 *   Immersive Sim / Walking Simulator / First-Person / VR /
 *   Hack and Slash / Turn-Based Combat / Cinematic / Fast-Paced。
 * 特别注意：feel-whitelist.ts 明确要求 Puzzle-Platformer 不得误命中 puzzle-heavy，
 * 这是刻意设计，不因别名层而推翻。
 *
 * 映射发生在「① 小写归一化」之后、「③ 白名单过滤」之前；
 * 不在本表里的词保留原样，随后只保留白名单词。
 * MIN_DF 统计的是映射后的规范词频次：多个 RAWG 原词映射到同一规范词时按游戏累加，
 * 但同一游戏内的重复只计 1 次（df = 含该规范词的游戏数）。
 */
export const TAG_ALIASES: Record<string, string> = {
  // 探索驱动
  exploration: 'exploration-driven',
  explore: 'exploration-driven',

  // 解谜密度
  puzzles: 'puzzle-heavy',

  // 战斗为核心
  combat: 'combat-focused',

  // 叙事选择
  'choices-matter': 'narrative-choice',
  'choose-your-own-adventure': 'narrative-choice',

  // 短时游玩
  short: 'short-session',

  // 高惩罚 / 硬核
  'souls-like': 'punishing',
  'perma-death': 'punishing',
};
