<script setup lang="ts">
import { usePostsList } from '~/composables/useDesktopContent';
const { data: posts } = await usePostsList('posts:categories')

const publishedPosts = computed(() =>
  (posts.value ?? []).filter((p: any) => !p.draft)
)

const categories = computed(() => {
  const map = new Map<string, number>()
  for (const p of publishedPosts.value) {
    const c = p.category ? String(p.category) : '未分类'
    map.set(c, (map.get(c) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, slug: toBase64Url(name) }))
    .sort((a, b) => b.count - a.count)
})

function toBase64Url(str: string) {
  // 同时兼容 SSR（Node）与浏览器
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any
  if (typeof g.Buffer !== 'undefined') {
    return g.Buffer.from(str, 'utf8').toString('base64url')
  }
  // 浏览器回退
  const b64 = btoa(unescape(encodeURIComponent(str)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">分类</h1>

    <ul v-if="categories.length" class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="c in categories" :key="c.slug" class="flex items-center justify-between py-3">
        <NuxtLink
          class="font-semibold text-slate-900 no-underline hover:underline dark:text-slate-50"
          :to="`/categories/${c.slug}`"
        >
          {{ c.name }}
        </NuxtLink>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
          {{ c.count }}
        </span>
      </li>
    </ul>

    <p v-else class="mt-3 text-slate-500 dark:text-slate-400">还没有文章。</p>
  </section>
</template>
