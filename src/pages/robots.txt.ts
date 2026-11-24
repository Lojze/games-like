import type { APIRoute } from 'astro';

/**
 * 静态构建时输出 dist/robots.txt。
 * Sitemap 地址直接读取 astro.config.mjs 的 site，换正式域名时无需改两处。
 *
 * AI 爬虫显式放行：OAI-SearchBot（ChatGPT Search）、PerplexityBot、
 * Google-Extended（Gemini / AI Overviews 的内容使用信号）各自拥有独立
 * User-agent 组并 Allow: /。robots.txt 的匹配规则是「最具体优先」，
 * 因此即使以后给 `*` 组加了 Disallow，这三个 AI 爬虫也不会被连带屏蔽。
 * 全站当前没有任何 Disallow 规则，也没有 noindex 页面。
 */
export const GET: APIRoute = ({ site, url }) => {
  const sitemapURL = new URL('sitemap-index.xml', site ?? url).href;
  // 每个 AI 爬虫单独成组，明确写出 Allow，避免被通用组的未来改动误伤
  const AI_BOTS = ['OAI-SearchBot', 'PerplexityBot', 'Google-Extended'];
  const aiRules = AI_BOTS.flatMap((bot) => [
    `User-agent: ${bot}`,
    'Allow: /',
    '',
  ]);
  const body = [
    '# AI / LLM crawlers are explicitly welcome (see comments in robots.txt.ts).',
    ...aiRules,
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemapURL}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
