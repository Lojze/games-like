import type { APIRoute } from 'astro';

/**
 * 静态构建时输出 dist/robots.txt。
 * Sitemap 地址直接读取 astro.config.mjs 的 site，换正式域名时无需改两处。
 */
export const GET: APIRoute = ({ site, url }) => {
  const sitemapURL = new URL('sitemap-index.xml', site ?? url).href;
  const body = [
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
