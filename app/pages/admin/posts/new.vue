<script setup lang="ts">
import { useToast } from '../../../composables/useToast';
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

const router = useRouter();
const title = ref('');
const slug = ref('');
const creating = ref(false);
const errMsg = ref<string | null>(null);
const toast = useToast();

function suggestSlug() {
  const t = title.value.trim().toLowerCase();
  slug.value =
    t
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-\/]/g, '')
      .replace(/-+/g, '-') || `${new Date().toISOString().slice(0, 10)}-post`;
}

async function onCreate() {
  errMsg.value = null;
  if (!slug.value.trim()) {
    errMsg.value = '请填写 slug（文件名，不含 .md，可包含子目录，如 tech/hello）';
    return;
  }
  creating.value = true;
  try {
    await $fetch('/api/admin/posts', {
      method: 'POST' as any,
      body: {
        slug: slug.value.trim(),
        meta: {
          title: title.value || '未命名',
          date: new Date().toISOString().slice(0, 10),
          tags: [],
          draft: true,
        },
        body: `# ${title.value || '未命名'}\n\n`,
      },
    } as any);
    toast.success('已创建');
    await router.push(`/admin/posts/edit/${slug.value.trim()}`);
  } catch (e: any) {
    errMsg.value = e?.data?.message || e?.message || '创建失败';
    toast.error(errMsg.value || '创建失败');
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">新建文章</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">创建后会生成 content/posts/*.md 文件。</p>
      </div>
      <NuxtLink class="tw-btn-ghost" to="/admin/posts">返回列表</NuxtLink>
    </div>

    <div class="tw-card p-4 max-w-[720px] space-y-4">
      <div>
        <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">标题</label>
        <input
          v-model="title"
          class="tw-input"
          type="text"
          placeholder="例如：我的第一篇文章"
          @blur="!slug && suggestSlug()" />
      </div>

      <div>
        <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">slug（文件名，不含 .md）</label>
        <input v-model="slug" class="tw-input" type="text" placeholder="例如：2026-04-19-hello 或 tech/hello" />
        <button class="tw-btn-ghost mt-2 px-2 py-1 text-xs" type="button" @click="suggestSlug">根据标题建议</button>
      </div>

      <p v-if="errMsg" class="text-sm text-red-700">{{ errMsg }}</p>

      <div class="flex items-center gap-2">
        <button class="tw-btn-primary" type="button" @click="onCreate" :disabled="creating">
          {{ creating ? '创建中...' : '创建' }}
        </button>
      </div>
    </div>
  </section>
</template>
