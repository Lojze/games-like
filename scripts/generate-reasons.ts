/**
 * 离线批量生成 "Why it fits" 推荐文案：data/matches.json -> data/reasons.json
 *
 * 运行：node scripts/generate-reasons.ts   /   npm run generate:reasons
 *
 * 本环境没有配置任何大模型 API Key，因此不调用外部 API，改用
 * config/why-it-fits.ts 的规则引擎（组合专属句式 + 通用骨架 + 标签体验短语）。
 * 文案在构建前一次性生成成静态 JSON，运行时零开销；想换成真 LLM 时只需
 * 替换本脚本里 generateWhyItFits 的调用，reasons.json 的结构保持不变。
 *
 * 输出格式：{ "源游戏slug": { "被推荐游戏slug": "英文推荐文案" } }
 *
 * 校验：每页 8 条推荐的句式 ID 必须互不相同；词数落在 25-35 区间。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWhyItFits, whyItFitsTemplateId } from '../config/why-it-fits.ts';

interface MatchItem {
  slug: string;
  score: number;
  shared_tags: string[];
  reason?: string;
}

interface GameRecord {
  slug: string;
  name: string;
}

type Matches = Record<string, MatchItem[]>;
type Reasons = Record<string, Record<string, string>>;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** slug 找不到名字时的降级展示（hades-2018 -> Hades 2018） */
function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

async function main(): Promise<void> {
  const matches = JSON.parse(await readFile(resolve(ROOT, 'data/matches.json'), 'utf8')) as Matches;
  const games = JSON.parse(await readFile(resolve(ROOT, 'data/games.json'), 'utf8')) as GameRecord[];
  const names = new Map(games.map((game) => [game.slug, game.name]));
  const nameOf = (slug: string): string => names.get(slug) ?? humanizeSlug(slug);

  const reasons: Reasons = {};
  let pairs = 0;
  let duplicatePages = 0;
  let missingNames = 0;
  const wordCounts: number[] = [];
  const templateIds = new Map<string, number>();

  for (const [gameASlug, recs] of Object.entries(matches)) {
    const gameAName = nameOf(gameASlug);
    if (!names.has(gameASlug)) missingNames++;
    const page: Record<string, string> = {};
    const usedTemplateIds = new Set<string>();

    recs.forEach((rec, index) => {
      const gameBName = nameOf(rec.slug);
      if (!names.has(rec.slug)) missingNames++;
      const text = generateWhyItFits(gameAName, gameBName, rec.shared_tags ?? [], index);
      page[rec.slug] = text;
      pairs++;
      wordCounts.push(wordCount(text));

      const id = whyItFitsTemplateId(rec.shared_tags ?? [], index);
      usedTemplateIds.add(id);
      templateIds.set(id, (templateIds.get(id) ?? 0) + 1);
    });

    if (usedTemplateIds.size !== recs.length) {
      duplicatePages++;
      console.warn(`  ! ${gameASlug} 有重复句式：${recs.length} 条推荐只用了 ${usedTemplateIds.size} 套句式`);
    }
    reasons[gameASlug] = page;
  }

  const outPath = resolve(ROOT, 'data/reasons.json');
  await writeFile(outPath, `${JSON.stringify(reasons, null, 2)}\n`, 'utf8');

  const min = Math.min(...wordCounts);
  const max = Math.max(...wordCounts);
  const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const inRange = wordCounts.filter((n) => n >= 25 && n <= 35).length;
  const combos = [...templateIds.entries()]
    .filter(([id]) => !id.startsWith('skeleton:'))
    .reduce((sum, [, n]) => sum + n, 0);

  console.log('=== Why it fits 生成完成（规则引擎，无外部 API）===');
  console.log(`输出文件: ${outPath}`);
  console.log(`源游戏页数: ${Object.keys(reasons).length} | 推荐对: ${pairs}`);
  console.log(`同页句式重复页数: ${duplicatePages}（应为 0）`);
  console.log(`词数: min ${min} / max ${max} / avg ${avg.toFixed(1)} | 落在 25-35 词: ${inRange}/${pairs} (${((inRange / pairs) * 100).toFixed(1)}%)`);
  console.log(`命中组合专属句式: ${combos} | 通用骨架: ${pairs - combos}`);
  console.log(`在 games.json 中找不到名字的 slug: ${missingNames}（应为 0）`);
  console.log(`使用的句式 ID 数: ${templateIds.size}`);

  const samplePage = reasons['hades-2018'] ?? Object.values(reasons)[0];
  console.log('\n抽样文案（前 3 条）:');
  Object.entries(samplePage).slice(0, 3).forEach(([slug, text]) => {
    console.log(`  [${slug}] ${text}`);
  });
}

main().catch((err: unknown) => {
  console.error(`\n生成失败：${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
