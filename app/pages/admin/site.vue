<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

type SocialItem = { label: string; url: string };
type ProjectItem = { name: string; url: string; desc?: string; icon?: string };
type SiteData = {
  title: string;
  since?: string;
  avatar?: string;
  name?: string;
  bio?: string;
  intro?: string;
  social?: SocialItem[];
  projects?: ProjectItem[];
  home?: {
    pinnedSlugs?: string[];
    featuredSlugs?: string[];
    latestCount?: number;
    showStats?: boolean;
  };
};

const { data, pending, error, refresh } = await useFetch<SiteData>('/api/admin/site', {
  server: false,
});

const form = reactive<SiteData>({
  title: '',
  home: { latestCount: 10, showStats: true },
  social: [],
  projects: [],
});

const pinnedInput = ref('');
const featuredInput = ref('');

watchEffect(() => {
  if (!data.value) return;
  Object.assign(form, data.value);
  form.home = { latestCount: 10, showStats: true, ...(data.value.home || {}) };
  form.social = Array.isArray(data.value.social) ? [...data.value.social] : [];
  form.projects = Array.isArray(data.value.projects) ? [...data.value.projects] : [];
  pinnedInput.value = (form.home?.pinnedSlugs || []).join(', ');
  featuredInput.value = (form.home?.featuredSlugs || []).join(', ');
});

function addSocial() {
  form.social = form.social || [];
  form.social.push({ label: '', url: '' });
}
function removeSocial(i: number) {
  form.social = (form.social || []).filter((_, idx) => idx !== i);
}

function addProject() {
  form.projects = form.projects || [];
  form.projects.push({ name: '', url: '', icon: '', desc: '' });
}
function removeProject(i: number) {
  form.projects = (form.projects || []).filter((_, idx) => idx !== i);
}

const saving = ref(false);
const msg = ref<string | null>(null);

async function onSave() {
  msg.value = null;
  saving.value = true;
  try {
    const pinned = pinnedInput.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const featured = featuredInput.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: SiteData = {
      ...form,
      title: (form.title || '').trim(),
      social: (form.social || []).filter((s) => s.label || s.url),
      projects: (form.projects || [])
        .map((p) => ({
          name: String(p.name || '').trim(),
          url: String(p.url || '').trim(),
          icon: String(p.icon || '').trim(),
          desc: String(p.desc || '').trim(),
        }))
        .filter((p) => p.name || p.url)
        .map((p) => ({
          name: p.name,
          url: p.url,
          ...(p.icon ? { icon: p.icon } : {}),
          ...(p.desc ? { desc: p.desc } : {}),
        })),
      home: {
        ...(form.home || {}),
        pinnedSlugs: pinned,
        featuredSlugs: featured,
        latestCount: Number(form.home?.latestCount ?? 10),
        showStats: Boolean(form.home?.showStats),
      },
    };
    await $fetch('/api/admin/site', { method: 'PUT' as any, body: payload } as any);
    msg.value = '已保存';
    await refresh();
    await refreshNuxtData(['site', 'site:layout']);
  } catch (e: any) {
    msg.value = e?.data?.message || e?.message || '保存失败';
  } finally {
    saving.value = false;
    setTimeout(() => (msg.value = null), 1500);
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">站点设置</h1>
        <p class="mt-2 text-sm text-slate-500">这些配置会写入 content/site.json，仅在本地控制台可编辑。</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="tw-btn-primary" type="button" @click="onSave" :disabled="saving || pending">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <NuxtLink class="tw-btn-ghost" to="/">返回首页</NuxtLink>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700">加载失败：{{ error?.data?.message || error?.message }}</p>

    <div v-else class="tw-card p-4">
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-slate-500 mb-2">博客标题</label>
          <input v-model="form.title" class="tw-input" type="text" placeholder="例如：我的博客" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2">建站时间（since）</label>
            <input v-model="form.since" class="tw-input" type="date" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2">头像（URL 或 /public 路径）</label>
            <input v-model="form.avatar" class="tw-input" type="text" placeholder="/avatar.png 或 https://..." />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2">昵称</label>
            <input v-model="form.name" class="tw-input" type="text" placeholder="你的名字" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2">一句话简介</label>
            <input v-model="form.bio" class="tw-input" type="text" placeholder="一句话简介" />
          </div>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2">个人介绍</label>
          <textarea v-model="form.intro" class="tw-textarea min-h-[96px]" rows="3" placeholder="更长的介绍（可选）" />
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2">社交链接</label>
          <div class="space-y-2">
            <div
              v-for="(s, i) in form.social || []"
              :key="i"
              class="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-center">
              <input v-model="s.label" class="tw-input" type="text" placeholder="名称（GitHub）" />
              <input v-model="s.url" class="tw-input" type="text" placeholder="链接（https://...）" />
              <button class="tw-btn-danger px-2 py-1 text-xs" type="button" @click="removeSocial(i)">删除</button>
            </div>
            <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" @click="addSocial">添加一项</button>
          </div>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2">我的项目（首页左侧栏）</label>
          <div class="space-y-2">
            <div
              v-for="(p, i) in form.projects || []"
              :key="i"
              class="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 items-start">
              <div class="space-y-2">
                <input v-model="p.name" class="tw-input" type="text" placeholder="项目名称" />
                <input v-model="p.icon" class="tw-input" type="text" placeholder="图标（可选，例如 🚀）" />
              </div>
              <div class="space-y-2">
                <input v-model="p.url" class="tw-input" type="text" placeholder="链接（https://...）" />
                <input v-model="p.desc" class="tw-input" type="text" placeholder="描述（可选）" />
              </div>
              <button class="tw-btn-danger px-2 py-1 text-xs" type="button" @click="removeProject(i)">删除</button>
            </div>
            <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" @click="addProject">添加项目</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2">置顶文章 Slug（逗号分隔）</label>
            <input v-model="pinnedInput" class="tw-input" type="text" placeholder="2026-04-19-hello, xxx" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2">精选文章 Slug（逗号分隔）</label>
            <input v-model="featuredInput" class="tw-input" type="text" placeholder="2026-04-19-post, yyy" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2">首页最新文章数量</label>
            <input v-model="form.home!.latestCount" class="tw-input" type="number" min="1" step="1" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2">显示统计信息</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="form.home!.showStats" type="checkbox" class="sr-only peer" />
              <span
                class="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>
      </div>

      <p v-if="msg" class="mt-3 text-sm text-emerald-700">{{ msg }}</p>
    </div>
  </section>
</template>
