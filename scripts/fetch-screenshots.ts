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
 * - 【数据安全】只有「请求成功 + 响应结构可信 + Steam 明确没有截图」才写入空数组；
 *   网络错误 / 非 2xx（含 429 限流）/ JSON 异常 / success=false / 响应结构异常
 *   一律保留该游戏原有的 screenshots，绝不覆盖，避免一次限流故障洗掉历史数据。
 * - 每 20 个游戏增量写盘一次，长时间抓取中途被打断也不会丢已完成的进度。
 * - 只新增 / 覆盖 screenshots 字段，games.json 其它字段原样保留。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_URL = process.env.PROXY_URL?.trim() ?? '';
const API_BASE = 'https://store.steampowered.com/api/appdetails';
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
  /** 不可信时的原因，用于日志 */
  note?: string;
}

/** 解析一次成功响应；任何不可信的情况都返回 shots: null */
function interpret(payload: unknown, appid: string): FetchResult {
  if (!isRecord(payload)) {
    return { shots: null, note: '响应不是对象（可能被限流页拦截）' };
  }
  const entry = payload[appid];
  if (!isRecord(entry)) {
    return { shots: null, note: '响应缺少该 AppID 的有效条目（可能被限流）' };
  }
  if (entry.success !== true) {
    return { shots: null, note: 'Steam 未返回 success=true（下架 / 地区限制 / 限流）' };
  }
  const data = entry.data;
  if (!isRecord(data)) {
    return { shots: null, note: 'success=true 但缺少有效 data（响应结构异常）' };
  }

  const raw = data.screenshots;
  // success=true 且没有 screenshots 字段 / 字段为空数组：这才叫「明确没有截图」
  if (raw === undefined || raw === null) return { shots: [] };
  if (!Array.isArray(raw)) {
    return { shots: null, note: 'screenshots 字段不是数组（响应结构异常）' };
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
    return { shots: null, note: '截图条目缺少图片 URL（响应结构异常）' };
  }
  return { shots };
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
  return { shots: null, note: `请求失败（已重试 ${MAX_RETRIES} 次）：${lastError}` };
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

  console.log(`网络: ${PROXY_URL || '直连（未设置 PROXY_URL）'}`);
  console.log(`游戏总数 ${games.length} | 有 AppID ${targets.length} | 无 AppID ${noAppId} | 延迟 ${REQUEST_DELAY_MS}ms | 每个最多 ${MAX_SCREENSHOTS} 张`);
  if (RESUME) console.log('续跑模式：跳过已有截图的游戏');
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
        `进度 ${n + 1}/${targets.length} | 有图 ${withShots} | 明确空 ${empty} | 保留 ${preserved} | 跳过 ${skipped} | 累计截图 ${totalShots}`,
      );
    }
  }

  await save(games);
  console.log('\n=== 抓取完成 ===');
  console.log(`写入文件: ${dataPath}`);
  console.log(`最终含截图的游戏: ${withShots} / ${targets.length} | 截图总数: ${totalShots}`);
  console.log(`明确无截图并写入空数组: ${empty}`);
  console.log(`异常保留原有截图（未覆盖，含限流 / 网络错误 / 结构异常）: ${preserved}`);
  console.log(`无 AppID: ${noAppId}（仅初始化缺失字段） | 续跑跳过: ${skipped}`);
  console.log(`games.json 对象数: ${games.length} | 含 screenshots 字段: ${games.filter((g) => Array.isArray(g.screenshots)).length}`);
}

main().catch((err: unknown) => {
  console.error(`\n抓取失败：${message(err)}`);
  process.exitCode = 1;
});
