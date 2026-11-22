import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // 纯静态输出：所有页面预渲染，不安装任何 SSR adapter
  output: 'static',

  // Cloudflare Pages 免费二级域名（占位）。
  // 不能注释掉 site：@astrojs/sitemap 依赖它生成绝对 URL，robots.txt 端点、
  // canonical、og:url / og:image 也都读取它；注释后这些会退化成 localhost。
  // 部署拿到真实的 <project>.pages.dev 后，只改这一处重新构建即可。
  site: 'https://example.pages.dev',

  integrations: [
    sitemap({
      // robots.txt 是给爬虫看的元文件，不需要出现在站点地图里
      filter: (page) => !page.endsWith('robots.txt'),
    }),
  ],

  // Tailwind CSS v4 官方的 Astro 接入方式：通过 Vite 插件（无需 @astrojs/tailwind）
  // 全局样式在 src/styles/global.css 里用 @import "tailwindcss" 引入
  vite: {
    plugins: [tailwindcss()],
  },
});
