<script setup lang="ts">
import { useAdminStats } from '~/composables/useAdminStats';

definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

const { postsReq, stats } = useAdminStats();

const recentPosts = computed(() => (postsReq.data.value ?? []).slice(0, 6));
const heatmapPosts = computed(() => postsReq.data.value ?? []);
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">仪表盘</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">本地管理端仅用于开发环境；静态部署到 COS 不包含 /admin。</p>
      </div>
      <NuxtLink class="tw-btn-primary" to="/admin/posts/new">新建文章</NuxtLink>
    </div>

    <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div class="tw-card p-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">文章</div>
        <div class="mt-2 text-2xl font-extrabold">{{ stats.posts }}</div>
      </div>
      <div class="tw-card p-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">草稿</div>
        <div class="mt-2 text-2xl font-extrabold">{{ stats.drafts }}</div>
      </div>
      <div class="tw-card p-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">分类</div>
        <div class="mt-2 text-2xl font-extrabold">{{ stats.categories }}</div>
      </div>
      <div class="tw-card p-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">标签</div>
        <div class="mt-2 text-2xl font-extrabold">{{ stats.tags }}</div>
      </div>
      <div class="tw-card p-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">友链</div>
        <div class="mt-2 text-2xl font-extrabold">{{ stats.links }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
      <section class="tw-card p-4">
        <div class="mb-3 flex items-baseline justify-between gap-2">
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">最近文章</h2>
          <NuxtLink class="text-sm text-blue-600 hover:underline dark:text-blue-400" to="/admin/posts">查看全部</NuxtLink>
        </div>
        <div v-if="postsReq.pending.value" class="text-sm text-slate-500 dark:text-slate-400">加载中...</div>
        <div v-else-if="postsReq.error.value" class="text-sm text-red-700">
          加载失败：{{ postsReq.error.value?.data?.message || postsReq.error.value?.message }}
        </div>
        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="p in recentPosts" :key="p.slug" class="flex items-center justify-between gap-3 py-3">
            <div class="min-w-0">
              <NuxtLink
                class="font-semibold text-slate-900 no-underline hover:underline dark:text-slate-50"
                :to="`/admin/posts/edit/${p.slug}`">
                {{ p.title || p.slug }}
              </NuxtLink>
              <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{{ p.slug }}</span>
                <span v-if="p.date"> · {{ p.date }}</span>
                <span v-if="p.draft"> · draft</span>
              </div>
            </div>
            <NuxtLink class="text-sm text-blue-600 hover:underline dark:text-blue-400" :to="`/posts/${p.slug}`" target="_blank"
              >预览</NuxtLink
            >
          </li>
        </ul>
      </section>

      <section class="tw-card p-4">
        <h2 class="mb-3 text-base font-semibold text-slate-900 dark:text-slate-50">快捷入口</h2>
        <div class="grid grid-cols-2 gap-3 items-start">
          <NuxtLink
            class="tw-card p-4 font-semibold text-slate-900 no-underline hover:border-slate-300 dark:text-slate-50 dark:hover:border-slate-700"
            to="/admin/posts">
            文章管理
          </NuxtLink>
          <NuxtLink
            class="tw-card p-4 font-semibold text-slate-900 no-underline hover:border-slate-300 dark:text-slate-50 dark:hover:border-slate-700"
            to="/admin/taxonomy">
            分类/标签
          </NuxtLink>
          <NuxtLink
            class="tw-card p-4 font-semibold text-slate-900 no-underline hover:border-slate-300 dark:text-slate-50 dark:hover:border-slate-700"
            to="/admin/site">
            站点设置
          </NuxtLink>
          <NuxtLink
            class="tw-card p-4 font-semibold text-slate-900 no-underline hover:border-slate-300 dark:text-slate-50 dark:hover:border-slate-700"
            to="/admin/links">
            友链管理
          </NuxtLink>
        </div>
      </section>
    </div>

    <section class="tw-card mt-4 p-4">
      <div class="mb-3 flex items-baseline justify-between gap-2">
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">发布活跃度</h2>
        <NuxtLink class="text-sm text-blue-600 hover:underline dark:text-blue-400" to="/admin/posts">文章列表</NuxtLink>
      </div>
      <div v-if="postsReq.pending.value" class="text-sm text-slate-500 dark:text-slate-400">加载中...</div>
      <div v-else-if="postsReq.error.value" class="text-sm text-red-700">
        加载失败：{{ postsReq.error.value?.data?.message || postsReq.error.value?.message }}
      </div>
      <AdminActivityHeatmap v-else :posts="heatmapPosts" />
    </section>
  </section>
</template>
