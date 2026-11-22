/**
 * 从 RAWG API 抓取「按 Metacritic 评分降序排列的前 500 个有 Steam 商店链接的游戏」，
 * 仅保留 description >= 100 字符且 tags 非空的条目，写入 data/games.json。
 *
 * games.json 的字段白名单（其余字段一律不写入）：
 *   slug, name, background_image, description, metacritic, rating, tags, steam_url,
 *   released, genres
 * 其中 steam_url 是从 stores 里提取出来的唯一商店字段；stores / developers /
 * publishers / platforms 以及内部使用的 RAWG id 都不落盘。
 * released / genres 是「纯展示字段」，只供 src/pages/games-like/[slug].astro 渲染
 * 年份与类型；它们绝不参与 scripts/clean-tags.ts 的感受标签清洗，也不参与
 * scripts/compute-matches.ts 的相似度计算（这两个脚本都不读取它们）。
 * 原始 tags 完整保留，感受标签的清洗由 scripts/clean-tags.ts 单独完成。
 *
 * 运行（Node >= 22.18 / 23.6 默认支持 TypeScript 类型剥离，无需额外依赖）：
 *   PowerShell:  $env:RAWG_API_KEY="your-key"; node scripts/fetch-games.ts
 *   bash:        RAWG_API_KEY=your-key node scripts/fetch-games.ts
 *   npm:         npm run fetch:games
 *
 * 实现说明：
 * - /games 列表接口不返回 description，且不保证带商店直链，因此分页拉列表后，
 *   对候选游戏再请求 /games/{id} 详情；详情仍无直链时才回退 /games/{id}/stores。
 * - 所有 HTTP 请求（列表分页 / 详情 / 商店 / 重试）之间统一保证 >= 200ms 间隔。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = 'https://api.rawg.io/api';
const PAGE_SIZE = 40;
const TARGET_COUNT = 500;
const MAX_PAGES = 30; // 上限：最多扫描 30 页（1200 个候选），避免无限翻页
const REQUEST_DELAY_MS = 200;
const MIN_DESCRIPTION_LENGTH = 100;
const MAX_RETRIES = 3;
const STEAM_STORE_ID = 1;

interface RawgTag {
  id: number;
  name: string;
  slug: string;
}

interface RawgGenre {
  id: number;
  name: string;
  slug: string;
}

interface RawgStore {
  id: number;
  name: string;
  slug: string;
  domain?: string;
}

interface RawgStoreLink {
  id: number;
  url?: string | null;
  store?: RawgStore | null;
}

interface RawgGameSummary {
  id: number; // 仅用于去重与请求详情，不写入 games.json
  name: string;
  slug: string;
  background_image?: string | null;
  metacritic?: number | null;
  rating?: number | null;
  tags?: RawgTag[] | null;
  genres?: RawgGenre[] | null;
  released?: string | null;
  stores?: RawgStoreLink[] | null;
  description?: string | null;
  description_raw?: string | null;
}

type RawgGameDetail = RawgGameSummary;

interface RawgPage<T> {
  count: number;
  next: string | null;
  results: T[];
}

interface GameRecord {
  slug: string;
  name: string;
  background_image: string | null;
  description: string;
  metacritic: number | null;
  rating: number | null;
  tags: string[];
  steam_url: string;
  /** 纯展示字段：RAWG 的发行日期字符串，如 "2018-04-20" */
  released: string | null;
  /** 纯展示字段：只保留 genres[].name，不保存完整对象 */
  genres: string[];
}

interface HttpFailure extends Error {
  status: number;
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function httpFailure(status: number, text: string): HttpFailure {
  return Object.assign(new Error(text), { status });
}

// 进程环境里没有 Key 时，尝试读取项目根目录的 .env（文件不存在则静默忽略）
if (!process.env.RAWG_API_KEY?.trim()) {
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url));
  } catch {
    // 没有 .env 时继续，后面统一给出「缺少 Key」提示
  }
}

// 用 process.exitCode 而不是 process.exit()，避免 Windows 上 Node 23
// 在异步 stdio 还未 flush 时强制退出引发 libuv 断言错误
const apiKey = process.env.RAWG_API_KEY?.trim() ?? '';

function buildUrl(path: string, params: Record<string, string> = {}): URL {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('key', apiKey);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return url;
}

// 保证任意两次请求的发起时间至少相隔 REQUEST_DELAY_MS
let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) {
    await sleep(REQUEST_DELAY_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

async function fetchJson<T>(url: URL): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'games-like-fetcher/1.0',
        },
        signal: AbortSignal.timeout(20_000),
      });
      // 不要在错误信息里打印 URL，避免泄露 API Key
      if (!response.ok) {
        const hint = response.status === 401 ? '（RAWG_API_KEY 无效或缺失）' : '';
        throw httpFailure(response.status, `HTTP ${response.status} ${response.statusText}${hint}`);
      }
      return (await response.json()) as T;
    } catch (err) {
      lastError = err;
      const status = (err as HttpFailure)?.status;
      if (status === 401 || status === 403 || status === 404) throw err;
      if (attempt === MAX_RETRIES) break;
      console.warn(`  请求失败（${attempt}/${MAX_RETRIES}）：${message(err)}，退避后重试`);
      await sleep(500 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function isSteamLink(link: RawgStoreLink): boolean {
  const store = link.store;
  if (!store) return /store\.steampowered\.com/i.test(link.url ?? '');
  return (
    store.id === STEAM_STORE_ID ||
    store.slug === 'steam' ||
    /steampowered\.com/i.test(store.domain ?? '')
  );
}

function findSteamUrl(links: RawgStoreLink[] | null | undefined): string | null {
  for (const link of links ?? []) {
    if (!isSteamLink(link)) continue;
    const raw = link.url?.trim();
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('//')) return `https:${raw}`;
  }
  return null;
}

function plainDescription(game: RawgGameDetail): string {
  const raw = game.description_raw?.trim();
  if (raw) return raw;
  return (game.description ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagNames(tags: RawgTag[] | null | undefined): string[] {
  const names = (tags ?? [])
    .map((tag) => tag?.name?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

/** 纯展示字段：只取 genres 的名字，去重后保序，不保留 id / slug / 对象 */
function genreNames(genres: RawgGenre[] | null | undefined): string[] {
  const names = (genres ?? [])
    .map((genre) => genre?.name?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

/** 纯展示字段：保留 RAWG 原始 released 字符串（如 "2018-04-20"），缺失则为 null */
function releaseDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function main(): Promise<void> {
  const games: GameRecord[] = [];
  const seen = new Set<number>();
  const skipped = { noSteam: 0, noUrl: 0, shortDescription: 0, noTags: 0, failed: 0 };
  let scanned = 0;
  let pages = 0;
  let loggedRawKeys = false;

  for (let page = 1; page <= MAX_PAGES && games.length < TARGET_COUNT; page++) {
    const listUrl = buildUrl('/games', {
      ordering: '-metacritic',
      metacritic: '1,100',
      page_size: String(PAGE_SIZE),
      page: String(page),
    });
    const list = await fetchJson<RawgPage<RawgGameSummary>>(listUrl);
    pages++;
    // 诊断开关：RAWG_DEBUG_KEYS=1 时打印一次原始响应 results[0] 的字段名，
    // 用于确认 background_image 等字段是否真的由 API 返回（不打印 Key 或完整数据）。
    if (!loggedRawKeys && process.env.RAWG_DEBUG_KEYS === '1' && list.results?.[0]) {
      loggedRawKeys = true;
      console.log('[RAWG 原始响应 /games results[0] Object.keys()]', JSON.stringify(Object.keys(list.results[0])));
    }
    if (!list.results?.length) break;

    for (const summary of list.results) {
      if (games.length >= TARGET_COUNT) break;
      scanned++;
      if (seen.has(summary.id)) continue;
      seen.add(summary.id);

      // 列表明确给出了 stores 且其中没有 Steam，直接跳过，省一次详情请求；
      // 若列表不返回该字段，则交由详情判断，避免误杀。
      if (Array.isArray(summary.stores) && summary.stores.length > 0 && !summary.stores.some(isSteamLink)) {
        skipped.noSteam++;
        continue;
      }

      let detail: RawgGameDetail;
      try {
        detail = await fetchJson<RawgGameDetail>(buildUrl(`/games/${summary.id}`));
      } catch (err) {
        skipped.failed++;
        console.warn(`  ! 详情获取失败 id=${summary.id}：${message(err)}`);
        continue;
      }

      let steamUrl = findSteamUrl(detail.stores ?? summary.stores);
      if (!steamUrl) {
        try {
          const storeLinks = await fetchJson<RawgPage<RawgStoreLink>>(
            buildUrl(`/games/${summary.id}/stores`, { page_size: String(PAGE_SIZE) }),
          );
          steamUrl = findSteamUrl(storeLinks.results);
        } catch {
          // 该游戏没有可用的商店直链，按「无 Steam 链接」处理
        }
      }
      if (!steamUrl) {
        skipped.noUrl++;
        continue;
      }

      const description = plainDescription(detail);
      if (description.length < MIN_DESCRIPTION_LENGTH) {
        skipped.shortDescription++;
        continue;
      }

      const tags = tagNames(detail.tags ?? summary.tags);
      if (tags.length === 0) {
        skipped.noTags++;
        continue;
      }

      games.push({
        slug: detail.slug ?? summary.slug,
        name: detail.name ?? summary.name,
        background_image: detail.background_image ?? summary.background_image ?? null,
        description,
        metacritic: detail.metacritic ?? summary.metacritic ?? null,
        rating: detail.rating ?? summary.rating ?? null,
        tags,
        steam_url: steamUrl,
        released: releaseDate(detail.released ?? summary.released),
        genres: genreNames(detail.genres ?? summary.genres),
      });
    }

    console.log(`第 ${page} 页：已扫描 ${scanned} 个候选，收录 ${games.length}/${TARGET_COUNT}`);
    if (!list.next) break;
  }

  const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'games.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');

  console.log(`\n完成：写入 ${games.length} 个游戏 -> ${outputPath}`);
  console.log(
    `扫描 ${pages} 页 / ${scanned} 个候选；跳过：非 Steam ${skipped.noSteam}，无可用直链 ${skipped.noUrl}，` +
      `描述不足 ${MIN_DESCRIPTION_LENGTH} 字 ${skipped.shortDescription}，无 tags ${skipped.noTags}，请求失败 ${skipped.failed}`,
  );
  if (games.length < TARGET_COUNT) {
    console.warn(`注意：未凑满 ${TARGET_COUNT} 条，已到达最大页数 ${MAX_PAGES} 或 API 结果耗尽。`);
  }
}

if (!apiKey) {
  console.error('缺少环境变量 RAWG_API_KEY，请先设置再运行，例如：');
  console.error('  PowerShell: $env:RAWG_API_KEY="your-key"; npm run fetch:games');
  console.error('  bash:        RAWG_API_KEY=your-key node scripts/fetch-games.ts');
  process.exitCode = 1;
} else {
  main().catch((err: unknown) => {
    console.error(`\n抓取失败：${message(err)}`);
    process.exitCode = 1;
  });
}
