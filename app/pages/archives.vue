<script setup lang="ts">
import { usePostsList } from '~/composables/useDesktopContent';
const { data: posts } = await usePostsList('posts:archives')

const publishedPosts = computed(() =>
  (posts.value ?? []).filter((p: any) => !p.draft)
)

const groups = computed(() => {
  const map = new Map<string, any[]>()
  for (const p of publishedPosts.value) {
    const month = p.date ? String(p.date).slice(0, 7) : '未知时间'
    const list = map.get(month) ?? []
    list.push(p)
    map.set(month, list)
  }
  return Array.from(map.entries())
})
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">归档</h1>

    <div v-if="groups.length" class="mt-4 space-y-6">
      <section v-for="[month, list] in groups" :key="month">
        <h2 class="mb-2 text-base font-semibold text-slate-900 dark:text-slate-50">{{ month }}</h2>
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="post in list" :key="post.path" class="flex items-baseline gap-3 py-3">
            <span v-if="post.date" class="min-w-[84px] text-xs text-slate-500 dark:text-slate-400">{{ post.date }}</span>
            <NuxtLink class="text-slate-900 no-underline hover:underline dark:text-slate-50" :to="post.path">
              {{ post.title || post.path }}
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <p v-else class="mt-3 text-slate-500 dark:text-slate-400">还没有文章。</p>
  </section>
</template>
