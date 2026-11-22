/**
 * 相似度匹配：data/feel-tags.json + data/games.json(description) -> data/matches.json
 *
 * 运行：npm run compute:matches（或 node scripts/compute-matches.ts）
 *
 * 评分规则（IDF 加权）：
 *   score = 3 × Σ IDF(t)（t 遍历双方共享的感受标签） + 1.0 × 描述文本余弦相似度
 *   IDF(t) = ln((N + 1) / (df(t) + 1)) + 1（平滑版）
 *   N = 参与匹配的游戏数；df(t) 在本脚本内基于 feel-tags.json 独立统计，
 *       不使用 clean-tags.ts 里以全量 500 个游戏为基准的 df。
 *   硬性排除：没有任何共享感受标签的一对游戏，无论如何都不推荐。
 * 感受标签只从 feel-tags.json 读取，绝不读 games.json 里的原始 tags
 * （原始 tags 混有 Singleplayer、FPS、vr mod 之类技术词，会污染匹配）。
 * description 仅用于余弦相似度这个辅助信号。
 *
 * 参与门槛：感受标签数 >= 2 的游戏才参与匹配；<= 1 的游戏在读取
 * feel-tags.json 时直接跳过，既不生成推荐页，也不作为候选被推荐，更不写入
 * matches.json。过滤只作用于参与集合，评分公式与排序逻辑保持不变。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOP_N = 8;
const SHARED_TAG_WEIGHT = 3;
const TEXT_WEIGHT = 1;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 仅用于诊断统计，不参与任何评分计算 */
const HIGH_FREQ_TAGS = new Set(['atmospheric', 'story-rich']);

/** 诊断用代表游戏，slug 取数据集中的真实值 */
const REPRESENTATIVE_GAMES: ReadonlyArray<{ label: string; slug: string }> = [
  { label: 'Hades', slug: 'hades-2018' },
  { label: 'Stardew Valley', slug: 'stardew-valley' },
  { label: 'Half-Life', slug: 'half-life' },
  { label: 'God of War (2018)', slug: 'god-of-war-2' },
  { label: 'Disco Elysium', slug: 'disco-elysium' },
];

interface GameRecord {
  slug?: unknown;
  name?: unknown;
  description?: unknown;
}

interface Recommendation {
  slug: string;
  score: number;
  shared_tags: string[];
  reason: string;
}

/** 诊断 [6] 用：旧公式（等权）下的 Top3 快照，不写入 matches.json */
interface LegacyPick {
  slug: string;
  score: number;
  sharedCount: number;
  reason: string;
}

// 只过滤功能词与游戏描述的通用套话，保留有区分度的实词
const STOP_WORDS = new Set(
  (
    'a about above after again all also am an and any are as at be because been before being below between both but by ' +
    'can cannot could did do does doing down during each few for from further had has have having he her here hers herself ' +
    'him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or ' +
    'other our ours out over own same she should so some such than that the their theirs them themselves then there these ' +
    'they this those through to too under until up very was we were what when where which while who whom why will with ' +
    'you your yours yourself yourselves one two three get gets got make makes made new first like well will ' +
    'game games player players play playing'
  ).split(' '),
);

function tokenize(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

interface Vector {
  counts: Map<string, number>;
  norm: number;
}

function buildVector(text: string): Vector {
  const counts = new Map<string, number>();
  let squared = 0;
  for (const word of tokenize(text)) {
    const next = (counts.get(word) ?? 0) + 1;
    counts.set(word, next);
    // 增量维护平方和：sum(c^2) 在 c 从 n-1 变为 n 时增加 2n-1
    squared += 2 * next - 1;
  }
  return { counts, norm: Math.sqrt(squared) };
}

function cosine(a: Vector, b: Vector): number {
  if (a.norm === 0 || b.norm === 0) return 0;
  const [small, large] = a.counts.size <= b.counts.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [word, count] of small.counts) {
    const other = large.counts.get(word);
    if (other) dot += count * other;
  }
  return dot / (a.norm * b.norm);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 从 reason 中还原标签列表（reason 格式固定为 "共享感受标签: a, b"） */
function parseReasonTags(reason: string): string[] {
  return reason
    .replace(/^共享感受标签:\s*/u, '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

/**
 * 诊断输出：只读统计，不参与 matches 的计算、排序或写入。
 * 目的是给「是否引入 IDF 加权」的决策提供数据依据。
 */
async function printDiagnostics(
  matches: Record<string, Recommendation[]>,
  names: Map<string, string>,
  outputPath: string,
  feelCount: number,
  feelTags: Record<string, string[]>,
  legacyTop3: Map<string, LegacyPick[]>,
): Promise<void> {
  const recommendations = Object.values(matches).flat();
  const total = recommendations.length;

  let withHighFreq = 0;
  let onlyHighFreq = 0;
  let reasonMismatch = 0;
  const buckets = { one: 0, two: 0, threePlus: 0 };

  for (const rec of recommendations) {
    const tags = parseReasonTags(rec.reason);
    if (tags.length !== rec.shared_tags.length) reasonMismatch++;
    if (tags.some((tag) => HIGH_FREQ_TAGS.has(tag))) withHighFreq++;
    if (tags.length > 0 && tags.every((tag) => HIGH_FREQ_TAGS.has(tag))) onlyHighFreq++;

    const count = rec.shared_tags.length;
    if (count <= 1) buckets.one++;
    else if (count === 2) buckets.two++;
    else buckets.threePlus++;
  }

  // 复核写盘结果，避免「内存 358、磁盘 340」这类不同步
  const onDisk = JSON.parse(await readFile(outputPath, 'utf8')) as Record<string, Recommendation[]>;
  const diskKeys = Object.keys(onDisk).length;
  const memoryKeys = Object.keys(matches).length;

  const label = (slug: string): string => names.get(slug) || slug;

  console.log('\n=== 诊断数据（只读统计，不影响匹配结果）===');
  console.log('[1] 推荐 reason 的高频词占比');
  console.log(`    含 atmospheric 或 story-rich 的推荐: ${withHighFreq} / ${total} = ${percent(withHighFreq, total)}`);
  console.log(`    不含这两个高频词的推荐:            ${total - withHighFreq} / ${total} = ${percent(total - withHighFreq, total)}`);

  console.log('\n[2] 共享标签数分布');
  console.log(`    共享 1 个标签:   ${String(buckets.one).padStart(4)} / ${total} = ${percent(buckets.one, total)}`);
  console.log(`    共享 2 个标签:   ${String(buckets.two).padStart(4)} / ${total} = ${percent(buckets.two, total)}`);
  console.log(`    共享 3 个及以上: ${String(buckets.threePlus).padStart(4)} / ${total} = ${percent(buckets.threePlus, total)}`);

  console.log('\n[3] 仅共享高频词的推荐');
  console.log(`    reason 只含 atmospheric / story-rich、无其他标签: ${onlyHighFreq} / ${total} = ${percent(onlyHighFreq, total)}`);
  console.log(`    reason 与 shared_tags 长度不一致的推荐: ${reasonMismatch} 条`);
  // 源游戏自身只有高频标签时，其推荐必然全是「仅共享高频词」，与评分公式无关
  const lockedSet = new Set(
    Object.keys(matches)
      .filter((slug) => (feelTags[slug] ?? []).length > 0 && (feelTags[slug] ?? []).every((tag) => HIGH_FREQ_TAGS.has(tag))),
  );
  let lockedRecs = 0;
  for (const [slug, recs] of Object.entries(matches)) {
    if (lockedSet.has(slug)) lockedRecs += recs.length;
  }
  console.log(`    其中来自「自身标签全为高频词」的 ${lockedSet.size} 个游戏: ${lockedRecs} 条 = ${percent(lockedRecs, total)}（IDF 无法改变的理论下限）`);

  console.log('\n[4] 5 个代表游戏的 Top 3 推荐（完整 reason）');
  for (const rep of REPRESENTATIVE_GAMES) {
    let slug = rep.slug;
    if (!matches[slug]) {
      const byName = [...names.entries()].find(
        ([candidate, name]) => name.toLowerCase() === rep.label.toLowerCase() && matches[candidate],
      );
      if (byName) slug = byName[0];
    }
    const recs = matches[slug];
    if (!recs) {
      console.log(`  ${rep.label}：未找到推荐（slug=${slug}）`);
      continue;
    }
    console.log(`  ${label(slug)} (${slug})`);
    for (const [index, rec] of recs.slice(0, 3).entries()) {
      console.log(`    ${index + 1}. ${label(rec.slug)}`);
      console.log(`       reason: ${rec.reason}`);
    }
  }

  console.log('\n[5] matches.json 键数');
  console.log(`    feel-tags.json 参与匹配的游戏数（标签数 >= 2）: ${feelCount}`);
  console.log(`    内存结果键数: ${memoryKeys}`);
  console.log(`    写盘后重新读取的键数: ${diskKeys}`);
  console.log(`    内存 / 磁盘一致: ${memoryKeys === diskKeys ? 'PASS' : 'FAIL'}`);

  console.log('\n[6] Disco Elysium 的 Top 3 推荐：IDF 前 → 后对比');
  const discoSlug = REPRESENTATIVE_GAMES.find((rep) => rep.label === 'Disco Elysium')?.slug ?? 'disco-elysium';
  const discoFeel = feelTags[discoSlug] ?? [];
  const before = legacyTop3.get(discoSlug) ?? [];
  const after = matches[discoSlug] ?? [];
  console.log(`  自身感受标签: ${JSON.stringify(discoFeel)}`);
  console.log('  IDF 前 (score = 3 × 共享标签数 + cosine):');
  if (before.length === 0) console.log('    (无可用候选)');
  for (const [index, pick] of before.entries()) {
    console.log(`    ${index + 1}. ${label(pick.slug)}  reason: ${pick.reason}`);
  }
  console.log('  IDF 后 (score = 3 × ΣIDF + cosine):');
  if (after.length === 0) console.log('    (无推荐)');
  for (const [index, rec] of after.slice(0, 3).entries()) {
    console.log(`    ${index + 1}. ${label(rec.slug)}  reason: ${rec.reason}`);
  }
  const beforeSlugs = before.map((pick) => pick.slug).join(', ');
  const afterSlugs = after.slice(0, 3).map((rec) => rec.slug).join(', ');
  console.log(`  Top3 名单是否变化: ${beforeSlugs === afterSlugs ? '否（排序未变）' : '是（已重排）'}`);
  const nonHighInTop3 = after
    .slice(0, 3)
    .filter((rec) => parseReasonTags(rec.reason).some((tag) => !HIGH_FREQ_TAGS.has(tag))).length;
  console.log(`  Top3 含非高频标签的推荐: ${nonHighInTop3} 条`);
  if (discoFeel.every((tag) => HIGH_FREQ_TAGS.has(tag))) {
    console.log('  说明: 源游戏自身只有高频标签，共享标签只能是它的子集，因此该条件在本数据上无法满足。');
  }

  console.log('\n[7] 被过滤的游戏（感受标签数 <= 1，不参与匹配）');
  const lowTagSlugs = Object.entries(feelTags)
    .filter(([, tags]) => (tags ?? []).length <= 1)
    .map(([slug]) => slug)
    .sort();
  const allFeelCount = Object.keys(feelTags).length;
  console.log(`  数量: ${lowTagSlugs.length} / ${allFeelCount} = ${percent(lowTagSlugs.length, allFeelCount)}（分母为 feel-tags.json 全量键数）`);
  console.log('  完整 slug 列表:');
  for (let i = 0; i < lowTagSlugs.length; i += 6) {
    console.log(`    ${lowTagSlugs.slice(i, i + 6).join(', ')}`);
  }
}

async function main(): Promise<void> {
  const gamesPath = resolve(ROOT, 'data', 'games.json');
  const feelPath = resolve(ROOT, 'data', 'feel-tags.json');
  const outputPath = resolve(ROOT, 'data', 'matches.json');

  const games = JSON.parse(await readFile(gamesPath, 'utf8')) as GameRecord[];
  const feelTags = JSON.parse(await readFile(feelPath, 'utf8')) as Record<string, string[]>;
  if (!Array.isArray(games)) throw new Error(`${gamesPath} 的顶层必须是数组`);

  const descriptions = new Map<string, string>();
  const names = new Map<string, string>();
  for (const game of games) {
    const slug = readString(game.slug).trim();
    if (!slug) continue;
    descriptions.set(slug, readString(game.description));
    names.set(slug, readString(game.name));
  }

  // 只有出现在 feel-tags.json 且感受标签数 >= 2 的游戏才参与匹配；
  // <= 1 的游戏直接跳过（不生成推荐页、不作为候选、不写入 matches.json）。
  const slugs = Object.keys(feelTags).filter(
    (slug) => descriptions.has(slug) && (feelTags[slug] ?? []).length >= 2,
  );
  const excludedSlugs = Object.keys(feelTags).filter(
    (slug) => (feelTags[slug] ?? []).length <= 1,
  );
  const tagSets = new Map<string, Set<string>>(
    slugs.map((slug) => [slug, new Set(feelTags[slug] ?? [])]),
  );
  const vectors = new Map<string, Vector>(
    slugs.map((slug) => [slug, buildVector(descriptions.get(slug) as string)]),
  );

  // IDF 基准：只统计参与匹配的 slugs，df 来自 feel-tags.json，
  // 不复用 clean-tags.ts 里以全量 500 个游戏为基准的 df。
  const documentFrequency = new Map<string, number>();
  for (const slug of slugs) {
    for (const tag of tagSets.get(slug) as Set<string>) {
      documentFrequency.set(tag, (documentFrequency.get(tag) ?? 0) + 1);
    }
  }
  const N = slugs.length;
  const idf = new Map<string, number>(
    [...documentFrequency].map(([tag, df]) => [tag, Math.log((N + 1) / (df + 1)) + 1]),
  );

  const matches: Record<string, Recommendation[]> = {};
  let totalRecommendations = 0;
  let excludedByHardRule = 0;
  /** 诊断 [6]：旧公式（等权）下每个游戏的 Top3 快照，不写入 matches.json */
  const legacyTop3 = new Map<string, LegacyPick[]>();

  for (const slug of slugs) {
    const sourceTags = tagSets.get(slug) as Set<string>;
    const sourceVector = vectors.get(slug) as Vector;
    const candidates: Recommendation[] = [];
    const legacyPicks: LegacyPick[] = [];

    for (const otherSlug of slugs) {
      if (otherSlug === slug) continue;

      // 硬性排除：没有任何共享感受标签，直接跳过，连余弦都不计算
      const shared: string[] = [];
      for (const tag of sourceTags) {
        if ((tagSets.get(otherSlug) as Set<string>).has(tag)) shared.push(tag);
      }
      if (shared.length === 0) {
        excludedByHardRule++;
        continue;
      }
      shared.sort();

      const textScore = cosine(sourceVector, vectors.get(otherSlug) as Vector);
      // score = 3 × Σ IDF(共享标签) + 1.0 × 余弦相似度
      const tagIdfSum = shared.reduce((sum, tag) => sum + (idf.get(tag) ?? 0), 0);
      const score = SHARED_TAG_WEIGHT * tagIdfSum + TEXT_WEIGHT * textScore;
      const reason = `共享感受标签: ${shared.join(', ')}`;
      candidates.push({
        slug: otherSlug,
        score: Number(score.toFixed(4)),
        shared_tags: shared,
        reason,
      });

      // 诊断 [6]：同一候选在旧公式（等权）下的 Top3 快照，不影响写盘
      const legacyScore = SHARED_TAG_WEIGHT * shared.length + TEXT_WEIGHT * textScore;
      legacyPicks.push({ slug: otherSlug, score: legacyScore, sharedCount: shared.length, reason });
      legacyPicks.sort(
        (a, b) => b.score - a.score || b.sharedCount - a.sharedCount || a.slug.localeCompare(b.slug),
      );
      if (legacyPicks.length > 3) legacyPicks.length = 3;
    }
    legacyTop3.set(slug, legacyPicks.slice());

    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        b.shared_tags.length - a.shared_tags.length ||
        a.slug.localeCompare(b.slug),
    );
    const top = candidates.slice(0, TOP_N);
    if (top.length > 0) {
      matches[slug] = top;
      totalRecommendations += top.length;
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(matches, null, 2)}\n`, 'utf8');

  const label = (slug: string): string => names.get(slug) || slug;
  const show = (slug: string, limit = 3): void => {
    const recs = matches[slug];
    if (!recs) {
      console.log(`  ${label(slug)} (${slug})：无推荐（没有可用的共享感受标签）`);
      return;
    }
    console.log(`  ${label(slug)} (${slug}) 的 Top ${Math.min(limit, recs.length)}：`);
    for (const rec of recs.slice(0, limit)) {
      console.log(`    -> ${label(rec.slug)} [score=${rec.score}] ${rec.reason}`);
    }
  };

  console.log('\n=== 匹配结果统计 ===');
  console.log(`feel-tags.json 全量键数: ${Object.keys(feelTags).length}`);
  console.log(`被过滤（感受标签数 <= 1，不参与匹配）: ${excludedSlugs.length}`);
  console.log(`参与匹配的游戏（感受标签数 >= 2）: ${slugs.length}`);
  console.log(`硬性排除的候选对（无共享感受标签）: ${excludedByHardRule}`);
  console.log(`匹配结果总条目数（有推荐的游戏）: ${Object.keys(matches).length}`);
  console.log(`推荐条目总数: ${totalRecommendations}`);
  console.log(`输出: ${outputPath}`);

  console.log('\n=== IDF 权重表（N = 参与匹配游戏数，df 基于 feel-tags.json 独立统计） ===');
  console.log(`N = ${N} | IDF(t) = ln((N+1)/(df+1)) + 1`);
  for (const [tag, value] of [...idf].sort((a, b) => a[1] - b[1])) {
    console.log(`  ${tag.padEnd(20)} df=${String(documentFrequency.get(tag)).padStart(3)}  IDF=${value.toFixed(4)}`);
  }

  console.log('\n=== 前 3 个游戏的 Top 3 推荐 ===');
  const firstThree = games
    .map((game) => readString(game.slug).trim())
    .filter((slug) => Object.prototype.hasOwnProperty.call(matches, slug))
    .slice(0, 3);
  for (const slug of firstThree) show(slug);

  console.log('\n=== 人工抽查（Hades / Stardew Valley / Half-Life）===');
  const known = ['hades', 'stardew-valley', 'half-life'];
  for (const wanted of known) {
    const slug = slugs.find((s) => s === wanted || s.startsWith(`${wanted}-`)) ?? wanted;
    show(slug);
  }

  await printDiagnostics(matches, names, outputPath, slugs.length, feelTags, legacyTop3);
}

main().catch((err: unknown) => {
  console.error(`\n匹配计算失败：${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
