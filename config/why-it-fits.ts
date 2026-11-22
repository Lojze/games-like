/**
 * "Why it fits" 推荐文案规则引擎 —— 纯离线，不调用任何外部 API。
 *
 * 设计目标：
 * 1. 不罗列标签名，用「资深游戏编辑」的口吻讲体验上的相似性；
 * 2. 每段 25-35 个英文词；
 * 3. 同一详情页的 8 条推荐句式绝不重复。
 *
 * 三层结构：
 *   A. COMBO_TEMPLATES —— 高频 / 用户指定的标签组合，每组建 8 条完整专属句式；
 *   B. SKELETONS       —— 8 条通用句式骨架，供其余 100 多种标签组合使用；
 *   C. TAG_FLAVOR      —— 每个感受标签 4 条「体验名词短语」，注入骨架的 {K} 位，
 *                         让文案按标签组合不同而变化，而不是千篇一律。
 *
 * 同一个页面的第 index 个推荐（index = 0..7）取第 index 套句式，因此
 * 即使 8 条推荐的 shared_tags 完全相同，句式也各不相同。
 *
 * 引用方式（沿用项目既有惯例）：
 *   scripts/*.ts   -> import { generateWhyItFits } from '../config/why-it-fits.ts'
 *   src/**.astro   -> import { generateWhyItFits } from '../../config/why-it-fits'
 */

interface ComboTheme {
  id: string;
  /** 必须全部出现的标签 */
  must: readonly string[];
  /** 至少出现其一的标签（可选） */
  any?: readonly string[];
  /** 8 条完整句式，{A} = 源游戏名，{B} = 被推荐游戏名 */
  templates: readonly string[];
}

/**
 * 组合专属句式，按「越具体越靠前」的顺序匹配。
 * 只覆盖最高频、最需要定制口吻的三种组合；其余交给骨架 + 体验短语。
 */
const COMBO_TEMPLATES: readonly ComboTheme[] = [
  {
    // 真实数据里 combat-focused 与 punishing 几乎不同时出现在 shared_tags 交集，
    // 因此不限定第二个标签，让这组「硬核战斗」话术覆盖全部 combat-focused 推荐。
    id: 'combat',
    must: ['combat-focused'],
    templates: [
      "Looking for the same adrenaline rush? {B} doesn't hold your hand, offering combat just as brutally demanding and precise as what made {A} so gripping.",
      "If the relentless fights in {A} were why you kept coming back, {B} answers with the same punishing rhythm and the same hard-won satisfaction after every encounter.",
      "{B} trades tutorials for bruises, much like {A}: every duel asks you to read the room, commit fully, and earn the right to move forward.",
      "That white-knuckle focus you felt in {A} is exactly the muscle {B} works, pairing sharp combat with a difficulty curve that refuses to apologise for itself.",
      "{A} taught you to treat every encounter as a problem to solve; {B} keeps that lesson, with fights that punish hesitation and reward genuine commitment.",
      "The satisfaction in {A} came from surviving something that felt unfair until it wasn't, and {B} is calibrated to that exact, unforgiving sweet spot.",
      "If you measure a game by how good its hardest fights feel, {B} deserves the same time you gave {A}: demanding, legible, and quietly exhilarating.",
      "{B} shares {A}'s belief that combat should ask something of you, so expect the same tense standoffs and the same relief when your hands finally get it right.",
    ],
  },
  {
    id: 'witty-challenge',
    must: ['difficult', 'funny'],
    templates: [
      "{A} laughed at you while it beat you up, and {B} has that same mischievous streak: genuinely tough, but far too good-humoured to feel cruel.",
      "If you liked that {A} could be brutal and ridiculous in the same breath, {B} keeps the balance, pairing real challenge with a straight-faced wink.",
      "The joy of {A} was failing spectacularly and laughing anyway; {B} protects that feeling, making its difficulty part of the joke rather than the punishment.",
      "{B} shares {A}'s trick of being demanding without being grim, so expect the same hard lessons delivered with a very dry sense of humour.",
      "Few games make a retry feel this funny, but {B} manages the same trick {A} pulled: high stakes, low seriousness, and absolutely no hard feelings.",
      "If {A} proved that a game can be vicious and charming at once, {B} is more evidence, offering stiff challenges wrapped in genuinely playful writing.",
      "You will probably lose a lot in {B}, just as you did in {A}, but both games are smart enough to make losing part of the entertainment.",
      "That combination of teeth and wit in {A} is rare, and {B} has it too: a challenge that respects your patience while quietly refusing to take itself seriously.",
    ],
  },
  {
    id: 'immersive-story',
    must: ['atmospheric', 'story-rich'],
    templates: [
      "If you loved the deep narrative and immersive world of {A}, {B} will pull you into a similarly gripping story, one that lingers long after the credits roll.",
      "{A} earned its place in your memory through mood as much as plot; {B} understands that assignment, building a world you want to inhabit rather than simply finish.",
      "The best parts of {A} were the quiet stretches between revelations, and {B} has that same confidence, letting atmosphere carry a story that rewards your patience.",
      "Fans of {A} who stayed for the world-building will find familiar ground in {B}: dense, unhurried storytelling where every detail seems to be hiding another.",
      "What made {A} stick was never one big twist but the feeling of being somewhere; {B} chases that same sensation with equally patient pacing.",
      "You probably remember {A} as a mood before a plot, which is exactly why {B} should land: it tells its story through light and sound as much as dialogue.",
      "{B} asks for the same unhurried attention {A} did, and pays it back with a narrative that keeps unfolding in the corners rather than announcing itself.",
      "Anyone who finished {A} and immediately wanted more of that world will recognise the welcome in {B}, another slow-burn story built to be absorbed, not rushed.",
    ],
  },
];

/** 8 条通用骨架。{K} 是名词性「体验短语」，由共享标签动态生成 */
const SKELETONS: readonly string[] = [
  "If {K} is what kept {A} in your head, {B} is working the same territory by a different route.",
  "{B} understands the thing {A} got right: {K}, delivered with the kind of quiet confidence that never needs to explain itself to you.",
  "What you probably remember most about {A} is {K}; {B} is built around that very same feeling from its opening minutes onward.",
  "Fans of {A} will recognise {K} in {B} straight away, even though the two go about it in completely different ways.",
  "There is a reason {A} was hard to put down, and {B} is chasing it deliberately: {K}, without any of the usual shortcuts.",
  "{B} picks up the assignment {A} set down, namely {K}, and handles it with a patience that makes it all feel effortless.",
  "If {A} won you over with {K}, expect {B} to feel like coming back to somewhere familiar, just seen from another angle.",
  "The pull of {A} was always {K}, and {B} has it in good measure, which is why this pairing makes so much sense.",
];

/**
 * 标签优先级：越稀有、越能说明「这游戏是什么感觉」的越靠前。
 * 生成 {K} 时同页按 index 轮换标签，避免 8 条推荐都在讲同一个词。
 */
const TAG_PRIORITY: readonly string[] = [
  'puzzle-heavy', 'surreal', 'emotional', 'narrative-choice', 'punishing',
  'short-session', 'relaxing', 'cute', 'funny', 'combat-focused',
  'exploration-driven', 'dark', 'difficult', 'story-rich', 'atmospheric',
];

/** 每个感受标签的 4 条体验名词短语（不能出现标签名本身） */
const TAG_FLAVOR: Record<string, readonly string[]> = {
  'atmospheric': [
    'a world that gets under your skin',
    'mood that lingers after the screen goes dark',
    'a place you can almost smell',
    'an atmosphere quietly doing half the storytelling',
  ],
  'story-rich': [
    'a story worth clearing an evening for',
    'characters you keep thinking about afterwards',
    'narrative that takes its time',
    'writing that trusts you to keep up',
  ],
  'exploration-driven': [
    'the pull of whatever lies past the next ridge',
    'curiosity doing the work of a quest log',
    'spaces genuinely worth getting lost in',
    'the pleasure of ignoring the marker',
  ],
  'punishing': [
    'victories that feel genuinely earned',
    'a difficulty curve that refuses to apologise',
    'the relief that follows a hard-won win',
    'failure that teaches instead of scolds',
  ],
  'difficult': [
    'the satisfaction of finally getting it right',
    'a challenge that respects your patience',
    'steep lessons followed by real payoff',
    'problems that ask you to actually think',
  ],
  'combat-focused': [
    'fights with real weight in the hands',
    'combat tuned down to the timing',
    'encounters that reward total commitment',
    'the rhythm of a well-read duel',
  ],
  'dark': [
    'a slow, lingering sense of dread',
    'shadow and sound doing the work',
    'darkness the game never explains away',
    'tension that never quite releases',
  ],
  'funny': [
    'writing that makes you laugh when it needn\'t',
    'a dry, perfectly timed joke',
    'genuine silliness in the small details',
    'humour tucked into the throwaway lines',
  ],
  'cute': [
    'an unselfconscious warmth',
    'soft edges and small comforts',
    'charm that never feels manufactured',
    'a gentle, disarming tone',
  ],
  'relaxing': [
    'a game content to simply be pleasant',
    'an easy, forgiving pace',
    'the absence of anything demanding',
    'a calm space to spend half an hour',
  ],
  'short-session': [
    'a complete loop in twenty minutes',
    'that just-one-more momentum',
    'no warm-up before the interesting part',
    'sessions that end before they drag',
  ],
  'narrative-choice': [
    'decisions that keep rearranging themselves afterwards',
    'the weight of living with your choices',
    'a story that bends around your judgment',
    'no clean answers and no undo button',
  ],
  'puzzle-heavy': [
    'the click when a tangle of rules makes sense',
    'solutions you arrive at yourself',
    'patient, deliberate thinking',
    'being stumped before being satisfied',
  ],
  'emotional': [
    'a quiet ache that stays with you',
    'characters written like actual people',
    'restraint where spectacle would be easier',
    'feelings the game refuses to undercut',
  ],
  'surreal': [
    'dream logic followed all the way through',
    'images that refuse to sit still',
    'the wonderfully inexplicable',
    'strangeness that turns into delight',
  ],
};

const FALLBACK_FLAVOR: readonly string[] = [
  'a rhythm of tension and release',
  'that hard-to-name pull',
  'a similar temper and pace',
  'the same respect for your attention',
];

/**
 * 编辑式短名：真实编辑写推荐语时不会把一整串版本后缀塞进句子里。
 * 名字超过 7 个词时，依次剥离「 – / — / - / : 」之后的副标题与版本说明，
 * 最多保留 7 个词。卡片标题仍显示完整原名，这里只影响文案中的称呼。
 */
function editorialName(name: string): string {
  const count = (text: string): number => text.trim().split(/\s+/).length;
  const clean = name.trim();
  if (count(clean) <= 7) return clean;
  let out = clean;
  for (const sep of [' – ', ' — ', ' - ', ': ']) {
    if (!out.includes(sep)) continue;
    const head = out.split(sep)[0].trim();
    if (count(head) >= 3 && count(head) < count(out)) out = head;
    if (count(out) <= 7) break;
  }
  if (count(out) > 7) out = out.split(/\s+/).slice(0, 7).join(' ');
  return out;
}

function matchCombo(tags: Set<string>): ComboTheme | undefined {
  return COMBO_TEMPLATES.find(
    (combo) =>
      combo.must.every((tag) => tags.has(tag)) &&
      (!combo.any || combo.any.some((tag) => tags.has(tag))),
  );
}

/** 按共享标签组合挑一条体验短语：同页轮换标签 + 轮换短语 */
function buildFlavor(tags: Set<string>, index: number): string {
  const present = TAG_PRIORITY.filter((tag) => tags.has(tag));
  if (present.length === 0) return FALLBACK_FLAVOR[index % FALLBACK_FLAVOR.length];
  const tag = present[index % present.length];
  const flavors = TAG_FLAVOR[tag] ?? FALLBACK_FLAVOR;
  return flavors[index % flavors.length];
}

/**
 * 返回该推荐使用的句式 ID，供 scripts/generate-reasons.ts 校验
 * 「同一页面 8 条句式不重复」。
 */
export function whyItFitsTemplateId(sharedTags: readonly string[], index = 0): string {
  const tags = new Set(sharedTags);
  const combo = matchCombo(tags);
  const slot = Math.max(0, Math.floor(index));
  return combo
    ? `${combo.id}:${slot % combo.templates.length}`
    : `skeleton:${slot % SKELETONS.length}`;
}

/**
 * 生成一条 25-35 词的英文推荐理由。
 *
 * @param gameA      源游戏名（玩家喜欢的那款）
 * @param gameB      被推荐的游戏名
 * @param sharedTags matches.json 里的 shared_tags
 * @param index      该推荐在同一页面的序号（0..7），决定使用哪套句式
 */
export function generateWhyItFits(
  gameA: string,
  gameB: string,
  sharedTags: readonly string[],
  index = 0,
): string {
  const tags = new Set(sharedTags.filter(Boolean));
  const slot = Math.max(0, Math.floor(index));
  const combo = matchCombo(tags);
  const template = combo
    ? combo.templates[slot % combo.templates.length]
    : SKELETONS[slot % SKELETONS.length];

  return (template ?? SKELETONS[0])
    .replaceAll('{A}', editorialName(gameA) || 'this game')
    .replaceAll('{B}', editorialName(gameB) || 'this one')
    .replaceAll('{K}', buildFlavor(tags, slot))
    .replace(/\s+/g, ' ')
    .trim();
}
