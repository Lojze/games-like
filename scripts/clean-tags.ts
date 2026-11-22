/**
 * 清洗感受标签：data/games.json -> data/feel-tags.json（方案 B：五段流程）
 *
 * 运行：npm run clean:tags（或 node scripts/clean-tags.ts）
 *
 * 处理流程（对每个游戏的 tags 数组）：
 *   ① 小写归一化：normalizeFeelTag()，统一成小写连字符词形
 *   ② 别名替换：按 config/tag-aliases.ts 把 RAWG 原词换成规范词；表中没有的词保留原样
 *   ③ 白名单过滤：只保留 config/feel-whitelist.ts 的 15 个规范词（严格相等）
 *   ④ MIN_DF=5：统计映射后的规范词频次（df = 含该词的游戏数），
 *      同一游戏内多个原词映射到同一规范词只计 1 次；df < 5 的词从最终词汇表移除
 *   ⑤ 输出 { "game-slug": ["tag1", "tag2"] }；清洗后无感受标签的游戏不写入，
 *      即它不会生成推荐页
 *
 * config/feel-whitelist.ts 是唯一的感受标签来源，其余标签一律丢弃。
 * data/games.json 只读；compute-matches.ts 与页面模板不在本脚本职责内。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEL_WHITELIST, normalizeFeelTag } from '../config/feel-whitelist.ts';
import { TAG_ALIASES } from '../config/tag-aliases.ts';

const MIN_DF = 5;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 技术 / 功能 / 类型标签零命中验收用的标记词
const TECH_MARKERS = [
  'Valve',
  'vr mod',
  'Singleplayer',
  'Multiplayer',
  'FPS',
  '1990',
  'Steam Achievements',
  'First-Person',
];

interface GameRecord {
  slug?: unknown;
  tags?: unknown;
}

function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === 'string');
}

async function main(): Promise<void> {
  const sourcePath = resolve(ROOT, 'data', 'games.json');
  const outputPath = resolve(ROOT, 'data', 'feel-tags.json');
  const parsed: unknown = JSON.parse(await readFile(sourcePath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${sourcePath} 的顶层必须是数组`);
  const games = parsed as GameRecord[];

  // 规范化 key -> 白名单规范词形；两侧用同一个 normalizeFeelTag，严格相等匹配
  const index = new Map<string, string>();
  for (const label of FEEL_WHITELIST) {
    const key = normalizeFeelTag(label);
    if (!key) {
      console.warn(`白名单条目「${label}」归一化后为空，已忽略`);
      continue;
    }
    if (index.has(key) && index.get(key) !== label) {
      console.warn(`白名单条目归一化后冲突：${index.get(key)} / ${label}，后者已忽略`);
      continue;
    }
    index.set(key, label);
  }

  // 别名表自检：键必须是归一化词形，值必须落在白名单内，防止配置漂移
  for (const [from, to] of Object.entries(TAG_ALIASES)) {
    if (normalizeFeelTag(from) !== from) {
      throw new Error(`别名键「${from}」不是 normalizeFeelTag() 后的词形`);
    }
    if (!index.has(normalizeFeelTag(to))) {
      throw new Error(`别名目标「${to}」不在 FEEL_WHITELIST 中`);
    }
  }

  let rawTagTotal = 0;
  let aliasApplied = 0; // 原始 tag 条目中命中别名表的数量
  let whitelistHits = 0; // 映射后落在白名单内的原始 tag 条目数（MIN_DF 前）
  const df = new Map<string, number>(); // ④ 每个规范词出现在多少个游戏里
  const contributors = new Map<string, Set<string>>(); // 规范词 <- 哪些归一化原词
  const perGame: Array<{ slug: string; keys: string[] }> = [];
  let missingSlug = 0;

  for (const game of games) {
    const slug = typeof game.slug === 'string' ? game.slug.trim() : '';
    if (!slug) {
      missingSlug++;
      continue;
    }
    const tags = readTags(game.tags);
    rawTagTotal += tags.length;

    const seenInGame = new Set<string>();
    const keys: string[] = [];
    for (const tag of tags) {
      // ① 小写归一化
      const normalized = normalizeFeelTag(tag);
      if (!normalized) continue;

      // ② 别名替换（不在表里的词保留原样）
      const mapped = TAG_ALIASES[normalized] ?? normalized;
      if (mapped !== normalized) aliasApplied++;

      // ③ 白名单过滤（严格相等，不做子串匹配）
      const key = normalizeFeelTag(mapped);
      if (!index.has(key)) continue;
      whitelistHits++;

      if (!contributors.has(key)) contributors.set(key, new Set());
      (contributors.get(key) as Set<string>).add(normalized);

      // ④ df 统计：同一游戏内多个原词映射到同一规范词只计 1 次
      if (seenInGame.has(key)) continue;
      seenInGame.add(key);
      keys.push(key);
      df.set(key, (df.get(key) ?? 0) + 1);
    }
    perGame.push({ slug, keys });
  }

  if (missingSlug > 0) console.warn(`有 ${missingSlug} 条记录缺少 slug，已跳过`);

  const detail = FEEL_WHITELIST.map((label) => {
    const key = normalizeFeelTag(label);
    return { label, key, count: df.get(key) ?? 0 };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  console.log(`\n=== 规范词覆盖率明细（全量 ${games.length} 个游戏，MIN_DF=${MIN_DF}，按填充数降序）===`);
  for (const { label, key, count } of detail) {
    const sources = [...(contributors.get(key) ?? new Set<string>())].sort();
    const pct = `${((count / games.length) * 100).toFixed(1)}%`.padStart(6);
    console.log(
      `  ${count >= MIN_DF ? '保留' : '移除'}  ${String(count).padStart(3)} 个游戏 ${pct}  ` +
        `${label.padEnd(20)} <- ${sources.length ? sources.join(', ') : '(无供给)'}`,
    );
  }

  const removed: Array<{ label: string; count: number }> = [];
  for (const { label, count } of detail) {
    if (count < MIN_DF) {
      removed.push({ label, count });
      console.log(`移除低频标签：${label}，出现次数：${count}`);
    }
  }

  const activeKeys = new Set(
    [...index.keys()].filter((key) => (df.get(key) ?? 0) >= MIN_DF),
  );
  const output: Record<string, string[]> = {};
  let finalPairs = 0;
  let duplicateSlugs = 0;
  for (const { slug, keys } of perGame) {
    const labels = keys
      .filter((key) => activeKeys.has(key))
      .map((key) => index.get(key) as string);
    if (labels.length === 0) continue; // 不生成推荐页
    if (output[slug]) {
      duplicateSlugs++;
      output[slug] = [...new Set([...output[slug], ...labels])];
    } else {
      output[slug] = labels;
    }
  }
  for (const labels of Object.values(output)) finalPairs += labels.length;
  if (duplicateSlugs > 0) console.warn(`有 ${duplicateSlugs} 条重复 slug，已合并感受标签`);

  // ⑤ 写出
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const outputText = JSON.stringify(output);
  const leaked = TECH_MARKERS.filter((marker) =>
    outputText.toLowerCase().includes(marker.toLowerCase()),
  );

  console.log('\n=== 标签清洗统计 ===');
  console.log(`游戏总数: ${games.length}`);
  console.log(`白名单规范词数: ${FEEL_WHITELIST.length}`);
  console.log(`别名映射条数: ${Object.keys(TAG_ALIASES).length}`);
  console.log(`原始 tags 总条目数: ${rawTagTotal}`);
  console.log(`别名替换命中条目数: ${aliasApplied}`);
  console.log(`白名单命中条目数: ${whitelistHits}（MIN_DF 前，映射后统计）`);
  console.log(`最终保留的感受标签条目数: ${finalPairs}`);
  console.log(
    `被 MIN_DF=${MIN_DF} 移除的标签列表: ${
      removed.length ? removed.map((r) => `${r.label}(${r.count})`).join(', ') : '无'
    }`,
  );
  const withFeel = Object.keys(output).length;
  console.log(
    `最终有感受标签的游戏数量: ${withFeel} / ${games.length}（${((withFeel / games.length) * 100).toFixed(2)}%）`,
  );
  console.log(
    `技术标签零命中确认: ${
      leaked.length === 0
        ? `PASS（已检查 ${TECH_MARKERS.length} 个标记词，0 命中）`
        : `FAIL（漏网 ${leaked.join(', ')}）`
    }`,
  );
  console.log(`输出: ${outputPath}`);
}

main().catch((err: unknown) => {
  console.error(`\n清洗失败：${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
