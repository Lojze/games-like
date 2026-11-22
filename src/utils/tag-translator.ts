/**
 * 纯展示层文案工具：把内部 feel tag 翻译成普通人看得懂的自然语言。
 *
 * 这里只做字符串拼接，绝不参与感受标签清洗（clean-tags.ts）或相似度计算
 * （compute-matches.ts）。所有标签都来自 matches.json 的 shared_tags /
 * feel-tags.json，本文件不产生、不修改任何标签。
 *
 * 推荐理由提供 3 套句式模板，由渲染层按列表索引 i % 3 轮换，避免同一批
 * shared_tags 在多个卡片上生成一模一样的句子。用确定性轮换而非随机数，
 * 是为了让静态站点每次 build 的文案一致、可复现。
 */

/** 单个感受标签的三种措辞，供不同句式复用 */
interface TagCopy {
  /** 带冠词的名词短语，可接在 "with ..." / "Expect ..." 之后 */
  phrase: string;
  /** 动词短语，共享主语 "It"，如 "wraps you in ..." */
  clause: string;
  /** 紧凑名词短语，用于 "shares Hades' ..." / "the ... of Hades" */
  noun: string;
}

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
};

/**
 * 理由文案里的短语展示顺序：氛围与叙事靠前，硬核/战斗类靠后。
 * 这样 "atmospheric + punishing + story-rich" 会拼成
 * "氛围 + 剧情... Expect 战斗"，读起来比字母序自然。
 */
const REASON_TAG_ORDER = [
  'atmospheric',
  'story-rich',
  'narrative-choice',
  'emotional',
  'surreal',
  'exploration-driven',
  'relaxing',
  'cute',
  'funny',
  'dark',
  'puzzle-heavy',
  'combat-focused',
  'difficult',
  'punishing',
  'short-session',
];

/** 未知标签兜底：把连字符词形还原成普通词组，避免出现原始 slug */
function humanizeTag(tag: string): string {
  return tag.replace(/-/g, ' ').trim();
}

/** 牛津逗号连接：a / a and b / a, b, and c */
function naturalJoin(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function copyOf(tag: string): TagCopy {
  const fallback = `a ${humanizeTag(tag)} feel`;
  return (
    TAG_COPY[tag] ?? {
      phrase: fallback,
      clause: `leans into ${humanizeTag(tag)}`,
      noun: fallback,
    }
  );
}

function orderTags(tags: readonly string[]): string[] {
  const rank = new Map(REASON_TAG_ORDER.map((tag, index) => [tag, index]));
  return [...tags].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

/** a / an：元音字母开头，或 RPG / FPS / MMO 这类按字母读音的缩写，用 an */
function indefiniteArticle(word: string): string {
  const trimmed = word.trim();
  if (!trimmed) return 'a';
  if (/^[aeiou]/i.test(trimmed)) return 'an';
  if (/^[A-Z]{2,4}$/.test(trimmed) && /^[FHLMNRSX]/.test(trimmed)) return 'an';
  return 'a';
}

/** 类型缺失或写成 "Unknown genre" 之类占位时，回退到不带类型的句式 */
function cleanGenre(genre: string | null): string | null {
  const value = genre?.trim() ?? '';
  if (!value || /^unknown\b/i.test(value)) return null;
  return value;
}

/** 英语所有格：以 s/x/z 结尾的名字只加撇号（Hades' / The Sims'），其余加 's */
function possessive(name: string): string {
  const trimmed = name.trim() || 'this game';
  return /[sxz]$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

/**
 * 生成页面顶部的 Quick Answer：根据「当前游戏」自己的感受标签动态拼接。
 * 最多取 3 个标签，避免句子过长；同时补一句说明，保持 meta description 的信息量。
 */
export function buildQuickAnswer(name: string, feelTags: readonly string[]): string {
  const phrases = feelTags
    .slice(0, 3)
    .map((tag) => TAG_COPY[tag]?.phrase)
    .filter((phrase): phrase is string => Boolean(phrase));

  const opening =
    phrases.length > 0
      ? `If ${name} won you over with ${naturalJoin(phrases)}, these games are well worth your time:`
      : `If you are a fan of ${name}, these games are well worth your time:`;

  return `${opening} each one shares the same kind of feel, and you can jump straight to its Steam page to check the price and player reviews.`;
}

/** 生成推荐理由时所需的上下文（全部来自当前页与被推荐游戏的数据） */
export interface ReasonContext {
  /** 当前页面游戏名，如 "Hades" */
  sourceName: string;
  /** 被推荐游戏的首个核心类型，如 "Action"；缺失为 null */
  genre: string | null;
  /** 在推荐列表中的索引，用于 i % 3 轮换 */
  index: number;
}

const DEFAULT_CONTEXT: ReasonContext = { sourceName: 'this game', genre: null, index: 0 };

interface ReasonParts {
  tags: string[];
  clauses: string[];
  phrases: string[];
  nouns: string[];
}

/**
 * 三套句式骨架。每套都基于同一批 shared_tags 动态生成，任意标签组合都能用；
 * 其中第 2 套融入 genres 字段，第 3 套引用当前页面游戏名。
 * 对 ["atmospheric","punishing","story-rich"] + genre=Action + Hades，效果接近：
 *   0) It wraps you in that same immersive atmosphere and tells a story just as rich. Expect combat that never lets up.
 *   1) As an Action game, it shares Hades' immersive atmosphere and gripping narrative, while keeping the story just as engaging.
 *   2) If you loved the immersive atmosphere and gripping narrative of Hades, this equally immersive experience is right up your alley.
 */
const REASON_TEMPLATES: Array<(parts: ReasonParts, context: ReasonContext) => string> = [
  // 变体 1：描述式主句 + 补一句 Expect，把最具冲击力的标签留到最后
  (parts) => {
    if (parts.clauses.length === 0) {
      return 'It shares a very similar overall feel with this game.';
    }
    if (parts.clauses.length === 1) return `It ${parts.clauses[0]}.`;
    const head = naturalJoin(parts.clauses.slice(0, -1));
    const tail = parts.phrases[parts.phrases.length - 1];
    return `It ${head}. Expect ${tail}.`;
  },

  // 变体 2：以类型开场，和当前游戏做对照（genres 缺失时自动降级）
  (parts, context) => {
    const nouns = naturalJoin(parts.nouns.slice(0, 2));
    const storyLike = parts.tags.some((tag) =>
      ['story-rich', 'narrative-choice', 'emotional'].includes(tag),
    );
    const tail = storyLike
      ? 'while keeping the story just as engaging'
      : 'while keeping the whole experience just as engaging';
    const genre = cleanGenre(context.genre);
    const lead = genre
      ? `As ${indefiniteArticle(genre)} ${genre} game, it shares ${possessive(context.sourceName)} ${nouns}`
      : `Much like ${context.sourceName}, it leans on ${nouns}`;
    return `${lead}, ${tail}.`;
  },

  // 变体 3：条件式，直接呼应玩家对当前游戏的喜爱
  (parts, context) => {
    const nouns = naturalJoin(parts.nouns.slice(0, 2));
    const subject = parts.tags.includes('atmospheric')
      ? 'this equally immersive experience'
      : 'this one';
    return `If you loved the ${nouns} of ${context.sourceName}, ${subject} is right up your alley.`;
  },
];

/**
 * 把一条推荐的 shared_tags 翻成完整的推荐理由，按 index % 3 轮换句式。
 * 兼容旧的单参数调用（context 可省略），此时固定使用第 1 套句式。
 */
export function buildReason(
  sharedTags: readonly string[],
  context: Partial<ReasonContext> = {},
): string {
  const merged: ReasonContext = { ...DEFAULT_CONTEXT, ...context };
  const rawIndex = Number(merged.index);
  const index = Number.isFinite(rawIndex) ? Math.max(0, Math.trunc(rawIndex)) : 0;
  const tags = orderTags(sharedTags.filter(Boolean));
  const parts: ReasonParts = {
    tags,
    clauses: tags.map((tag) => copyOf(tag).clause),
    phrases: tags.map((tag) => copyOf(tag).phrase),
    nouns: tags.map((tag) => copyOf(tag).noun),
  };
  const variant = index % REASON_TEMPLATES.length;

  if (tags.length === 0) {
    const fallbacks = [
      `It shares a very similar overall feel with ${merged.sourceName}.`,
      `Much like ${merged.sourceName}, it hits the same kind of notes.`,
      `If ${merged.sourceName} is your thing, this one belongs on your list.`,
    ];
    return `Why we picked it: ${fallbacks[variant]}`;
  }

  return `Why we picked it: ${REASON_TEMPLATES[variant](parts, { ...merged, index })}`;
}

export interface GameMeta {
  metacritic: number | null;
  rating: number | null;
  released: string | null;
  genres: readonly string[];
}

/**
 * 辅助决策信息，严格按「[评分] · [年份] · [类型]」三段拼接。
 *
 * 评分口径：RAWG 的 rating 是 0–5 分制（如 4.41），metacritic 是 0–100
 * 百分制（如 93）。示例「96 分 · 2018 年 · Action, RPG」属于百分制，
 * 因此主数字用 metacritic；两者都缺失时显示「暂无评分」。
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

export function buildMeta(meta: GameMeta): string {
  return [formatScore(meta), formatYear(meta.released), formatGenres(meta.genres)].join(' · ');
}

/** Badge 的语义类型，决定暗色卡片里的文字/描边配色 */
export type BadgeTone = 'score' | 'year' | 'genre';

export interface MetaBadge {
  text: string;
  tone: BadgeTone;
}

/**
 * 把辅助决策信息拆成三个独立 Badge，供暗黑游戏风卡片分色渲染。
 * 与 buildMeta 共用同一套格式化口径，缺失字段仍走「未知年份 / 未知类型」兜底，
 * 文案长度差异由 CSS 的 nowrap 处理，不会破坏卡片对齐。
 */
export function buildMetaBadges(meta: GameMeta): MetaBadge[] {
  return [
    { text: formatScore(meta), tone: 'score' },
    { text: formatYear(meta.released), tone: 'year' },
    { text: formatGenres(meta.genres), tone: 'genre' },
  ];
}
