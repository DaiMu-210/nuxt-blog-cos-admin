<script setup lang="ts">
import { useIsDesktopProduction } from '../../composables/useDesktopContent';
const route = useRoute();

const contentRef = ref<HTMLElement | null>(null);
const isDesktopProd = useIsDesktopProduction();
const tocRefreshKey = ref(0);

const slug = computed(() => {
  const s = route.params.slug;
  return Array.isArray(s) ? s.join('/') : String(s || '');
});

const contentPath = computed(() => `/posts/${slug.value}`);

const { data: post } = await useAsyncData(
  () => `post:${slug.value}`,
  async () => {
    if (isDesktopProd.value) {
      return await $fetch(`/api/desktop/posts/${slug.value}`);
    }
    return await queryCollection('posts').path(contentPath.value).first();
  },
);

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' });
}

const tocLinks = computed(() => ((post.value as any)?.body?.toc?.links || []) as any[]);

const viewMeta = computed(() => {
  if (!post.value) return {};
  if (isDesktopProd.value) return (post.value as any)?.meta || {};
  return post.value as any;
});
</script>

<template>
  <article v-if="post">
    <div class="md:flex md:items-start md:gap-8">
      <PostToc :links="tocLinks" :content-el="contentRef" :refresh-key="tocRefreshKey" />

      <div class="min-w-0 flex-1">
        <header class="mb-5 border-b border-slate-100 pb-3 dark:border-slate-800">
          <h1 class="m-0 text-3xl font-bold text-slate-900 dark:text-slate-50">{{ viewMeta?.title }}</h1>
          <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            <span v-if="viewMeta?.date">{{ viewMeta?.date }}</span>
            <span v-if="viewMeta?.category"> · {{ viewMeta?.category }}</span>
            <span v-if="viewMeta?.tags?.length"> · {{ viewMeta?.tags.join(', ') }}</span>
          </div>
          <p v-if="viewMeta?.description" class="mt-3 text-slate-700 dark:text-slate-200">{{ viewMeta?.description }}</p>
        </header>

        <div ref="contentRef" class="prose prose-slate dark:prose-invert max-w-none">
          <MarkdownViewer v-if="isDesktopProd" :value="(post as any)?.body || ''" @rendered="tocRefreshKey++" />
          <ContentRenderer v-else :value="post as any" />
        </div>

        <BeaudarComments />
      </div>
    </div>

    <BackToTopButton />
  </article>
</template>
