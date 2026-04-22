<script setup lang="ts">
import { useSiteData } from '~/composables/useDesktopContent';
const { data: site } = await useSiteData('site:layout');
const siteData = computed(() => (site.value ?? {}) as any);
const isDev = import.meta.dev;
const config = useRuntimeConfig();
const isDesktopMode = computed(() => Boolean((config as any)?.public?.desktopMode));

useHead({
  link: [{ rel: 'alternate', type: 'application/rss+xml', title: 'RSS', href: '/rss.xml' }],
});

const route = useRoute();
const isSearchOpen = ref(false);
const navItems = computed(() => [
  { to: '/', label: '首页', match: (p: string) => p === '/' },
  { to: '/posts', label: '文章', match: (p: string) => p === '/posts' || p.startsWith('/posts/') },
  { to: '/archives', label: '归档', match: (p: string) => p === '/archives' },
  { to: '/categories', label: '分类', match: (p: string) => p === '/categories' || p.startsWith('/categories/') },
  { to: '/links', label: '友链', match: (p: string) => p === '/links' },
]);

function navLinkClass(active: boolean) {
  return [
    'ml-3 text-sm transition',
    active
      ? 'text-slate-900 font-semibold dark:text-slate-50'
      : 'text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-50',
  ];
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div class="tw-container h-14 flex items-center justify-between">
        <NuxtLink class="font-bold text-slate-900 no-underline dark:text-slate-50" to="/">
          {{ siteData?.title || '我的博客' }}
        </NuxtLink>
        <nav class="flex items-center">
          <NuxtLink v-for="it in navItems" :key="it.to" :to="it.to" :class="navLinkClass(it.match(route.path))">
            {{ it.label }}
          </NuxtLink>
          <ThemeToggleButton class="ml-3" />
          <button
            type="button"
            class="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-slate-50"
            aria-label="搜索"
            @click="isSearchOpen = true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          <NuxtLink
            v-if="isDev || isDesktopMode"
            to="/admin"
            class="ml-3 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
            控制台
          </NuxtLink>
        </nav>
      </div>
    </header>

    <ClientOnly>
      <SearchDialog :open="isSearchOpen" @close="isSearchOpen = false" />
    </ClientOnly>

    <main class="flex-1 py-6">
      <div class="tw-container">
        <slot />
      </div>
    </main>

    <footer class="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div class="tw-container h-14 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span class="font-semibold text-slate-900 dark:text-slate-50">{{ siteData?.title || '我的博客' }}</span>
        <SiteUptime v-if="siteData?.since" :since="siteData.since" />
      </div>
    </footer>
  </div>
</template>
