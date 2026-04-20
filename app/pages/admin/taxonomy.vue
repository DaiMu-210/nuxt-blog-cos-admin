<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] })

const { data: posts, pending, error, refresh } = await useFetch('/api/admin/posts', { server: false })

const categories = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    const c = String(p.category || '未分类')
    map.set(c, (map.get(c) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

const tags = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    for (const t of p.tags ?? []) {
      const key = String(t)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">分类 / 标签</h1>
        <p class="mt-2 text-sm text-slate-500">基于文章 frontmatter 自动统计。</p>
      </div>
      <button class="tw-btn-ghost" type="button" @click="() => refresh()" :disabled="pending">刷新</button>
    </div>

    <p v-if="error" class="text-sm text-red-700">加载失败：{{ error?.data?.message || error?.message }}</p>

    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section class="tw-card p-4">
        <h2 class="mb-3 text-base font-semibold text-slate-900">分类</h2>
        <div v-if="pending" class="text-sm text-slate-500">加载中...</div>
        <ul v-else class="divide-y divide-slate-100">
          <li v-for="c in categories" :key="c.name" class="flex items-center justify-between gap-3 py-3">
            <span class="font-semibold text-slate-900">{{ c.name }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ c.count }}</span>
          </li>
        </ul>
      </section>

      <section class="tw-card p-4">
        <h2 class="mb-3 text-base font-semibold text-slate-900">标签</h2>
        <div v-if="pending" class="text-sm text-slate-500">加载中...</div>
        <ul v-else class="divide-y divide-slate-100">
          <li v-for="t in tags" :key="t.name" class="flex items-center justify-between gap-3 py-3">
            <span class="font-semibold text-slate-900">{{ t.name }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ t.count }}</span>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
