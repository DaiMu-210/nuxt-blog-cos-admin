<script setup lang="ts">
const { data: site } = await useAsyncData('site', () => queryCollection('site').first())

const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('posts').order('date', 'DESC').all()
)

const publishedPosts = computed(() =>
  (posts.value ?? []).filter((p: any) => !p.draft)
)

const postsBySlug = computed(() => {
  const map = new Map<string, any>()
  for (const p of publishedPosts.value) {
    const slug = String(p.path || '').replace(/^\/posts\//, '')
    map.set(slug, p)
  }
  return map
})

const pinnedPosts = computed(() => {
  const slugs: string[] = site.value?.home?.pinnedSlugs ?? []
  return slugs.map((s) => postsBySlug.value.get(s)).filter(Boolean)
})

const featuredPosts = computed(() => {
  const slugs: string[] = site.value?.home?.featuredSlugs ?? []
  return slugs.map((s) => postsBySlug.value.get(s)).filter(Boolean)
})

const latestCount = computed(() => Number(site.value?.home?.latestCount ?? 10))
const latestPosts = computed(() => publishedPosts.value.slice(0, latestCount.value))

const stats = computed(() => {
  const categories = new Set<string>()
  const tags = new Set<string>()
  for (const p of publishedPosts.value) {
    if (p.category) categories.add(String(p.category))
    for (const t of p.tags ?? []) tags.add(String(t))
  }
  return {
    posts: publishedPosts.value.length,
    categories: categories.size,
    tags: tags.size
  }
})

const tagCloud = computed(() => {
  const map = new Map<string, number>()
  for (const p of publishedPosts.value) {
    for (const t of p.tags ?? []) {
      const key = String(t)
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  const list = Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  const counts = list.map((x) => x.count)
  const min = Math.min(...counts, 1)
  const max = Math.max(...counts, 1)

  return list.map((x) => {
    const ratio = max === min ? 0.5 : (x.count - min) / (max - min)
    const level = Math.max(0, Math.min(4, Math.round(ratio * 4)))
    return { ...x, level }
  })
})

const tagLevelClass = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'] as const
</script>

<template>
  <section>
    <div class="grid gap-5 min-[920px]:grid-cols-[320px_1fr] items-start">
      <aside class="flex flex-col gap-4 min-[920px]:sticky min-[920px]:top-4">
        <section class="tw-card p-5">
          <div class="flex gap-3 items-start">
            <img
              v-if="site?.avatar"
              class="h-[72px] w-[72px] rounded-full border border-slate-200 object-cover"
              :src="site.avatar"
              alt="avatar"
            />
            <div class="min-w-0">
              <h1 class="m-0 text-2xl font-bold text-slate-900">{{ site?.title || '博客' }}</h1>
              <p v-if="site?.bio" class="mt-2 text-slate-700">{{ site.bio }}</p>
              <p v-if="site?.intro" class="mt-1 text-slate-500">{{ site.intro }}</p>

              <div v-if="site?.social?.length" class="mt-3 flex flex-wrap gap-2">
                <a
                  v-for="s in site.social"
                  :key="s.url"
                  :href="s.url"
                  target="_blank"
                  rel="noreferrer"
                  class="text-sm text-blue-600 hover:underline"
                >
                  {{ s.label }}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section v-if="site?.home?.showStats" class="tw-card p-5">
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <div class="text-lg font-bold text-slate-900">{{ stats.posts }}</div>
              <div class="mt-1 text-xs text-slate-500">文章</div>
            </div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <div class="text-lg font-bold text-slate-900">{{ stats.categories }}</div>
              <div class="mt-1 text-xs text-slate-500">分类</div>
            </div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
              <div class="text-lg font-bold text-slate-900">{{ stats.tags }}</div>
              <div class="mt-1 text-xs text-slate-500">标签</div>
            </div>
          </div>
        </section>

        <section v-if="tagCloud.length" class="tw-card p-5">
          <div class="mb-3 flex items-baseline justify-between gap-2">
            <h2 class="m-0 text-sm font-semibold text-slate-900">词云</h2>
            <NuxtLink class="text-xs text-blue-600 hover:underline" to="/posts">更多</NuxtLink>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="t in tagCloud"
              :key="t.name"
              :to="`/posts?tag=${encodeURIComponent(t.name)}`"
              :title="`${t.name}（${t.count}）`"
              :class="[
                'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 leading-none text-slate-900 no-underline hover:bg-slate-50 hover:border-slate-300',
                tagLevelClass[t.level]
              ]"
            >
              {{ t.name }}
            </NuxtLink>
          </div>
        </section>
      </aside>

      <div class="flex flex-col gap-6">
        <section v-if="pinnedPosts.length">
          <h2 class="m-0 text-base font-semibold text-slate-900">置顶</h2>
          <ul class="mt-2 divide-y divide-slate-100">
            <li v-for="post in pinnedPosts" :key="post.path" class="py-4">
              <NuxtLink class="text-lg font-semibold text-slate-900 no-underline hover:underline" :to="post.path">
                {{ post.title || post.path }}
              </NuxtLink>
              <div class="mt-1 text-sm text-slate-500">
                <span v-if="post.date">{{ post.date }}</span>
                <span v-if="post.category"> · {{ post.category }}</span>
                <span v-if="post.tags?.length"> · {{ post.tags.join(', ') }}</span>
              </div>
              <p v-if="post.description" class="mt-2 text-slate-700">{{ post.description }}</p>
            </li>
          </ul>
        </section>

        <section v-if="featuredPosts.length">
          <h2 class="m-0 text-base font-semibold text-slate-900">精选</h2>
          <ul class="mt-2 divide-y divide-slate-100">
            <li v-for="post in featuredPosts" :key="post.path" class="py-4">
              <NuxtLink class="text-lg font-semibold text-slate-900 no-underline hover:underline" :to="post.path">
                {{ post.title || post.path }}
              </NuxtLink>
              <div class="mt-1 text-sm text-slate-500">
                <span v-if="post.date">{{ post.date }}</span>
                <span v-if="post.category"> · {{ post.category }}</span>
                <span v-if="post.tags?.length"> · {{ post.tags.join(', ') }}</span>
              </div>
              <p v-if="post.description" class="mt-2 text-slate-700">{{ post.description }}</p>
            </li>
          </ul>
        </section>

        <section>
          <div class="flex items-baseline justify-between gap-2">
            <h2 class="m-0 text-base font-semibold text-slate-900">最新文章</h2>
            <NuxtLink class="text-sm text-blue-600 hover:underline" to="/posts">查看全部</NuxtLink>
          </div>

          <ul v-if="latestPosts.length" class="mt-2 divide-y divide-slate-100">
            <li v-for="post in latestPosts" :key="post.path" class="py-4">
              <NuxtLink class="text-lg font-semibold text-slate-900 no-underline hover:underline" :to="post.path">
                {{ post.title || post.path }}
              </NuxtLink>
              <div class="mt-1 text-sm text-slate-500">
                <span v-if="post.date">{{ post.date }}</span>
                <span v-if="post.category"> · {{ post.category }}</span>
                <span v-if="post.tags?.length"> · {{ post.tags.join(', ') }}</span>
              </div>
              <p v-if="post.description" class="mt-2 text-slate-700">{{ post.description }}</p>
            </li>
          </ul>

          <p v-else class="mt-2 text-slate-500">还没有文章。你可以去控制台新建一篇。</p>
        </section>
      </div>
    </div>
  </section>
</template>
