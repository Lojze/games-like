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
 *   其余游戏统一写入空数组，保证 games.json 的每个对象都有 screenshots 字段。
 * - 不使用 undici / 原生 fetch。Node 23.7 的 undici 与 zstd 不兼容，且 ProxyAgent
 *   在本环境会抛错；这里改用 Node 内置 https 模块 + https-proxy-agent，走
 *   http://127.0.0.1:7897 的 CONNECT 隧道（可用 STEAM_PROXY 覆盖）。
 * - 请求之间严格保证 >= 300ms 发起间隔（含重试），避免被 Steam 限流。
 * - 取 data.screenshots 的前 4 张，仅保留 path_thumbnail / path_full 两个 URL；
 *   success=false、无截图、超时或请求失败一律记为空数组。
 * - 每 20 个游戏增量写盘一次，长时间抓取中途被打断也不会丢已完成的进度。
 * - 只新增 / 覆盖 screenshots 字段，games.json 其它字段原样保留。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_URL = process.env.STEAM_PROXY?.trim() || 'http://127.0.0.1:7897';
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

interface RawScreenshot {
  path_thumbnail?: string;
  path_full?: string;
}

interface AppDetailsResponse {
  [appid: string]: {
    success?: boolean;
    data?: { screenshots?: RawScreenshot[] };
  } | undefined;
}

const agent = new HttpsProxyAgent(PROXY_URL);
const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'games.json');

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));
const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

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

/** 用 Node 原生 https + HttpsProxyAgent 请求 appdetails，返回解析后的 JSON */
function requestAppDetails(appid: string): Promise<AppDetailsResponse> {
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
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolveJson(JSON.parse(body) as AppDetailsResponse);
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
  shots: Screenshot[];
  /** false 表示请求重试后仍失败；true 表示 API 正常响应（可能本来就没有截图） */
  ok: boolean;
}

/** 带节流 + 重试 + 退避地抓取单个游戏的截图 */
async function fetchScreenshots(appid: string): Promise<FetchResult> {
  let lastError = '未知错误';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    try {
      const payload = await requestAppDetails(appid);
      const entry = payload[appid];
      // success=false（下架 / 地区限制 / DLC）算正常响应，按无图处理
      if (!entry?.success) return { shots: [], ok: true };
      const raw = entry.data?.screenshots ?? [];
      return {
        shots: raw
          .filter((shot) => shot.path_thumbnail && shot.path_full)
          .slice(0, MAX_SCREENSHOTS)
          .map((shot) => ({
            path_thumbnail: shot.path_thumbnail as string,
            path_full: shot.path_full as string,
          })),
        ok: true,
      };
    } catch (err) {
      lastError = message(err);
      if (attempt < MAX_RETRIES) await sleep(600 * 2 ** (attempt - 1));
    }
  }
  console.warn(`  ! AppID ${appid} 抓取失败（已重试 ${MAX_RETRIES} 次）：${lastError}`);
  return { shots: [], ok: false };
}

async function save(games: GameRecord[]): Promise<void> {
  await writeFile(dataPath, `${JSON.stringify(games, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const games = JSON.parse(await readFile(dataPath, 'utf8')) as GameRecord[];
  const targets: { index: number; appid: string; slug: string }[] = [];

  games.forEach((game, index) => {
    const appid = extractAppId(game.steam_url);
    if (appid) {
      targets.push({ index, appid, slug: game.slug });
    } else {
      // 没有 AppID 的游戏也要有 screenshots 字段，保持数据结构统一
      game.screenshots = [];
    }
  });

  const noAppId = games.length - targets.length;
  let withShots = 0;
  let empty = 0;
  let failed = 0;
  let skipped = 0;
  let totalShots = 0;

  console.log(`代理: ${PROXY_URL}`);
  console.log(`游戏总数 ${games.length} | 有 AppID ${targets.length} | 无 AppID ${noAppId} | 延迟 ${REQUEST_DELAY_MS}ms | 每个最多 ${MAX_SCREENSHOTS} 张`);
  if (RESUME) console.log('续跑模式：跳过已有截图的游戏');
  console.log('');

  for (let n = 0; n < targets.length; n++) {
    const { index, appid, slug } = targets[n];
    const game = games[index];

    if (RESUME && Array.isArray(game.screenshots) && game.screenshots.length > 0) {
      skipped++;
      withShots++;
      totalShots += game.screenshots.length;
      continue;
    }

    const { shots, ok } = await fetchScreenshots(appid);
    game.screenshots = shots;
    totalShots += shots.length;
    if (shots.length > 0) withShots++;
    else empty++;
    if (!ok) {
      failed++;
      console.warn(`  ! ${slug} (AppID ${appid}) 请求失败，已置空数组`);
    }

    if ((n + 1) % SAVE_EVERY === 0 || n === targets.length - 1) {
      await save(games);
      console.log(
        `进度 ${n + 1}/${targets.length} | 有图 ${withShots} | 空 ${empty} | 跳过 ${skipped} | 累计截图 ${totalShots}`,
      );
    }
  }

  await save(games);
  console.log('\n=== 抓取完成 ===');
  console.log(`写入文件: ${dataPath}`);
  console.log(`成功抓到截图的游戏: ${withShots} / ${targets.length}`);
  console.log(`无截图的游戏: ${empty}（其中请求失败 ${failed}，其余为 success=false 或该游戏本身无截图）`);
  console.log(`无 AppID 置空: ${noAppId} | 续跑跳过: ${skipped}`);
  console.log(`截图总数: ${totalShots}`);
  console.log(`games.json 对象数: ${games.length} | 含 screenshots 字段: ${games.filter((g) => Array.isArray(g.screenshots)).length}`);
}

main().catch((err: unknown) => {
  console.error(`\n抓取失败：${message(err)}`);
  process.exitCode = 1;
});
