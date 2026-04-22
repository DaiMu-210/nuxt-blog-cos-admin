<script setup lang="ts">
import { usePostsList } from '~/composables/useDesktopContent';
const route = useRoute()

const { data: posts } = await usePostsList('posts:list')

const publishedPosts = computed(() =>
  (posts.value ?? []).filter((p: any) => !p.draft)
)

const activeTag = computed(() => {
  const q = route.query.tag
  return typeof q === 'string' && q.trim() ? q.trim() : null
})

const filteredPosts = computed(() => {
  if (!activeTag.value) return publishedPosts.value
  return publishedPosts.value.filter((p: any) => (p.tags ?? []).map(String).includes(activeTag.value!))
})
</script>

<template>
  <section>
    <div class="flex items-baseline justify-between gap-2">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">全部文章</h1>
      <div v-if="activeTag" class="flex items-center gap-2">
        <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-900 dark:bg-slate-900/60 dark:text-slate-100">
          标签：{{ activeTag }}
        </span>
        <NuxtLink class="text-sm text-blue-600 hover:underline dark:text-blue-400" to="/posts">清除</NuxtLink>
      </div>
    </div>

    <ul v-if="filteredPosts.length" class="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="post in filteredPosts" :key="post.path" class="py-4">
        <NuxtLink class="text-lg font-semibold text-slate-900 no-underline hover:underline dark:text-slate-50" :to="post.path">
          {{ post.title || post.path }}
        </NuxtLink>
        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span v-if="post.date">{{ post.date }}</span>
          <span v-if="post.category"> · {{ post.category }}</span>
          <span v-if="post.tags?.length"> · {{ post.tags.join(', ') }}</span>
        </div>
        <p v-if="post.description" class="mt-2 text-slate-700 dark:text-slate-200">{{ post.description }}</p>
      </li>
    </ul>

    <p v-else class="mt-3 text-slate-500 dark:text-slate-400">没有匹配的文章。</p>
  </section>
</template>
