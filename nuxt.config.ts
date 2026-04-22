// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  modules: ['@nuxt/content', '@nuxtjs/tailwindcss'],

  runtimeConfig: {
    public: {
      desktopMode: (process.env.NUXT_DESKTOP || '').trim() === '1',
      siteUrl: '',
      beaudarRepo: '',
      beaudarTheme: 'github-light',
      beaudarOrigin: 'https://beaudar.lipk.org',
      beaudarBranch: '',
      utterancesRepo: 'DaiMu-210/nuxt-blog-cos-admin',
      utterancesTheme: 'github-light',
    },
  },

  css: ['@toast-ui/editor/dist/toastui-editor.css'],

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
      routes: ['/rss.xml'],
    },
  },

  // 处理 dev 时 Vite optimizeDeps 的告警（来自 Nuxt 内部模块的 include 列表）
  vite: {
    optimizeDeps: {
      include: [],
    },
  },
});
