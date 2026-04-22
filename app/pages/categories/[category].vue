<script setup lang="ts">
import { usePostsList } from '~/composables/useDesktopContent';
const route = useRoute();
const slug = computed(() => String(route.params.category || ''));

function fromBase64Url(input: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (typeof g.Buffer !== 'undefined') {
    return g.Buffer.from(input, 'base64url').toString('utf8');
  }
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // 补齐 padding
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  return decodeURIComponent(escape(atob(b64 + pad)));
}

const category = computed(() => {
  try {
    return fromBase64Url(slug.value);
  } catch {
    return slug.value;
  }
});

const { data: posts } = await usePostsList('posts:categories:all');

const list = computed(() =>
  (posts.value ?? [])
    .filter((p: any) => !p.draft)
    .filter((p: any) => String(p.category || '未分类') === category.value),
);
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">分类：{{ category }}</h1>
    <p class="mt-2 mb-4 text-slate-500 dark:text-slate-400">
      <NuxtLink class="tw-link" to="/categories">← 返回分类</NuxtLink>
    </p>

    <ul v-if="list.length" class="divide-y divide-slate-100 dark:divide-slate-800">
      <li v-for="post in list" :key="post.path" class="py-4">
        <NuxtLink class="text-lg font-semibold text-slate-900 no-underline hover:underline dark:text-slate-50" :to="post.path">
          {{ post.title || post.path }}
        </NuxtLink>
        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span v-if="post.date">{{ post.date }}</span>
          <span v-if="post.tags?.length"> · {{ post.tags.join(', ') }}</span>
        </div>
        <p v-if="post.description" class="mt-2 text-slate-700 dark:text-slate-200">{{ post.description }}</p>
      </li>
    </ul>

    <p v-else class="mt-3 text-slate-500 dark:text-slate-400">该分类下还没有文章。</p>
  </section>
</template>
