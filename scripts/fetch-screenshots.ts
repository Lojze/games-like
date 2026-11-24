/**
 * 从 Steam 公开 appdetails 接口抓取每个游戏的实机截图，写回 data/games.json。
 *
 * 运行：
 *   node scripts/fetch-screenshots.ts            # 全量抓取
 *   node scripts/fetch-screenshots.ts --resume  # 跳过已有截图的游戏（中断后续跑）
 *   npm run fetch:screenshots
 *
 * 实现约定：
 * - 只处理 steam_url 里能用 /\/app\/(\d+)/ 提取出 AppID 的游戏（当前 497 个）；
 *   其余游戏仅在该字段缺失时初始化为空数组，已有截图一律保留。
 * - 不使用 undici / 原生 fetch（Node 23.7 的 undici 与 zstd 不兼容）；
 *   改用 Node 内置 https 模块 + https-proxy-agent。
 * - 代理完全可选：仅当设置 PROXY_URL 时才走 CONNECT 隧道，未设置则直连。
 *   GitHub Actions 等可直连 Steam 的环境无需任何额外配置；本地如需代理：
 *   PROXY_URL=http://127.0.0.1:7897 npm run fetch:screenshots
 * - 请求之间严格保证 >= 300ms 发起间隔（含重试），避免被 Steam 限流。
 * - 取 data.screenshots 的前 4 张，仅保留 path_thumbnail / path_full 两个 URL。
 * - 同一次响应里额外取 data.header_image，覆盖 games.json 的 background_image。
 *   RAWG 的 media.rawg.io 在国内常被墙，而 Steam 的 *.steamstatic.com 可直连，
 *   因此只要 Steam 给出合法的 header_image 就把主图换成 Steam CDN。
 *   只接受 hostname 以 steamstatic.com 结尾的 https/http URL 并统一升级为 https。
 * - 【限流兜底】appdetails 单 IP 大约 200 次/窗口就会被 429，而全量有 497 个
 *   AppID，一次跑完必然有约一半拿不到 header_image（下架游戏还会 success=false）。
 *   这些游戏在收尾阶段改用无需 API 的固定 CDN 路径
 *   https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg
 *   ——仍是 Steam 自家图床，可国内直连，且对已下架游戏同样有效。
 *   这样无论限流多严重，主图都能 100% 脱离 media.rawg.io。
 *   只有完全没有 AppID 的游戏无法推导封面，保留 RAWG 原图。
 * - 【数据安全】只有「请求成功 + 响应结构可信 + Steam 明确没有截图」才写入空数组；
 *   网络错误 / 非 2xx（含 429 限流）/ JSON 异常 / success=false / 响应结构异常
 *   一律保留该游戏原有的 screenshots，绝不覆盖，避免一次限流故障洗掉历史数据。
 * - 每 20 个游戏增量写盘一次，长时间抓取中途被打断也不会丢已完成的进度。
 * - 只新增 / 覆盖 screenshots 与 background_image 两个字段，games.json 其它字段原样保留。
 * - 注意：build:full / 月度工作流会先跑 fetch:games 重建 games.json（此时封面会
 *   暂时回到 media.rawg.io），随后本脚本会重新覆盖，因此顺序不能颠倒。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_URL = process.env.PROXY_URL?.trim() ?? '';
const API_BASE = 'https://store.steampowered.com/api/appdetails';
// 无需 API 的 Steam 固定封面路径：只需 AppID，不受 appdetails 429 限流影响。
// 对已下架 / 地区限制的游戏同样返回真实 header.jpg，域名仍是 *.steamstatic.com。
const STEAM_CDN_BASE = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
const REQUEST_DELAY_MS = 300;
const MAX_SCREENSHOTS = 4;
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;
const SAVE_EVERY = 20;
const RESUME = process.argv.includes('--resume');

interface Screenshot {
  /** 600x338 缩略图，用于卡片截图条 */
  path_thumbnail: string;
  /** 1920x1080 原图，用于 Lightbox 大图 */
  path_full: string;
}

interface GameRecord {
  slug: string;
  steam_url?: string;
  screenshots?: Screenshot[];
  background_image?: string | null;
  [key: string]: unknown;
}

// 未配置 PROXY_URL 时不创建代理 agent，Node 原生 https 会直连目标主机
const agent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;
const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'games.json');

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));
const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** 把任意 JSON 值安全缩窄成普通对象，用于校验不可信的响应结构 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 从 https://store.steampowered.com/app/1086940/... 里提取 AppID */
function extractAppId(steamUrl: string | undefined): string | null {
  const match = /\/app\/(\d+)/.exec(steamUrl ?? '');
  return match?.[1] ?? null;
}

/**
 * 把 appdetails 的 data.header_image 归一化成可放心写入 games.json 的封面 URL。
 * 只信任 Steam 自家 CDN（*.steamstatic.com）并把 http 统一升级为 https；
 * 其它取值 / 异常结构一律返回 null，让原 background_image 保持不动。
 */
/** 由 AppID 直接推导的 Steam CDN 封面，用作限流 / 下架时的兜底 */
function fallbackHeaderImage(appid: string): string {
  return `${STEAM_CDN_BASE}/${appid}/header.jpg`;
}

/** 已经是 Steam CDN 封面则无需再替换 */
function isSteamCover(value: unknown): boolean {
  return typeof value === 'string' && /(^|\.)steamstatic\.com/i.test(value);
}

function steamHeaderImage(data: Record<string, unknown>): string | null {
  const raw = data.header_image;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // shared.akamai.steamstatic.com / cdn.cloudflare.steamstatic.com 等都命中
    if (!/(^|\.)steamstatic\.com$/i.test(url.hostname)) return null;
    url.protocol = 'https:';
    return url.href;
  } catch {
    return null;
  }
}

// 保证任意两次「请求发起」至少相隔 REQUEST_DELAY_MS（重试也算一次请求）
let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) {
    await sleep(REQUEST_DELAY_MS - elapsed);
  }
  lastRequestAt = Date.now();
}

/** 用 Node 原生 https + 可选 HttpsProxyAgent 请求 appdetails；只负责拿到 JSON，不校验结构 */
function requestAppDetails(appid: string): Promise<unknown> {
  const url = `${API_BASE}?appids=${appid}`;
  return new Promise((resolveJson, reject) => {
    const req = https.get(
      url,
      {
        agent,
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'identity', // 明确要明文，避免处理 gzip/br
          'User-Agent': 'games-like-screenshots/1.0',
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('error', reject); // 响应流中途损坏也算失败，不能当成「无截图」
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolveJson(JSON.parse(body));
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

interface FetchResult {
  /** null = 结果不可信，必须保留原有 screenshots，绝不覆盖 */
  shots: Screenshot[] | null;
  /** Steam 封面 URL；null = 本次没有可信的 header_image，保留原 background_image */
  headerImage: string | null;
  /** 不可信时的原因，用于日志 */
  note?: string;
}

/** 解析一次成功响应；任何不可信的情况都返回 shots: null */
function interpret(payload: unknown, appid: string): FetchResult {
  const noData: Omit<FetchResult, 'note'> = { shots: null, headerImage: null };
  if (!isRecord(payload)) {
    return { ...noData, note: '响应不是对象（可能被限流页拦截）' };
  }
  const entry = payload[appid];
  if (!isRecord(entry)) {
    return { ...noData, note: '响应缺少该 AppID 的有效条目（可能被限流）' };
  }
  if (entry.success !== true) {
    return { ...noData, note: 'Steam 未返回 success=true（下架 / 地区限制 / 限流）' };
  }
  const data = entry.data;
  if (!isRecord(data)) {
    return { ...noData, note: 'success=true 但缺少有效 data（响应结构异常）' };
  }

  // data 已确认可信，header_image 与 screenshots 各自独立判定：
  // 即使截图结构异常需要保留历史数据，封面仍可安全替换为 Steam CDN。
  const headerImage = steamHeaderImage(data);
  const raw = data.screenshots;
  // success=true 且没有 screenshots 字段 / 字段为空数组：这才叫「明确没有截图」
  if (raw === undefined || raw === null) return { shots: [], headerImage };
  if (!Array.isArray(raw)) {
    return { shots: null, headerImage, note: 'screenshots 字段不是数组（响应结构异常）' };
  }

  const shots: Screenshot[] = [];
  for (const shot of raw) {
    if (!isRecord(shot)) continue;
    const thumb = shot.path_thumbnail;
    const full = shot.path_full;
    if (typeof thumb === 'string' && thumb && typeof full === 'string' && full) {
      shots.push({ path_thumbnail: thumb, path_full: full });
      if (shots.length >= MAX_SCREENSHOTS) break;
    }
  }
  // 有条目却全部无效 = 结构异常，不能当成「明确无图」而清空历史数据
  if (raw.length > 0 && shots.length === 0) {
    return {
      shots: null,
      headerImage,
      note: '截图条目缺少图片 URL（响应结构异常）',
    };
  }
  return { shots, headerImage };
}

/** 带节流 + 重试 + 退避地抓取单个游戏的截图；失败一律返回 shots: null */
async function fetchScreenshots(appid: string): Promise<FetchResult> {
  let lastError = '未知错误';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    try {
      return interpret(await requestAppDetails(appid), appid);
    } catch (err) {
      lastError = message(err);
      if (attempt < MAX_RETRIES) await sleep(600 * 2 ** (attempt - 1));
    }
  }
  return {
    shots: null,
    headerImage: null,
    note: `请求失败（已重试 ${MAX_RETRIES} 次）：${lastError}`,
  };
}

async function save(games: GameRecord[]): Promise<void> {
  await writeFile(dataPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const games = JSON.parse(await readFile(dataPath, 'utf8')) as GameRecord[];
  const targets: { index: number; appid: string; slug: string }[] = [];

  games.forEach((game, index) => {
    // 只在字段缺失/损坏时初始化；已有截图（包括空数组）一律保留
    if (!Array.isArray(game.screenshots)) game.screenshots = [];
    const appid = extractAppId(game.steam_url);
    if (appid) targets.push({ index, appid, slug: game.slug });
  });

  const noAppId = games.length - targets.length;
  let withShots = 0; // 最终有截图的游戏数
  let empty = 0; // 本次「明确无截图」而写入空数组的游戏数
  let preserved = 0; // 因失败/异常保留原有数据的游戏数
  let skipped = 0;
  let totalShots = 0;
  let coversReplaced = 0; // 本次被 Steam header_image 覆盖封面的游戏数

  console.log(`网络: ${PROXY_URL || '直连（未设置 PROXY_URL）'}`);
  console.log(`游戏总数 ${games.length} | 有 AppID ${targets.length} | 无 AppID ${noAppId} | 延迟 ${REQUEST_DELAY_MS}ms | 每个最多 ${MAX_SCREENSHOTS} 张`);
  if (RESUME) console.log('续跑模式：跳过已有截图的游戏（这些游戏也不会更新 main cover）');
  console.log('');

  for (let n = 0; n < targets.length; n++) {
    const { index, appid, slug } = targets[n];
    const game = games[index];
    const previous = Array.isArray(game.screenshots) ? game.screenshots : [];

    if (RESUME && previous.length > 0) {
      skipped++;
      withShots++;
      totalShots += previous.length;
      continue;
    }

    const result = await fetchScreenshots(appid);

    // 封面与截图解耦：即使截图结果不可信被保留，只要 data 可信且有合法
    // header_image 就替换主图。只在值真的变化时计数，便于观察替换覆盖率。
    if (result.headerImage && game.background_image !== result.headerImage) {
      game.background_image = result.headerImage;
      coversReplaced++;
    }

    if (result.shots === null) {
      // 核心保护：一个字节都不写，原有 screenshots 原样保留
      preserved++;
      totalShots += previous.length;
      if (previous.length > 0) withShots++;
      console.warn(`  ! ${slug} (AppID ${appid}) ${result.note} → 保留原有 ${previous.length} 张截图`);
    } else {
      game.screenshots = result.shots;
      totalShots += result.shots.length;
      if (result.shots.length > 0) withShots++;
      else empty++;
    }

    if ((n + 1) % SAVE_EVERY === 0 || n === targets.length - 1) {
      await save(games);
      console.log(
        `进度 ${n + 1}/${targets.length} | 有图 ${withShots} | 明确空 ${empty} | 保留 ${preserved} | 跳过 ${skipped} | 累计截图 ${totalShots} | 封面已替换 ${coversReplaced}`,
      );
    }
  }

  // 收尾兜底：凡是主图还停留在 media.rawg.io（本次被 429 / success=false
  // 挡掉，或 fetch:games 刚重建过），只要能提取 AppID 就换成 Steam 固定 CDN 路径。
  // 这一段不发任何网络请求，因此对 Steam 限流完全免疫，CI 月度跑也能全覆盖。
  let coversFilled = 0;
  for (const game of games) {
    if (isSteamCover(game.background_image)) continue;
    const appid = extractAppId(game.steam_url);
    if (!appid) continue;
    game.background_image = fallbackHeaderImage(appid);
    coversFilled++;
  }

  await save(games);
  const steamCovers = games.filter((g) => isSteamCover(g.background_image)).length;
  console.log('\n=== 抓取完成 ===');
  console.log(`写入文件: ${dataPath}`);
  console.log(`最终含截图的游戏: ${withShots} / ${targets.length} | 截图总数: ${totalShots}`);
  console.log(`明确无截图并写入空数组: ${empty}`);
  console.log(`异常保留原有截图（未覆盖，含限流 / 网络错误 / 结构异常）: ${preserved}`);
  console.log(`无 AppID: ${noAppId}（仅初始化缺失字段） | 续跑跳过: ${skipped}`);
  console.log(`主图来自 appdetails header_image: ${coversReplaced} | 限流兜底换成 Steam CDN: ${coversFilled}`);
  console.log(`games.json 中 Steam CDN 封面: ${steamCovers} / ${games.length} | 仍为 RAWG 图床（无 AppID）: ${games.length - steamCovers}`);
  console.log(`games.json 对象数: ${games.length} | 含 screenshots 字段: ${games.filter((g) => Array.isArray(g.screenshots)).length}`);
}

main().catch((err: unknown) => {
  console.error(`\n抓取失败：${message(err)}`);
  process.exitCode = 1;
});
