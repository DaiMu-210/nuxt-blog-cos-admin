<script setup lang="ts">
const route = useRoute()

const contentRef = ref<HTMLElement | null>(null)

const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s.join('/') : String(s || '')
})

const contentPath = computed(() => `/posts/${slug.value}`)

const { data: post } = await useAsyncData(
  () => `post:${contentPath.value}`,
  () => queryCollection('posts').path(contentPath.value).first()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

const tocLinks = computed(() => (post.value as any)?.body?.toc?.links || [])
</script>

<template>
  <article v-if="post">
    <div class="md:flex md:items-start md:gap-8">
      <PostToc :links="tocLinks" :content-el="contentRef" />

      <div class="min-w-0 flex-1">
        <header class="mb-5 border-b border-slate-100 pb-3">
          <h1 class="m-0 text-3xl font-bold text-slate-900">{{ post?.title }}</h1>
          <div class="mt-2 text-sm text-slate-500">
            <span v-if="post?.date">{{ post?.date }}</span>
            <span v-if="post?.category"> · {{ post?.category }}</span>
            <span v-if="post?.tags?.length"> · {{ post?.tags.join(', ') }}</span>
          </div>
          <p v-if="post?.description" class="mt-3 text-slate-700">{{ post?.description }}</p>
        </header>

        <div ref="contentRef" class="prose prose-slate max-w-none">
          <ContentRenderer :value="post as any" />
        </div>
      </div>
    </div>
  </article>
</template>
