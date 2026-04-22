<script setup lang="ts">
const route = useRoute();

const items = computed(() => [
  { to: '/admin', label: '仪表盘', icon: '🏠' },
  { to: '/admin/posts', label: '文章管理', icon: '📝' },
  { to: '/admin/site', label: '站点设置', icon: '⚙️' },
  { to: '/admin/links', label: '友链管理', icon: '🔗' },
  { to: '/admin/taxonomy', label: '分类/标签', icon: '🏷️' },
  { to: '/admin/user', label: '用户设置', icon: '👤' },
]);

function isActive(path: string) {
  // /admin（仪表盘）不应该对其他 /admin/* 路由保持 active
  if (path === '/admin') return route.path === '/admin';
  return route.path === path || route.path.startsWith(path + '/');
}

function navItemClass(active: boolean) {
  return [
    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm border whitespace-nowrap transition',
    active
      ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
      : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:hover:border-slate-800',
  ];
}

async function logout() {
  await $fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
  await navigateTo('/admin/login');
}
</script>

<template>
  <div class="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr] bg-slate-50 dark:bg-slate-950">
    <aside
      class="border-b md:border-b-0 md:border-r border-slate-200 bg-white p-3 md:p-4 flex md:flex-col gap-3 md:gap-4 md:sticky md:top-0 md:h-screen overflow-auto dark:border-slate-800 dark:bg-slate-950">
      <div class="flex items-center justify-between gap-3 px-2">
        <div class="font-extrabold whitespace-nowrap text-slate-900 dark:text-slate-50">控制台</div>
        <ThemeToggleButton />
      </div>
      <nav class="flex gap-1 md:flex-col">
        <NuxtLink v-for="it in items" :key="it.to" :class="navItemClass(isActive(it.to))" :to="it.to">
          <span class="w-5 inline-flex justify-center">{{ it.icon }}</span>
          <span>{{ it.label }}</span>
        </NuxtLink>
      </nav>
      <div class="hidden md:block mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
        <NuxtLink
          class="flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-50 dark:hover:bg-slate-900/60"
          to="/">
          ← 返回前台
        </NuxtLink>
        <button
          class="mt-1 flex w-full items-center rounded-xl bg-red-50 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          type="button"
          @click="logout">
          退出登录
        </button>
      </div>
    </aside>

    <main class="p-4 md:p-5 min-h-0 overflow-hidden flex flex-col">
      <div class="flex-1 min-h-0 overflow-auto">
        <slot />
      </div>
    </main>
  </div>
</template>
