import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * sitemap 的 lastmod 统一取「本次构建时间」。
 * 静态站没有数据库时间戳，构建时间是「内容最近一次重新生成」的可靠近似：
 * GitHub Actions 每月 1 号刷新 data/ 后触发的构建会让全站 lastmod 自然滚动，
 * 本地手工重新构建同样会刷新。底层按 ISO 字符串输出，故在 serialize 里转成字符串。
 */
const BUILD_DATE = new Date();

/**
 * 按页面类型给出 sitemap 抓取优先级（priority，0.0–1.0）。
 * 权重顺序：首页 > 游戏推荐详情页 > 感受标签聚合页 > 其他页面。
 * 只判断 URL 路径前缀，与具体 slug 无关，将来新增页面无需维护清单。
 * 注意：priority 只是给爬虫的相对提示，不影响实际收录，Google 已公开表示会忽略它，
 * 但保持分级能让站点地图更易读、也便于其他搜索引擎与审计工具理解站点结构。
 */
function sitemapPriority(pathname) {
  if (pathname === '/') return 1.0;
  if (pathname.startsWith('/games-like/')) return 0.8;
  if (pathname.startsWith('/tags/')) return 0.6;
  return 0.4;
}

export default defineConfig({
  // 纯静态输出：所有页面预渲染，不安装任何 SSR adapter
  output: 'static',

  // 站点正式域名。
  // 不能注释掉 site：@astrojs/sitemap 依赖它生成绝对 URL，robots.txt 端点、
  // canonical、og:url / og:image 也都读取它；注释后这些会退化成 localhost。
  // 换域名时只改这一处重新构建，sitemap / robots / canonical 会自动同步。
  site: 'https://playbyfeel.fun',

  integrations: [
    sitemap({
      // robots.txt 是给爬虫看的元文件，不需要出现在站点地图里
      filter: (page) => !page.endsWith('robots.txt'),

      // 给每条 URL 补上 lastmod 与分级 priority。
      // serialize 的返回值会「整体替换」该条目的数据，所以必须用 ...item
      // 把 url / links 等原有字段原样带回，不能只返回新增的两个字段。
      serialize: (item) => {
        let pathname = '/';
        try {
          pathname = new URL(item.url).pathname;
        } catch {
          // sitemap 条目理论上都是绝对 URL；若出现异常则按首页兜底处理
        }
        return {
          ...item,
          lastmod: BUILD_DATE.toISOString(),
          priority: sitemapPriority(pathname),
        };
      },
    }),
  ],

  // Tailwind CSS v4 官方的 Astro 接入方式：通过 Vite 插件（无需 @astrojs/tailwind）
  // 全局样式在 src/styles/global.css 里用 @import "tailwindcss" 引入
  vite: {
    plugins: [tailwindcss()],
  },
});
