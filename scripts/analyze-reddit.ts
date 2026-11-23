/**
 * Reddit 真实玩家讨论 -> 「感受标签」隐藏需求词挖掘（独立分析工具）
 *
 * 本脚本**不属于构建管道**：只读 config/feel-whitelist.ts 拿现有 15 个标签，
 * 不写 games.json / feel-tags.json / matches.json，不参与 astro build，
 * 也不会把任何新词写回标签体系。产物仅供人工审阅。
 *
 * 运行：
 *   node scripts/analyze-reddit.ts                  # 抓取 1000 帖 + 分析 + 出报告
 *   node scripts/analyze-reddit.ts --skip-fetch    # 复用已有语料，只重跑分析/报告
 *   PROXY_URL=http://127.0.0.1:7897 node scripts/analyze-reddit.ts   # 需要代理时
 *
 * 产物：
 *   data/reddit_raw.json       [{ id, text }] 清洗前的原始语料（标题 + 正文）
 *   data/reddit-analysis.md    Top 50 + 专项提取 + 白名单对比 + 补充建议
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { FEEL_WHITELIST, normalizeFeelTag } from '../config/feel-whitelist.ts';

// ---------------------------------------------------------------- 配置
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_ENDPOINT = 'https://arctic-shift.photon-reddit.com/api/posts/search';
const SUBREDDIT = 'gamingsuggestions';
const PAGE_SIZE = 100;
const TARGET_POSTS = 1000;
const REQUEST_DELAY_MS = 1000;
const MAX_PAGES = 20;
const TOP_N = 50;
const SPECIAL_N = 20;

const RAW_PATH = resolve(ROOT, 'data/reddit_raw.json');
const REPORT_PATH = resolve(ROOT, 'data/reddit-analysis.md');

const PROXY_URL = process.env.PROXY_URL?.trim() ?? '';
const agent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;
const SKIP_FETCH = process.argv.includes('--skip-fetch');

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  created_utc: number;
}
interface RawRecord {
  id: string;
  text: string;
}
type TermKind = 'word' | 'phrase' | 'x-like';
interface TermStat {
  term: string;
  count: number;
  docs: number;
  kind: TermKind;
}

// ---------------------------------------------------------------- 词表
/** 通用英语功能词：介词、代词、连词、助动词、常见副词 */
const STOP_WORDS = new Set(`
a about above after again against all am an and any are as at be because been before being
below between both but by can could did do does doing down during each few for from further
had has have having he her here hers herself him himself his how i if in into is it its
itself let me more most must my myself no nor not of off on once only or other ought our
ours ourselves out over own same she should so some such than that the their theirs them
themselves then there these they this those through to too under until up very was we were
what when where which while who whom why with would you your yours yourself yourselves
m s t re ve ll d im ive dont cant wont isnt didnt doesnt hasnt havent wasnt arent thats
theres heres youre theyre id ill also just really quite bit lot tons much many else even
still yet ever never always maybe probably definitely honestly basically actually exactly
kinda sorta pretty rather almost nearly enough however though although per via etc
every everybody everything everyone already different less able real final mostly
especially specifically ideally necessarily interested interesting based going loved
appreciated money city easy specific various numerous previous serious massive expensive
available suitable reasonable comfortable technical physical political critical general
natural personal original official possible impossible terrible horrible decent solid
random certain current common regular normal standard typical average entire whole main
major minor single actual exact total free full local modern multiple either neither
whether without within upon onto besides meanwhile instead otherwise regardless
`.trim().split(/\s+/));

/** 本 subreddit 的语境通用词：高频但对「感受维度」没有区分度 */
const DOMAIN_STOP = new Set(`
game games gaming gamer gamers play playing played plays player players
recommend recommended recommendation recommendations suggest suggested suggestion
suggestions looking look looks find found want wanted wants need needs needing prefer
preferred preference preferably enjoy enjoyed enjoying like likes liked similar similarly
anything something someone anyone everybody nothing everything thing things stuff
tried try trying get got getting give gave given make made making take took taken
know known think thought say said tell told ask asked asking help helped keep kept
start started stop use used using year years time times day days hour hours minute minutes
people guys guy thanks thank please hi hey hello edit tldr tl dr op sub subreddit reddit
post posts thread threads list lists few several bunch couple number genre genres title
update note spoiler spoilers buy buying bought purchase purchased own owned completed
finish finished beat beating currently recently anymore nowadays basically literally
removed deleted automoderator moderator mods mod imo imho fyi aka
fantasy scifi sci-fi shooter platformer metroidvania roguelike roguelite simulator
survival strategy crafting building quests quest sidequests mmorpg dungeon dungeons
`.trim().split(/\s+/));

/** 简易游戏专有名词 / 平台 / 类型缩写排除表（用户指定的 Hades / Zelda / Steam / PC / PS5 等） */
const PROPER_NOUNS = new Set(`
hades zelda steam pc pcs ps5 ps4 ps3 ps2 xbox switch nintendo playstation sega valve
epic gog itch vr gpu cpu windows mac linux android ios steamdeck gamepass psplus
elden skyrim witcher minecraft stardew terraria baldur bg3 mario pokemon sonic doom
genshin honkai cyberpunk fallout celeste silksong warframe destiny persona nier
fromsoftware bethesda ubisoft blizzard capcom bandai square enix atlus sekiro bloodborne
valley ring hollow outer wilds stardew-valley elden-ring dark-souls
rpg rpgs fps mmo mmorpg jrpg arpg crpg dnd wow lol ffxiv mtg gta
souls eldenring darksouls
`.trim().split(/\s+/));

/** 已知感受/描述形容词种子（用于识别描述词与短语首词，不是白名单） */
const FEEL_ADJECTIVES = new Set(`
atmospheric story-rich relaxing dark funny cute difficult punishing short-session
exploration-driven narrative-choice combat-focused puzzle-heavy emotional surreal
cozy cozyish wholesome immersive tense challenging satisfying grindy replayable linear
nonlinear open-ended casual chill nostalgic creepy scary spooky peaceful calm slow fast
intense brutal forgiving complex deep shallow simple intricate rich colorful colourful
beautiful gorgeous stylized pixel pixelated retro minimalist realistic gritty bleak grim
cheerful heartwarming uplifting hilarious witty quirky weird bizarre strange mysterious
eerie unsettling haunting dreamy psychedelic trippy philosophical mind-bending touching
depressing melancholic addictive engaging captivating absorbing repetitive tedious
boring frustrating rewarding strategic tactical fast-paced slow-paced turn-based
action-packed story-driven character-driven choice-driven open-world comedic absurd
satirical grounded grand intimate personal magical whimsical adorable charming crunchy
smooth polished janky clunky accessible hardcore unforgiving beginner-friendly meditative
ambient rhythmic musical thoughtful relaxing open light-hearted lighthearted story-light
story-heavy cozy-ish mindless braindead brain-dead punishing forgiving grind-free mindless
relaxing atmospheric vibrant moody atmospheric wholesome charming delightful enjoyable
fun addictive stress-free low-stakes high-stakes slow-burn thought-provoking
`.trim().split(/\s+/));

/** 非感受类的常见形容词：后缀合法但对标签挖掘没有价值 */
const ADJ_NOISE = new Set(`
specific various numerous previous serious massive expensive available suitable
reasonable comfortable technical physical political critical general natural personal
original official possible impossible terrible horrible decent solid random certain
current common regular normal standard typical average entire whole main major minor
single actual exact total free full local modern multiple several either neither
basic simple basic mechanical digital virtual visual audio mobile online offline
`.trim().split(/\s+/));

/**
 * 高频但「泛化 / 结构性」的词：会出现在 Top 50，但不适合直接当感受标签。
 * 例如 open 主要来自 open world（结构），fun/simple/deep 是通用评价词。
 * 行动建议里据此降权，保留在主榜里只作为事实呈现。
 */
const GENERIC_TERMS = new Set(`
open fun deep simple boring weird realistic competitive tactical turn-based classic
narrative endless powerful retro playable pixel curious strange graphic survive isometric
beautiful rich library mechanic grounded grand slow fast complex open-world graphic
good great best nice solid decent amazing awesome cool fine okay open-worlds
`.trim().split(/\s+/));

/** 明确负面且玩家不会主动索取的体验词，不进入行动建议 */
const NEGATIVE_TERMS = new Set(`
boring repetitive tedious frustrating janky clunky broken grindy
`.trim().split(/\s+/));

/** 体验维度名词：单独统计成「载体名词」专项榜，不占用 Top 50 描述词名额 */
const EXPERIENCE_NOUNS = new Set(`
story stories world worlds combat gameplay mechanics mechanic vibes vibe atmosphere
immersion pacing progression difficulty challenge challenges narrative choices choice
exploration graphics art artwork music soundtrack tone mood feel experience replayability
grind loop systems characters character dialogue lore ending endings stakes tension
humor horror mystery puzzle puzzles sandbox freedom agency customization build builds
loot setting aesthetics visuals writing quest quests sidequests boss bosses fight fights
battles relaxation escapism nostalgia creativity discovery payoff depth complexity
characters
`.trim().split(/\s+/));

/** 描述性短语的第二词（体验载体），避免生成 "black white" 之类的噪音组合 */
const PHRASE_NOUNS = new Set([
  ...EXPERIENCE_NOUNS,
  'game', 'games', 'rpg', 'roguelike', 'soulslike',
]);

/** 常见动词变形：避免把 -ing/-ed 的动词误判成形容词 */
const GENERIC_VERBS = new Set(`
look looking looked want wanted wanting play playing played recommend recommending
recommended find finding found try trying tried get getting got make making made
take taking took give giving gave use using used need needing needed start starting
started stop stopping stopped keep keeping kept run running ran work working worked
wait waiting waited think thinking buy buying bought say saying said tell telling told
ask asking asked help helping helped read reading watch watching seem seeming
finish finishing finished complete completing completed beat beating
`.trim().split(/\s+/));

/** 名词 -> 更适合作为标签的形容词形式（仅用于行动建议） */
const TAG_FORM: Record<string, string> = {
  immersion: 'immersive',
  atmosphere: 'atmospheric',
  replayability: 'replayable',
  grind: 'grindy',
  challenge: 'challenging',
  challenges: 'challenging',
  nostalgia: 'nostalgic',
  tension: 'tense',
  humor: 'funny',
  mystery: 'mysterious',
  freedom: 'open-ended',
  agency: 'choice-driven',
  exploration: 'exploration-driven',
  story: 'story-rich',
  combat: 'combat-focused',
  puzzles: 'puzzle-heavy',
  vibes: 'atmospheric',
  relaxation: 'relaxing',
  creativity: 'creative',
  difficulty: 'challenging',
  complexity: 'complex',
  open: 'open-ended',
  // 口语同义词：更适合作为已有标签的 alias，而不是新增标签
  chill: 'relaxing',
};

/** 白名单精简历史中被删除的 5 个词（见 config/feel-whitelist.ts 头部注释） */
const PREVIOUSLY_REMOVED = new Set([
  'podcast-friendly', 'immersive', 'wholesome', 'tense', 'cozy',
]);

/** 高频候选的维度解读，用于让建议理由具体而非模板化 */
const CANDIDATE_NOTES: Record<string, string> = {
  cozy: '低压力、温暖治愈的游玩节奏，玩家直接用来描述「想要的状态」；与 relaxing 重叠但更偏氛围与情绪',
  cozyish: 'cozy 的口语变体，进一步印证低压力氛围是高频诉求',
  immersive: '世界代入感与沉浸度，跨类型的核心诉求，不隶属于任何现有 15 词',
  wholesome: '温暖正向的情绪基调，与 dark / punishing 形成互补的情绪极',
  tense: '持续紧张压迫感，属于节奏张力维度，与 punishing（难度惩罚）不是一回事',
  grindy: '重复劳动与刷取强度，衡量「时间投入成本」，现有白名单完全缺失',
  grind: '重复劳动与刷取强度，衡量「时间投入成本」，现有白名单完全缺失',
  replayable: '可重复游玩价值，与 short-session（单次时长）正交',
  replayability: '可重复游玩价值，与 short-session（单次时长）正交',
  linear: '流程开放度（线性 vs 开放），玩家高频用来自述偏好',
  open: '流程/世界开放度，常与 world 组成 open world',
  casual: '轻量、低门槛、可随时放下，与 difficult / punishing 互补',
  chill: '低强度放松向，口语化程度高，是 relaxing 的高频同义表达',
  challenging: '有挑战但不惩罚，介于 difficult 与 relaxing 之间的独立诉求',
  nostalgic: '怀旧情绪与年代质感，属于情绪色彩维度',
  satisfying: '操作反馈与完成感，偏手感/系统正反馈',
  atmospheric: '氛围感，已是白名单词，说明该方法能召回已知维度',
  deep: '系统/叙事深度，高频修饰词，可单列或并入 complex',
  relaxing: '放松向，已是白名单词，说明该方法能召回已知维度',
  mindless: '无需动脑、可放空的轻松体验，与 combat-focused / puzzle-heavy 互补',
  addictive: '强正反馈带来的持续投入感，属于节奏/黏性维度',
  engaging: '持续吸引注意力，属于参与度维度',
  repetitive: '重复感（负面），是 grindy 的近义信号',
  story: '叙事密度，高频载体词，可评估是否由 story-rich 覆盖',
  world: '世界构建与探索空间，常与 open / immersion 共现',
  feel: '玩家口语中指代整体手感/氛围，是感受诉求的信号词',
  vibes: '玩家口语中直接指代整体氛围，是 atmospheric / cozy 的高频信号词',
  open_world: '世界开放度，属结构性偏好，是否纳入「感受」标签需人工判断',
  nostalgia: '怀旧情绪，对应标签形式 nostalgic',
  immersion: '沉浸感，高频载体词，对应标签形式 immersive',
  meaningful: '选择与叙事是否有分量，偏意义感，比 story-rich 更强调「决策的后果」',
  rewarding: '付出后的正反馈强度，与 punishing 同属「投入—回报」维度但方向相反',
};

// ---------------------------------------------------------------- 阶段一：抓取
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function requestJson(url: URL): Promise<{ data?: unknown }> {
  return new Promise((resolvePromise, reject) => {
    const req = https.get(
      url,
      {
        agent,
        headers: {
          Accept: 'application/json',
          // 强制 identity：避免 Node 23 的 undici/zstd 兼容问题
          'Accept-Encoding': 'identity',
          'User-Agent': 'games-like-reddit-analysis/1.0 (non-commercial research)',
        },
        timeout: 20000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { buf += chunk; });
        res.on('error', reject);
        res.on('end', () => {
          try {
            resolvePromise(JSON.parse(buf) as { data?: unknown });
          } catch {
            reject(new Error('响应不是合法 JSON'));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('请求超时')));
    req.on('error', reject);
  });
}

async function fetchPage(before?: number): Promise<RedditPost[]> {
  const url = new URL(API_ENDPOINT);
  url.searchParams.set('subreddit', SUBREDDIT);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('sort', 'desc');
  if (before !== undefined) url.searchParams.set('before', String(before));

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const body = await requestJson(url);
      if (!Array.isArray(body.data)) throw new Error('响应缺少 data 数组');
      return body.data as RedditPost[];
    } catch (err) {
      if (attempt === 3) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ! 第 ${attempt} 次请求失败（${msg}），${REQUEST_DELAY_MS * attempt}ms 后重试`);
      await sleep(REQUEST_DELAY_MS * attempt);
    }
  }
  throw new Error('unreachable');
}

function isUsableSelftext(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t) return false;
  return !/^\[\s*(removed|deleted)\b/i.test(t);
}

function toRecord(post: RedditPost): RawRecord | null {
  const title = typeof post.title === 'string' ? post.title.trim() : '';
  const body = isUsableSelftext(post.selftext) ? post.selftext.trim() : '';
  if (!title || !body || typeof post.id !== 'string') return null;
  return { id: post.id, text: `${title}\n${body}` };
}

interface FetchSummary {
  records: RawRecord[];
  fetched: number;
  pages: number;
  newestUtc: number;
  oldestUtc: number;
}

async function fetchAll(): Promise<FetchSummary> {
  const seen = new Set<string>();
  const records: RawRecord[] = [];
  let before: number | undefined;
  let fetched = 0;
  let pages = 0;
  let newestUtc = 0;
  let oldestUtc = Number.POSITIVE_INFINITY;

  console.log(`阶段一 · 抓取 r/${SUBREDDIT}：目标 ${TARGET_POSTS} 帖，每页 ${PAGE_SIZE}，间隔 ${REQUEST_DELAY_MS}ms`);
  console.log(`网络：${PROXY_URL ? `代理 ${PROXY_URL}` : '直连（未设置 PROXY_URL）'}`);

  while (fetched < TARGET_POSTS && pages < MAX_PAGES) {
    // 「每次请求之间」固定延迟 1000ms（首页之前不需要等待）
    if (pages > 0) await sleep(REQUEST_DELAY_MS);

    const posts = await fetchPage(before);
    pages++;
    if (posts.length === 0) {
      console.log('  ! 返回空页，分页结束');
      break;
    }

    fetched += posts.length;
    for (const post of posts) {
      if (Number.isFinite(post.created_utc)) {
        newestUtc = Math.max(newestUtc, post.created_utc);
        oldestUtc = Math.min(oldestUtc, post.created_utc);
      }
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      const record = toRecord(post);
      if (record) records.push(record);
    }

    const minUtc = Math.min(...posts.map((p) => p.created_utc).filter(Number.isFinite));
    console.log(`  第 ${String(pages).padStart(2)} 页：${posts.length} 帖 | 累计抓取 ${fetched} | 有效 ${records.length} | 游标 before=${minUtc}`);

    // 游标没有推进就停止，防止同一批数据无限循环
    if (!Number.isFinite(minUtc) || (before !== undefined && minUtc >= before)) {
      console.log('  ! before 游标未推进，分页结束');
      break;
    }
    before = minUtc;
    if (posts.length < PAGE_SIZE) {
      console.log('  已到可用数据末尾，分页结束');
      break;
    }
  }

  return { records, fetched, pages, newestUtc, oldestUtc };
}

// ---------------------------------------------------------------- 阶段二：词频分析
function cleanText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isContentToken(t: string): boolean {
  return t.length >= 3 && t.length <= 20
    && /[a-z]/.test(t)
    && !/^\d+$/.test(t)
    && !STOP_WORDS.has(t)
    && !DOMAIN_STOP.has(t)
    && !PROPER_NOUNS.has(t);
}

/**
 * 描述词判定：种子表 + 严格形容词后缀。
 * 刻意不用 -y / -ing / -ed / -al：这四类会把 every / going / loved / survival
 * 这类通用词大量误判为形容词（第一版报告就是这么被污染的）。
 */
const STRICT_ADJ_SUFFIX = /(?:ous|ful|less|ive|able|ible|ish|ical|istic|ic|ary)$/;
function isDescriptor(t: string): boolean {
  if (FEEL_ADJECTIVES.has(t)) return true;
  const stem = t.replace(/-/g, '');
  if (stem.length < 6 || stem.length > 18) return false;
  if (ADJ_NOISE.has(t) || GENERIC_VERBS.has(t) || GENERIC_VERBS.has(stem)) return false;
  return STRICT_ADJ_SUFFIX.test(t);
}

interface Usage {
  count: number;
  docs: number;
}
interface AnalysisResult {
  top: TermStat[];
  nounTop: TermStat[];
  xlikeTop: TermStat[];
  candidateCount: number;
  tokenCount: number;
  whitelistUsage: Map<string, Usage>;
  removedUsage: Map<string, Usage>;
}

function analyze(records: RawRecord[]): AnalysisResult {
  const freq = new Map<string, TermStat>();
  const nounFreq = new Map<string, TermStat>();
  const whitelistUsage = new Map<string, Usage>();
  for (const tag of FEEL_WHITELIST) whitelistUsage.set(tag, { count: 0, docs: 0 });
  const removedUsage = new Map<string, Usage>();
  for (const tag of PREVIOUSLY_REMOVED) removedUsage.set(tag, { count: 0, docs: 0 });

  const whitelistSet = new Set(FEEL_WHITELIST);
  const removedSet = new Set(PREVIOUSLY_REMOVED);
  let tokenCount = 0;

  for (const record of records) {
    const cleaned = cleanText(record.text);
    const tokens = cleaned.split(' ').map((t) => t.replace(/^-+|-+$/g, '')).filter(Boolean);
    tokenCount += tokens.length;
    const seenTerms = new Set<string>();
    const seenNouns = new Set<string>();
    const seenTags = new Set<string>();
    const seenRemoved = new Set<string>();

    const bump = (target: Map<string, TermStat>, term: string, kind: TermKind, seen: Set<string>) => {
      const key = term.toLowerCase();
      let stat = target.get(key);
      if (!stat) {
        stat = { term: key, count: 0, docs: 0, kind };
        target.set(key, stat);
      }
      stat.count++;
      if (!seen.has(key)) {
        stat.docs++;
        seen.add(key);
      }
    };
    const bumpUsage = (map: Map<string, Usage>, tag: string, seen: Set<string>) => {
      const usage = map.get(tag);
      if (!usage) return;
      usage.count++;
      if (!seen.has(tag)) {
        usage.docs++;
        seen.add(tag);
      }
    };

    // (1) X-like 组合词：souls-like / zelda-like / stardew-like ...
    for (const match of cleaned.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*)-like\b/g)) {
      bump(freq, `${match[1]}-like`, 'x-like', seenTerms);
    }

    // (2) 描述性短语 + 白名单的空格写法（story rich -> story-rich）
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];
      if (!isContentToken(a) || !isContentToken(b)) continue;
      const hyphenated = `${a}-${b}`;
      const isWhitelistPhrase = whitelistSet.has(hyphenated);
      const isDescriptorNoun = isDescriptor(a) && PHRASE_NOUNS.has(b);
      const isNounDescriptor = EXPERIENCE_NOUNS.has(a) && isDescriptor(b);
      if (isWhitelistPhrase || isDescriptorNoun || isNounDescriptor) {
        bump(freq, `${a} ${b}`, 'phrase', seenTerms);
      }
      if (isWhitelistPhrase) bumpUsage(whitelistUsage, hyphenated, seenTags);
      if (removedSet.has(hyphenated)) bumpUsage(removedUsage, hyphenated, seenRemoved);
    }

    // (3) 主榜 unigram：只收描述词；体验载体名词走独立专项榜
    for (const token of tokens) {
      if (!isContentToken(token)) continue;
      const normalized = normalizeFeelTag(token);
      if (whitelistSet.has(normalized)) bumpUsage(whitelistUsage, normalized, seenTags);
      if (removedSet.has(normalized)) bumpUsage(removedUsage, normalized, seenRemoved);
      if (EXPERIENCE_NOUNS.has(token)) {
        bump(nounFreq, token, 'word', seenNouns);
      }
      if (isDescriptor(token)) bump(freq, token, 'word', seenTerms);
    }
  }

  const byCount = (a: TermStat, b: TermStat) =>
    b.count - a.count || b.docs - a.docs || a.term.localeCompare(b.term);
  const allTerms = [...freq.values()].sort(byCount);
  const top = allTerms.filter((t) => t.count >= 2).slice(0, TOP_N);
  const xlikeTop = allTerms.filter((t) => t.kind === 'x-like').slice(0, SPECIAL_N);
  const nounTop = [...nounFreq.values()].sort(byCount).slice(0, SPECIAL_N);

  return {
    top,
    nounTop,
    xlikeTop,
    candidateCount: freq.size,
    tokenCount,
    whitelistUsage,
    removedUsage,
  };
}

// ---------------------------------------------------------------- 阶段三：对比报告
function matchWhitelist(term: string): string[] {
  const norm = normalizeFeelTag(term);
  return FEEL_WHITELIST.filter((tag) => {
    if (norm === tag) return true;
    return new RegExp(`(?:^|-)${tag}(?:-|$)`).test(norm);
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 例句中跳过明显不适合放进报告的内容 */
const UNSAFE_CONTEXT = /\b(horny|nsfw|porn|nude|naked|sexual|erotic|hentai|fetish|rape|gore|suicide)\b/i;

/** 从真实语料里抽一条包含该词的上下文，尽量让每条建议引用不同帖子 */
function exampleFor(term: string, records: RawRecord[], used: Set<string>): string {
  const pattern = term.split(' ').map(escapeRegExp).join('[-\\s]+');
  const re = new RegExp(`\\b${pattern}\\b`, 'i');
  let fallback = '';
  for (const record of records) {
    const flat = cleanText(record.text).replace(/-/g, ' ').replace(/\s+/g, ' ');
    const match = re.exec(flat);
    if (!match) continue;
    const start = Math.max(0, match.index - 55);
    const excerpt = flat.slice(start, start + 175).trim();
    if (UNSAFE_CONTEXT.test(excerpt)) continue;
    const decorated = `${start > 0 ? '…' : ''}${excerpt}${start + 175 < flat.length ? '…' : ''}`;
    if (!fallback) fallback = decorated;
    if (used.has(record.id)) continue;
    used.add(record.id);
    return decorated;
  }
  return fallback || '（语料中未抽到上下文）';
}

function noteFor(term: string): string {
  const key = term.replace(/\s+/g, '_');
  return CANDIDATE_NOTES[term] ?? CANDIDATE_NOTES[key]
    ?? '玩家自发高频使用的描述词，当前 15 词白名单未覆盖该维度；建议先核对 RAWG 标签供给再决定是否纳入。';
}

function labelFor(term: string): string {
  const single = term.includes(' ') ? term.split(' ')[0] : term;
  return TAG_FORM[single] ?? normalizeFeelTag(single);
}

/**
 * 「感受价值分」：行动建议不按纯词频排，否则 open / fun / simple 这类
 * 泛评价词会一直霸榜。频次与覆盖帖数给基础分，明确的感受形容词、
 * 曾在白名单精简中被删的维度额外加权，短语略降权。
 */
function feelScore(t: TermStat): number {
  const first = t.term.split(' ')[0];
  let score = Math.min(t.count, 60) + Math.min(t.docs, 30) * 0.5;
  if (FEEL_ADJECTIVES.has(first)) score += 40;
  if (PREVIOUSLY_REMOVED.has(labelFor(t.term))) score += 30;
  if (t.kind === 'phrase') score -= 10;
  return score;
}

function buildReport(
  summary: FetchSummary,
  analysis: AnalysisResult,
  records: RawRecord[],
): string {
  const { top, nounTop, xlikeTop, whitelistUsage, removedUsage, candidateCount, tokenCount } = analysis;
  const hitTerms = top.filter((t) => matchWhitelist(t.term).length > 0);
  const missingTerms = top.filter((t) => matchWhitelist(t.term).length === 0);

  const highValue = missingTerms
    .filter((t) => {
      if (t.kind === 'x-like' || t.count < 5) return false;
      const first = t.term.split(' ')[0];
      if (GENERIC_TERMS.has(first) || NEGATIVE_TERMS.has(first)) return false;
      // 只是现有标签的口语变体（如 chill -> relaxing），补 alias 即可，不算新标签
      if (FEEL_WHITELIST.includes(labelFor(t.term))) return false;
      return FEEL_ADJECTIVES.has(first) || isDescriptor(first) || t.kind === 'phrase';
    })
    .sort((a, b) => feelScore(b) - feelScore(a));

  // 优先挑能直接转成标签的单词，再补描述性短语
  const usedExamples = new Set<string>();
  const suggestions = [
    ...highValue.filter((t) => t.kind === 'word'),
    ...highValue.filter((t) => t.kind === 'phrase'),
  ].slice(0, 5);

  const iso = (utc: number) => Number.isFinite(utc)
    ? new Date(utc * 1000).toISOString().slice(0, 10)
    : '—';

  const lines: string[] = [];
  lines.push('# Reddit 玩家讨论 · 隐藏感受需求词分析');
  lines.push('');
  lines.push(`> 生成时间：${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`);
  lines.push(`> 数据源：Arctic Shift API \`/api/posts/search\`，r/${SUBREDDIT}，` +
    `\`limit=${PAGE_SIZE}\` · \`sort=desc\` · \`before\` 游标分页 · 每次请求间隔 ${REQUEST_DELAY_MS}ms`);
  lines.push('> 性质：只读分析。未修改任何核心管道代码，未写回标签体系。');
  lines.push('');
  lines.push('## 数据概览');
  lines.push('');
  lines.push('| 指标 | 值 |');
  lines.push('| --- | --- |');
  lines.push(`| 请求页数 | ${summary.pages || '（复用语料）'} |`);
  lines.push(`| 抓取原始帖子 | ${summary.fetched} |`);
  lines.push(`| 有效语料（正文非空且非 [removed]/[deleted]） | ${records.length} |`);
  lines.push(`| 过滤掉 | ${summary.fetched - records.length} |`);
  lines.push(`| 语料时间跨度 | ${iso(summary.oldestUtc)} ~ ${iso(summary.newestUtc)} |`);
  lines.push(`| 清洗后 token 数 | ${tokenCount} |`);
  lines.push(`| 描述性候选词/短语总数 | ${candidateCount} |`);
  lines.push('');
  lines.push('## 一、Top 50 高频描述词');
  lines.push('');
  lines.push('`count` = 语料中出现的总次数；`docs` = 出现在多少个不同帖子里（更能反映普遍性）。');
  lines.push('主榜只收**描述词与描述性短语**（体验载体名词、X-like 见第二、三节专项榜），并过滤只出现 1 次的长尾词。');
  lines.push('类型：`word` 单词 / `phrase` 描述性短语 / `x-like` X-like 组合词。');
  lines.push('');
  lines.push('| # | 词 / 短语 | count | docs | 类型 | 白名单 |');
  lines.push('| ---: | --- | ---: | ---: | --- | --- |');
  top.forEach((t, i) => {
    const hits = matchWhitelist(t.term);
    const status = hits.length ? `✅ ${hits.join(', ')}` : '—';
    lines.push(`| ${i + 1} | \`${t.term}\` | ${t.count} | ${t.docs} | ${t.kind} | ${status} |`);
  });
  lines.push('');
  lines.push('## 二、专项提取：X-like 组合词');
  lines.push('');
  lines.push('玩家常用「某游戏-like」直接表达想要的整体体验，这是白名单体系最容易漏掉的表达形式。');
  lines.push('');
  if (xlikeTop.length) {
    lines.push('| # | 组合词 | count | docs | 指向 |');
    lines.push('| ---: | --- | ---: | ---: | --- |');
    xlikeTop.forEach((t, i) => {
      const base = t.term.replace(/-like$/, '');
      const kind = PROPER_NOUNS.has(base) ? '游戏专名（参照系）' : '玩法/体验类比';
      lines.push(`| ${i + 1} | \`${t.term}\` | ${t.count} | ${t.docs} | ${kind} |`);
    });
  } else {
    lines.push('本批语料未出现连字符写法的 X-like 组合词。');
  }
  lines.push('');
  lines.push('## 三、专项提取：高频体验载体名词');
  lines.push('');
  lines.push('这些不是标签，但能说明玩家最常从哪些维度描述需求（Open world / story / combat 等），可用于判断标签覆盖面。');
  lines.push('');
  lines.push('| # | 载体词 | count | docs | | # | 载体词 | count | docs |');
  lines.push('| ---: | --- | ---: | ---: | --- | ---: | --- | ---: | ---: |');
  const half = Math.ceil(nounTop.length / 2);
  for (let i = 0; i < half; i++) {
    const a = nounTop[i];
    const b = nounTop[i + half];
    const right = b ? `| ${i + half + 1} | \`${b.term}\` | ${b.count} | ${b.docs} |` : '| | | | |';
    lines.push(`| ${i + 1} | \`${a.term}\` | ${a.count} | ${a.docs} | ${right}`);
  }
  lines.push('');
  lines.push('## 四、白名单命中与缺失对比');
  lines.push('');
  lines.push(`现有 15 个感受标签：${FEEL_WHITELIST.map((t) => `\`${t}\``).join('、')}`);
  lines.push('');
  lines.push('### 4.1 Top 50 中已命中白名单');
  lines.push('');
  if (hitTerms.length) {
    lines.push('| 词 / 短语 | count | 命中的白名单词 |');
    lines.push('| --- | ---: | --- |');
    hitTerms.forEach((t) => {
      lines.push(`| \`${t.term}\` | ${t.count} | ${matchWhitelist(t.term).map((h) => `\`${h}\``).join(', ')} |`);
    });
  } else {
    lines.push('Top 50 中没有直接命中；见 4.2 的白名单词独立频次统计。');
  }
  lines.push('');
  lines.push('### 4.2 白名单词在语料中的独立频次');
  lines.push('');
  lines.push('（同时统计连字符写法与空格写法，例如 `story-rich` 与 `story rich`）');
  lines.push('');
  lines.push('| 白名单词 | count | docs | 是否进 Top 50 |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const tag of FEEL_WHITELIST) {
    const usage = whitelistUsage.get(tag) ?? { count: 0, docs: 0 };
    const inTop = hitTerms.some((t) => matchWhitelist(t.term).includes(tag));
    lines.push(`| \`${tag}\` | ${usage.count} | ${usage.docs} | ${inTop ? '✅' : '—'} |`);
  }
  lines.push('');
  lines.push('### 4.3 缺失但极有「感受」价值');
  lines.push('');
  lines.push('筛选规则：不在 15 词白名单内、出现 ≥ 5 次、属于感受形容词 / 严格形容词形态 / 描述性短语；' +
    '已排除泛评价词、纯负面词、以及只是现有标签口语变体的词。按「感受价值分」排序。');
  lines.push('');
  if (highValue.length) {
    lines.push('| 词 / 短语 | count | docs | 类型 |');
    lines.push('| --- | ---: | ---: | --- |');
    highValue.slice(0, 20).forEach((t) => {
      lines.push(`| \`${t.term}\` | ${t.count} | ${t.docs} | ${t.kind} |`);
    });
    if (highValue.length > 20) lines.push(`\n> 另有 ${highValue.length - 20} 个候选未列出。`);
  } else {
    lines.push('本批语料中未筛出足够高频的缺失词。');
  }
  lines.push('');
  lines.push('### 4.4 Top 50 中的其余缺失项（高频但不建议直接做标签）');
  lines.push('');
  lines.push('以下词虽高频，但因泛化 / 结构性 / 纯负面 / 只是现有标签的口语变体，未进入行动建议：');
  lines.push('');
  lines.push(missingTerms
    .filter((t) => !highValue.includes(t))
    .map((t) => `\`${t.term}\`(${t.count})`)
    .join('、') || '无');
  lines.push('');
  lines.push('## 五、行动建议：最值得补充的标签');
  lines.push('');
  lines.push('> 以下仅为**建议**，脚本不会写入 `config/feel-whitelist.ts`。是否纳入标签体系需人工确认。');
  lines.push('');
  if (suggestions.length < 3) {
    lines.push('本批语料未产生足够支撑的建议（不足 3 个），建议扩大样本或放宽阈值后复核。');
  } else {
    suggestions.forEach((t, i) => {
      const label = labelFor(t.term);
      const removed = PREVIOUSLY_REMOVED.has(label);
      lines.push(`### ${i + 1}. \`${t.term}\` → 建议标签 \`${label}\``);
      lines.push('');
      lines.push(`- **语料证据**：出现 ${t.count} 次，覆盖 ${t.docs} 个帖子（Top 50 第 ${top.indexOf(t) + 1} 位）。`);
      lines.push(`- **维度理由**：${noteFor(t.term)}`);
      lines.push(`- **玩家原话**：「${exampleFor(t.term, records, usedExamples)}」`);
      if (removed) {
        lines.push('- **⚠️ 历史注意**：该词曾在白名单从 20 → 15 的精简中被删除（原因是 RAWG 数据源无有效供给）。' +
          '若重新纳入，需同步在 `config/tag-aliases.ts` 补映射，并重新跑 `clean:tags` 验证 df ≥ 5，否则会再次变成空窗标签。');
      } else {
        lines.push('- **落地前置**：先确认 RAWG 原始标签或 aliases 能提供有效供给，再跑 `clean:tags` / `compute:matches` 验证。');
      }
      lines.push('');
    });
  }
  lines.push('### 附：白名单精简时被删除的 5 个词在本批语料中的表现');
  lines.push('');
  lines.push('（来自 `config/feel-whitelist.ts` 头部注释：当初因 RAWG 数据源无有效供给而从 20 词精简为 15 词）');
  lines.push('');
  lines.push('| 词 | count | docs | 本批语料中的判断 |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const tag of PREVIOUSLY_REMOVED) {
    const u = removedUsage.get(tag) ?? { count: 0, docs: 0 };
    const verdict = u.count >= 15
      ? '玩家高频使用，值得重新评估'
      : u.count >= 5
        ? '有真实需求，但需补数据源供给'
        : '本批语料几乎不出现，删除合理';
    lines.push(`| \`${tag}\` | ${u.count} | ${u.docs} | ${verdict} |`);
  }
  lines.push('');
  lines.push('## 六、方法与局限');
  lines.push('');
  lines.push('- 清洗：统一小写 → 去 URL / markdown 链接 → 去标点（保留连字符）→ 空白归一。');
  lines.push(`- 三层过滤：通用停用词 ${STOP_WORDS.size} 个、语境通用词 ${DOMAIN_STOP.size} 个、游戏专有名词/平台 ${PROPER_NOUNS.size} 个；` +
    `另有 ${ADJ_NOISE.size} 个非感受形容词黑名单。`);
  lines.push('- 候选：① 感受形容词种子表 + 严格后缀（ous/ful/less/ive/able/ible/ish/ical/istic/ic/ary，词长 ≥ 6）；' +
    '刻意排除 -y/-ing/-ed/-al，避免 every / going / loved / survival 这类通用词污染；' +
    '② 描述性二元短语（描述词 + 体验载体名词）；③ `X-like` 连字符组合词。');
  lines.push('- 体验载体名词与 X-like 单独成榜，避免高频名词（world / story / combat）淹没真正的描述词。');
  lines.push('- 行动建议按「感受价值分」排序（频次 + 覆盖帖数 + 感受形容词加权 + 历史删除词加权），' +
    '而非纯词频；泛评价词 / 纯负面词 / 仅能作为现有标签 alias 的词不进入建议。');
  lines.push('- 无词性标注、无语义聚类，纯启发式；`count` 为词频而非独立玩家数，长帖会放大个别词。');
  lines.push('- 单一 subreddit（r/gamingsuggestions）且有时间窗口偏差；它天然偏「求推荐」句式，' +
    '高频词反映的是「索取的表达方式」，不等于全平台玩家偏好。');
  lines.push('- 游戏专名排除表是简易版，可能残留个别专名，也可能误排除少数多义词；结论需人工复核。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- main
async function main(): Promise<void> {
  let summary: FetchSummary;

  if (SKIP_FETCH) {
    const raw = JSON.parse(await readFile(RAW_PATH, 'utf8')) as RawRecord[];
    summary = { records: raw, fetched: raw.length, pages: 0, newestUtc: NaN, oldestUtc: NaN };
    console.log(`--skip-fetch：复用 ${RAW_PATH}（${raw.length} 条语料）`);
  } else {
    summary = await fetchAll();
    await mkdir(dirname(RAW_PATH), { recursive: true });
    await writeFile(RAW_PATH, `${JSON.stringify(summary.records, null, 2)}\n`, 'utf8');
    console.log(`已写入 ${RAW_PATH}（${summary.records.length} 条）`);
  }

  console.log('\n阶段二 · 清洗、词频与特征提取');
  const analysis = analyze(summary.records);
  console.log(`  token ${analysis.tokenCount} | 候选词 ${analysis.candidateCount} | Top ${analysis.top.length}`);
  console.log(`  Top 10：${analysis.top.slice(0, 10).map((t) => `${t.term}(${t.count})`).join(', ')}`);
  console.log(`  X-like 组合词 ${analysis.xlikeTop.length} 个 | 载体名词 ${analysis.nounTop.length} 个`);

  console.log('\n阶段三 · 生成对比报告');
  const report = buildReport(summary, analysis, summary.records);
  await writeFile(REPORT_PATH, report, 'utf8');
  console.log(`已写入 ${REPORT_PATH}（${report.split('\n').length} 行）`);
  console.log('\n=== 完成（未修改任何核心管道代码 / 未写回标签体系）===');
}

main().catch((err: unknown) => {
  console.error(`\n分析失败：${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
