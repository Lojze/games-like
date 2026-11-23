/**
 * 纯展示层文案工具：把内部 feel tag 与游戏元数据翻译成自然语言。
 *
 * 这里只做字符串拼接，绝不参与感受标签清洗（clean-tags.ts）或相似度计算
 * （compute-matches.ts）。所有标签都来自 feel-tags.json / matches.json，
 * 本文件不产生、不修改任何标签。
 *
 * 当前对外提供两组能力：
 *   - buildQuickAnswer：详情页 Hero / meta description 用的「一句话回答」；
 *   - buildMetaBadges：卡片里的评分 / 年份 / 类型三枚 Badge。
 * 推荐理由文案已统一由 config/why-it-fits.ts + data/reasons.json 负责，
 * 本文件不再生成推荐理由（旧的 buildReason / buildMeta 已移除）。
 */

/** 单个感受标签的自然语言措辞 */
interface TagCopy {
  /** 带冠词的名词短语，用于 "won you over with ..." */
  phrase: string;
  /** 动词短语（保留供将来扩展句式复用） */
  clause: string;
  /** 紧凑名词短语（保留供将来扩展句式复用） */
  noun: string;
}

/**
 * 覆盖 config/feel-whitelist.ts 的全部 19 个规范词。
 * phrase 是 Quick Answer 的实际消费字段；clause / noun 作为同一词条的备用
 * 措辞保留，未来要加新句式时无需重新逐条编写。
 */
const TAG_COPY: Record<string, TagCopy> = {
  atmospheric: {
    phrase: 'a rich, immersive atmosphere',
    clause: 'wraps you in that same immersive atmosphere',
    noun: 'immersive atmosphere',
  },
  'story-rich': {
    phrase: 'a gripping, story-driven narrative',
    clause: 'tells a story just as rich',
    noun: 'gripping narrative',
  },
  punishing: {
    phrase: 'combat that never lets up',
    clause: 'keeps the combat brutally demanding',
    noun: 'demanding combat',
  },
  difficult: {
    phrase: 'a genuinely tough challenge',
    clause: 'puts up a real challenge',
    noun: 'tough, uncompromising challenge',
  },
  relaxing: {
    phrase: 'a calm, low-pressure pace',
    clause: 'keeps things calm and low-pressure',
    noun: 'calm, low-pressure pace',
  },
  dark: {
    phrase: 'a genuinely dark tone',
    clause: 'leans into a genuinely dark tone',
    noun: 'genuinely dark tone',
  },
  funny: {
    phrase: 'a sharp sense of humor',
    clause: 'brings the same sharp sense of humor',
    noun: 'sharp sense of humor',
  },
  cute: {
    phrase: 'a charming, cute look',
    clause: 'has that same charming, cute look',
    noun: 'charming, cute visuals',
  },
  'short-session': {
    phrase: 'sessions that fit into a coffee break',
    clause: 'works perfectly in short bursts',
    noun: 'bite-sized sessions',
  },
  'exploration-driven': {
    phrase: 'a world that rewards exploration',
    clause: 'rewards you for exploring every corner',
    noun: 'world-building that rewards exploration',
  },
  'narrative-choice': {
    phrase: 'choices that actually shape the story',
    clause: 'lets your choices shape the story',
    noun: 'choices that shape the story',
  },
  'combat-focused': {
    phrase: 'combat at the center of it all',
    clause: 'puts combat front and center',
    noun: 'combat-first design',
  },
  'puzzle-heavy': {
    phrase: 'puzzles that really make you think',
    clause: 'is full of puzzles worth solving',
    noun: 'puzzles worth solving',
  },
  emotional: {
    phrase: 'a story that stays with you',
    clause: 'knows how to land an emotional punch',
    noun: 'emotional storytelling',
  },
  surreal: {
    phrase: 'a wonderfully surreal world',
    clause: 'builds a wonderfully surreal world',
    noun: 'wonderfully surreal world-building',
  },
  // 2026-11-23 依据 Reddit 玩家语料新纳入的 4 个维度
  cozy: {
    phrase: 'a warm, low-pressure coziness',
    clause: 'settles into that same warm, easygoing comfort',
    noun: 'warm, easygoing comfort',
  },
  immersive: {
    phrase: 'a world that pulls you right in',
    clause: 'pulls you just as deep into its world',
    noun: 'deeply immersive world',
  },
  satisfying: {
    phrase: 'feedback that makes every move feel earned',
    clause: 'makes every small victory feel just as rewarding',
    noun: 'crisp, rewarding feedback',
  },
  linear: {
    phrase: 'a tightly paced, focused path',
    clause: 'keeps the pace tight and focused',
    noun: 'focused, tightly paced structure',
  },
};

/** 未知标签兜底：把连字符词形还原成普通词组，避免出现原始 slug */
function humanizeTag(tag: string): string {
  return tag.replace(/-/g, ' ').trim();
}

/**
 * 未登记词的兜底短语。先剥掉词尾自带的 feel，避免
 * "brand-new-feel" 这类词拼出 "a brand new feel feel"。
 */
function fallbackPhrase(tag: string): string {
  const words = humanizeTag(tag).replace(/\s*feel$/i, '').trim() || humanizeTag(tag);
  return `a ${words} feel`;
}

/** 牛津逗号连接：a / a and b / a, b, and c */
function naturalJoin(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * 生成页面顶部的 Quick Answer：根据「当前游戏」自己的感受标签动态拼接。
 * 最多取 3 个标签，避免句子过长；同时补一句说明，保持 meta description 的信息量。
 *
 * 每个标签都保证产出短语：TAG_COPY 未登记时用 humanizeTag 现场拼一个
 * 「a <tag> feel」。这样即使将来白名单新增词而忘了补文案，也不会退回
 * 完全没有感受信息的通用句（旧实现用 filter 丢掉未命中项，前 3 个标签
 * 全是新词时会静默退化）。
 */
export function buildQuickAnswer(name: string, feelTags: readonly string[]): string {
  const phrases = feelTags
    .slice(0, 3)
    .map((tag) => TAG_COPY[tag]?.phrase ?? fallbackPhrase(tag));

  const opening =
    phrases.length > 0
      ? `If ${name} won you over with ${naturalJoin(phrases)}, these games are well worth your time:`
      : `If you are a fan of ${name}, these games are well worth your time:`;

  return `${opening} each one shares the same kind of feel, and you can jump straight to its Steam page to check the price and player reviews.`;
}

export interface GameMeta {
  metacritic: number | null;
  rating: number | null;
  released: string | null;
  genres: readonly string[];
}

/**
 * 辅助决策信息的格式化口径。
 *
 * 评分：RAWG 的 rating 是 0–5 分制（如 4.41），metacritic 是 0–100
 * 百分制（如 93）。主数字用 metacritic；两者都缺失时显示「暂无评分」。
 * 若只想显示 0–5 的 rating，把 SCORE_MODE 改成 'rating' 即可，无需改调用方。
 */
const SCORE_MODE: 'metacritic' | 'rating' = 'metacritic';

function formatScore(meta: GameMeta): string {
  const metacritic = typeof meta.metacritic === 'number' && meta.metacritic > 0 ? meta.metacritic : null;
  const rating = typeof meta.rating === 'number' && meta.rating > 0 ? meta.rating : null;

  if (SCORE_MODE === 'rating') {
    return rating !== null ? `${rating.toFixed(1)}/5` : '暂无评分';
  }
  if (metacritic !== null) return `${metacritic} 分`;
  if (rating !== null) return `${rating.toFixed(1)}/5`;
  return '暂无评分';
}

function formatYear(released: string | null): string {
  const year = released?.trim().slice(0, 4) ?? '';
  return /^\d{4}$/.test(year) ? `${year} 年` : '未知年份';
}

function formatGenres(genres: readonly string[]): string {
  const picked = genres
    .map((genre) => genre?.trim())
    .filter((genre): genre is string => Boolean(genre))
    .slice(0, 2);
  return picked.length > 0 ? picked.join(', ') : '未知类型';
}

/** Badge 的语义类型，决定暗色卡片里的文字/描边配色 */
export type BadgeTone = 'score' | 'year' | 'genre';

export interface MetaBadge {
  text: string;
  tone: BadgeTone;
}

/**
 * 把辅助决策信息拆成三个独立 Badge，供暗黑游戏风卡片分色渲染。
 * 与 formatScore / formatYear / formatGenres 共用同一套格式化口径，
 * 缺失字段仍走「暂无评分 / 未知年份 / 未知类型」兜底，
 * 文案长度差异由 CSS 的 nowrap 处理，不会破坏卡片对齐。
 */
export function buildMetaBadges(meta: GameMeta): MetaBadge[] {
  return [
    { text: formatScore(meta), tone: 'score' },
    { text: formatYear(meta.released), tone: 'year' },
    { text: formatGenres(meta.genres), tone: 'genre' },
  ];
}
