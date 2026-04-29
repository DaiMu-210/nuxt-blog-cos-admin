import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import matter from 'gray-matter';

function collectSitemapPrerenderRoutes() {
  const maxUrlsPerFile = 45000;
  const topPages = 6; // / /posts /archives /categories /links /murmurs
  const postsDir = resolve(process.cwd(), 'content', 'posts');

  const walk = (dir: string): string[] => {
    const ents = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const ent of ents) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) files.push(...walk(p));
      else files.push(p);
    }
    return files;
  };

  let postCount = 0;
  const categories = new Set<string>();
  try {
    const files = walk(postsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = relative(postsDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
      if (!slug) continue;
      const raw = readFileSync(file, 'utf8');
      const parsed = matter(raw);
      const meta = (parsed.data ?? {}) as any;
      if (meta?.draft) continue;
      postCount += 1;
      categories.add(String(meta?.category || '未分类'));
    }
  } catch {}

  const totalUrls = topPages + postCount + categories.size;
  const parts = Math.max(1, Math.ceil(totalUrls / maxUrlsPerFile));

  const routes: string[] = ['/rss.xml', '/sitemap.xml', '/sitemap-report.json'];
  for (let i = 1; i <= parts; i += 1) routes.push(`/sitemaps/${i}.xml`);
  return routes;
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      script: [
        {
          id: 'theme-init',
          innerHTML:
            "(function(){try{var k='nb-theme';var t=localStorage.getItem(k);var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(!t&&m);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();",
        },
      ],
    },
  },

  modules: ['@nuxt/content', '@nuxtjs/tailwindcss'],

  runtimeConfig: {
    public: {
      desktopMode:
        (process.env.NUXT_DESKTOP || '').trim() === '1' && (process.env.ELECTRON_RUN_AS_NODE || '').trim() === '1',
      siteUrl: '',
      sitemapLocales: '',
      sitemapDefaultLocale: '',
      sitemapLocaleStrategy: 'prefix_except_default',
      plausibleDomain: '',
      plausibleSrc: 'https://plausible.io/js/script.js',
      sentryDsn: '',
      sentrySrc: 'https://browser.sentry-cdn.com/7.120.1/bundle.tracing.min.js',
      sentryTracesSampleRate: 0,
      sentryEnv: '',
      sentryRelease: '',
      beaudarRepo: '',
      beaudarTheme: 'github-light',
      beaudarOrigin: 'https://beaudar.lipk.org',
      beaudarBranch: '',
      utterancesRepo: 'DaiMu-210/nuxt-blog-cos-admin',
      utterancesTheme: 'github-light',
    },
  },

  css: ['@toast-ui/editor/dist/toastui-editor.css', '@toast-ui/editor/dist/theme/toastui-editor-dark.css'],

  tailwindcss: {
    cssPath: '~/app/assets/css/tailwind.css',
  },

  content: {
    experimental: {
      sqliteConnector: 'native',
    },
    build: {
      markdown: {
        toc: {
          // 包含 h3（目录只显示到 h3 即可）
          depth: 3,
          searchDepth: 3,
        },
      },
    },
    renderer: {
      // 本项目目录需求只需要 h2/h3
      anchorLinks: { h1: false, h2: true, h3: true, h4: false, h5: false, h6: false },
    },
  },

  routeRules: {
    // /admin 仅用于本地编辑；静态部署时不生成这些页面
    '/admin/**': { prerender: false },
    // 本地编辑用到的 API；静态部署到对象存储时不存在 serverless runtime
    '/api/**': { prerender: false },
  },

  nitro: {
    // 避免 generate 时尝试预渲染本地管理端与 API
    prerender: {
      ignore: ['/admin', '/admin/**', '/api', '/api/**'],
      routes: collectSitemapPrerenderRoutes(),
    },
  },

  // 处理 dev 时 Vite optimizeDeps 的告警（来自 Nuxt 内部模块的 include 列表）
  vite: {
    optimizeDeps: {
      include: [],
    },
  },
});
