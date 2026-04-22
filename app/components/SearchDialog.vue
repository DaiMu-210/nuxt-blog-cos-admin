<script setup lang="ts">
import { useIsDesktopProduction } from '~/composables/useDesktopContent';
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const router = useRouter();
const isDesktopProd = useIsDesktopProduction();

const inputRef = ref<HTMLInputElement | null>(null);
const keyword = ref('');

const postsReq = useAsyncData(
  'posts:search',
  async () => {
    if (isDesktopProd.value) {
      const list = await $fetch<any[]>('/api/desktop/posts');
      return (list ?? []).map((p: any) => ({
        ...p,
        path: `/posts/${String(p.slug || '').replace(/^\/+/, '')}`,
      }));
    }
    return await queryCollection('posts').order('date', 'DESC').all();
  },
  {
  immediate: false,
  },
);

const publishedPosts = computed(() => (postsReq.data.value ?? []).filter((p: any) => !p.draft));

const normalized = computed(() => keyword.value.trim().toLowerCase());

function matchPost(p: any, q: string) {
  const title = String(p.title || '').toLowerCase();
  const desc = String(p.description || '').toLowerCase();
  const category = String(p.category || '').toLowerCase();
  const tags = (p.tags ?? []).map((t: any) => String(t).toLowerCase());

  return title.includes(q) || desc.includes(q) || category.includes(q) || tags.some((t: string) => t.includes(q));
}

const results = computed(() => {
  if (!normalized.value) return [];
  return publishedPosts.value.filter((p: any) => matchPost(p, normalized.value));
});

function close() {
  emit('close');
}

async function goToPost(path?: string) {
  if (!path) return;
  await router.push(path);
  close();
}

function onEnter() {
  if (!results.value.length) return;
  void goToPost(results.value[0]?.path);
}

watch(
  () => props.open,
  async (val) => {
    if (!val) return;
    if (!postsReq.data.value?.length && !postsReq.pending.value) {
      await postsReq.execute();
    }
    await nextTick();
    inputRef.value?.focus();
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center px-4 py-16">
        <div class="absolute inset-0 bg-slate-900/30 dark:bg-black/60" @click="close" />
        <div class="relative w-full max-w-xl rounded-lg bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
          <div class="border-b border-slate-100 p-4 dark:border-slate-800">
            <input
              ref="inputRef"
              v-model="keyword"
              type="text"
              placeholder="搜索文章标题/摘要/分类/标签"
              class="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
              @keydown.enter.prevent="onEnter"
              @keydown.esc.prevent="close" />
          </div>

          <div class="p-4">
            <div v-if="postsReq.pending.value" class="text-sm text-slate-500 dark:text-slate-400">加载中...</div>

            <div v-else-if="!normalized" class="text-sm text-slate-500 dark:text-slate-400">输入关键词开始搜索</div>

            <ul v-else-if="results.length" class="mt-1 max-h-64 divide-y divide-slate-100 overflow-auto tw-scrollbar dark:divide-slate-800">
              <li v-for="post in results" :key="post.path" class="py-3">
                <button type="button" class="w-full text-left" @click="goToPost(post.path)">
                  <div class="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {{ post.title || post.path }}
                  </div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span v-if="post.date">{{ post.date }}</span>
                    <span v-if="post.category"> · {{ post.category }}</span>
                    <span v-if="post.tags?.length"> · {{ post.tags.join(', ') }}</span>
                  </div>
                </button>
              </li>
            </ul>

            <div v-else class="text-sm text-slate-500 dark:text-slate-400">没有匹配的文章</div>

            <div class="mt-3 text-xs text-slate-400 dark:text-slate-500">按 Enter 进行搜索</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
