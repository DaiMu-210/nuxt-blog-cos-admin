<script setup lang="ts">
import { useToast } from '../../../composables/useToast';
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

const {
  data: posts,
  refresh,
  pending,
  error,
} = await useFetch('/api/admin/posts', {
  server: false,
});

const confirmOpen = ref(false);
const targetSlug = ref<string | null>(null);
const deleting = ref(false);
const toast = useToast();

function openDelete(slug: string) {
  targetSlug.value = slug;
  confirmOpen.value = true;
}

function closeDelete() {
  if (deleting.value) return;
  confirmOpen.value = false;
  targetSlug.value = null;
}

function encodeSlug(slug: string) {
  return slug
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

async function confirmDelete() {
  if (!targetSlug.value) return;
  deleting.value = true;
  try {
    await $fetch(`/api/admin/posts/${encodeSlug(targetSlug.value)}`, {
      method: 'DELETE' as any,
      credentials: 'include',
    });
    toast.success('已删除');
    confirmOpen.value = false;
    targetSlug.value = null;
    await refresh();
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '删除失败');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">文章管理</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">管理 content/posts 下的 Markdown 文件。</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink class="tw-btn-primary" to="/admin/posts/new">新建文章</NuxtLink>
        <button class="tw-btn-ghost" type="button" @click="() => refresh()" :disabled="pending">刷新</button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700">无法加载文章列表：{{ error?.data?.message || error?.message }}</p>

    <ul v-if="!error" class="tw-card mt-3 divide-y divide-slate-100 px-4 dark:divide-slate-800">
      <li v-for="p in posts || []" :key="p.slug" class="flex items-center justify-between gap-3 py-4">
        <div class="min-w-0">
          <NuxtLink
            class="font-semibold text-slate-900 no-underline hover:underline dark:text-slate-50"
            :to="`/admin/posts/edit/${p.slug}`">
            {{ p.title || p.slug }}
          </NuxtLink>
          <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{{ p.slug }}</span>
            <span v-if="p.date"> · {{ p.date }}</span>
            <span v-if="p.category"> · {{ p.category }}</span>
            <span v-if="p.draft"> · draft</span>
          </div>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <NuxtLink class="text-sm text-blue-600 hover:underline dark:text-blue-400" :to="`/posts/${p.slug}`" target="_blank"
            >预览</NuxtLink
          >
          <button
            class="text-sm text-red-700 hover:underline disabled:opacity-60 disabled:cursor-not-allowed dark:text-red-300"
            type="button"
            :disabled="deleting"
            @click="openDelete(p.slug)">
            删除
          </button>
        </div>
      </li>
    </ul>

    <ClientOnly>
      <ConfirmDialog
        :open="confirmOpen"
        danger
        title="确认删除"
        :message="targetSlug ? `将永久删除文章：${targetSlug}` : ''"
        confirm-text="删除"
        :loading="deleting"
        @close="closeDelete"
        @confirm="confirmDelete" />
    </ClientOnly>
  </section>
</template>
