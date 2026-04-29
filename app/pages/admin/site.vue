<script setup lang="ts">
import type { ProjectItem, SiteData, SocialItem } from '~/types/site';
import { makeLocalId } from '~/utils/local-id';
import { useToast } from '../../composables/useToast';
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

type SocialUI = SocialItem & { _id: string };
type ProjectUI = ProjectItem & { _id: string };

const { data, pending, error, refresh } = await useFetch<SiteData>('/api/admin/site', {
  server: false,
});

const form = reactive<SiteData>({
  title: '',
  home: { latestCount: 10, showStats: true },
  murmurs: { visibleDays: 0 },
  social: [],
  projects: [],
  comments: {
    beaudarRepo: '',
    beaudarTheme: 'github-light',
    beaudarOrigin: 'https://beaudar.lipk.org',
    beaudarBranch: '',
  },
});

const pinnedInput = ref('');
const featuredInput = ref('');
const savedBase = ref<SiteData | null>(null);

watchEffect(() => {
  if (!data.value) return;
  savedBase.value = JSON.parse(JSON.stringify(data.value));
  Object.assign(form, data.value);
  form.home = { latestCount: 10, showStats: true, ...(data.value.home || {}) };
  form.murmurs = { visibleDays: Number((data.value as any)?.murmurs?.visibleDays ?? 0) };
  form.social = Array.isArray(data.value.social)
    ? (data.value.social as SocialItem[]).map((s) => ({ ...s, _id: makeLocalId('social') }) as any)
    : [];
  form.projects = Array.isArray(data.value.projects)
    ? (data.value.projects as ProjectItem[]).map((p) => ({ ...p, _id: makeLocalId('proj') }) as any)
    : [];
  form.comments = {
    beaudarRepo: String((data.value as any)?.comments?.beaudarRepo || ''),
    beaudarTheme: String((data.value as any)?.comments?.beaudarTheme || 'github-light'),
    beaudarOrigin: String((data.value as any)?.comments?.beaudarOrigin || 'https://beaudar.lipk.org'),
    beaudarBranch: String((data.value as any)?.comments?.beaudarBranch || ''),
  };
  pinnedInput.value = (form.home?.pinnedSlugs || []).join(', ');
  featuredInput.value = (form.home?.featuredSlugs || []).join(', ');
});

function sanitizeSocial(list: SocialUI[]): SocialItem[] {
  return (list || [])
    .map((s) => ({ label: String(s.label || '').trim(), url: String(s.url || '').trim() }))
    .filter((s) => s.label || s.url);
}

function sanitizeProjects(list: ProjectUI[]): ProjectItem[] {
  return (list || [])
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
    }));
}

function addSocial() {
  form.social = (form.social || []) as any;
  (form.social as any).push({ _id: makeLocalId('social'), label: '', url: '' });
}

const savingAll = ref(false);
const savingLists = ref(false);
const toast = useToast();

async function saveSiteLists(successMessage = '已保存') {
  if (savingLists.value) return;
  const base = savedBase.value;
  if (!base) return;
  savingLists.value = true;
  try {
    const payload: SiteData = {
      ...base,
      social: sanitizeSocial((form.social || []) as any),
      projects: sanitizeProjects((form.projects || []) as any),
    };
    await $fetch('/api/admin/site', { method: 'PUT' as any, body: payload } as any);
    toast.success(successMessage);
    savedBase.value = payload;
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '保存失败');
    try {
      await refresh();
    } catch {}
  } finally {
    savingLists.value = false;
  }
}

const projectDialogOpen = ref(false);
const projectDialogMode = ref<'new' | 'edit'>('new');
const projectForm = reactive({ name: '', url: '', icon: '', desc: '' });
const targetProjectId = ref<string | null>(null);

function openNewProject() {
  projectDialogMode.value = 'new';
  projectForm.name = '';
  projectForm.url = '';
  projectForm.icon = '';
  projectForm.desc = '';
  targetProjectId.value = null;
  projectDialogOpen.value = true;
}

function openEditProject(projectId: string) {
  const p = ((form.projects || []) as any as ProjectUI[]).find((x) => x._id === projectId);
  if (!p) return;
  projectDialogMode.value = 'edit';
  projectForm.name = p.name || '';
  projectForm.url = p.url || '';
  projectForm.icon = p.icon || '';
  projectForm.desc = p.desc || '';
  targetProjectId.value = projectId;
  projectDialogOpen.value = true;
}

function closeProjectDialog() {
  if (savingLists.value) return;
  projectDialogOpen.value = false;
  targetProjectId.value = null;
}

async function submitProjectDialog() {
  const name = String(projectForm.name || '').trim();
  const url = String(projectForm.url || '').trim();
  const icon = String(projectForm.icon || '').trim();
  const desc = String(projectForm.desc || '').trim();

  if (!name && !url) {
    toast.error('项目名称或链接至少填写一项');
    return;
  }

  const list = ((form.projects || []) as any as ProjectUI[]).slice();
  if (projectDialogMode.value === 'new') {
    list.push({ _id: makeLocalId('proj'), name, url, icon, desc });
  } else if (targetProjectId.value) {
    const idx = list.findIndex((x) => x._id === targetProjectId.value);
    if (idx < 0) return;
    const current = list[idx];
    if (!current) return;
    list[idx] = { ...current, _id: current._id, name, url, icon, desc };
  }
  form.projects = list as any;
  projectDialogOpen.value = false;
  targetProjectId.value = null;
  await saveSiteLists('已保存');
}

type ConfirmTarget = { kind: 'social'; id: string } | { kind: 'project'; id: string };
const confirmOpen = ref(false);
const confirmTarget = ref<ConfirmTarget | null>(null);

function requestDeleteSocial(id: string) {
  confirmTarget.value = { kind: 'social', id };
  confirmOpen.value = true;
}

function requestDeleteProject(id: string) {
  confirmTarget.value = { kind: 'project', id };
  confirmOpen.value = true;
}

function closeConfirm() {
  if (savingLists.value) return;
  confirmOpen.value = false;
  confirmTarget.value = null;
}

async function confirmDelete() {
  const t = confirmTarget.value;
  if (!t) return;
  if (t.kind === 'social') {
    form.social = (((form.social || []) as any as SocialUI[]).filter((x) => x._id !== t.id) as any) || [];
  } else {
    form.projects = (((form.projects || []) as any as ProjectUI[]).filter((x) => x._id !== t.id) as any) || [];
  }
  confirmOpen.value = false;
  confirmTarget.value = null;
  await saveSiteLists('已删除');
}

async function onSave() {
  savingAll.value = true;
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
      social: sanitizeSocial((form.social || []) as any),
      projects: sanitizeProjects((form.projects || []) as any),
      murmurs: {
        visibleDays: Number((form as any)?.murmurs?.visibleDays ?? 0),
      },
      home: {
        ...(form.home || {}),
        pinnedSlugs: pinned,
        featuredSlugs: featured,
        latestCount: Number(form.home?.latestCount ?? 10),
        showStats: Boolean(form.home?.showStats),
      },
      comments: {
        beaudarRepo: String(form.comments?.beaudarRepo || '').trim(),
        beaudarTheme: String(form.comments?.beaudarTheme || 'github-light').trim() || 'github-light',
        beaudarBranch: String(form.comments?.beaudarBranch || '').trim(),
        beaudarOrigin:
          String(form.comments?.beaudarOrigin || 'https://beaudar.lipk.org').trim() || 'https://beaudar.lipk.org',
      },
    };
    await $fetch('/api/admin/site', { method: 'PUT' as any, body: payload } as any);
    toast.success('已保存');
    savedBase.value = JSON.parse(JSON.stringify(payload));
    await refreshNuxtData(['site', 'site:layout']);
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '保存失败');
  } finally {
    savingAll.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">站点设置</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          这些配置会写入 content/site.json，仅在本地控制台可编辑。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="tw-btn-primary" type="button" @click="onSave" :disabled="savingAll || pending">
          {{ savingAll ? '保存中...' : '保存' }}
        </button>
        <NuxtLink class="tw-btn-ghost" to="/">返回首页</NuxtLink>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700 dark:text-red-300">
      加载失败：{{ error?.data?.message || error?.message }}
    </p>

    <div v-else class="tw-card p-4">
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">博客标题</label>
          <input v-model="form.title" class="tw-input" type="text" placeholder="例如：我的博客" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">建站时间（since）</label>
            <input v-model="form.since" class="tw-input" type="date" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">头像（URL 或 /public 路径）</label>
            <input v-model="form.avatar" class="tw-input" type="text" placeholder="/avatar.png 或 https://..." />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">昵称</label>
            <input v-model="form.name" class="tw-input" type="text" placeholder="你的名字" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">一句话简介</label>
            <input v-model="form.bio" class="tw-input" type="text" placeholder="一句话简介" />
          </div>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">个人介绍</label>
          <textarea v-model="form.intro" class="tw-textarea min-h-[96px]" rows="3" placeholder="更长的介绍（可选）" />
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">社交链接</label>
          <div class="space-y-2">
            <SortableList
              :model-value="(form.social || []) as any"
              :item-key="(s: any) => s._id"
              :disabled="savingLists || savingAll || pending"
              @update:modelValue="(v) => (form.social = v as any)"
              @change="() => saveSiteLists('已保存')">
              <template #default="{ item: s, handleAttrs }">
                <div
                  class="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-950">
                  <button
                    class="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 cursor-grab active:cursor-grabbing dark:border-slate-700 dark:bg-slate-950"
                    type="button"
                    v-bind="handleAttrs"
                    :disabled="savingLists || savingAll || pending"
                    aria-label="拖动排序">
                    <div class="flex flex-col gap-1">
                      <span class="h-0.5 w-4 rounded bg-slate-300" />
                      <span class="h-0.5 w-4 rounded bg-slate-300" />
                      <span class="h-0.5 w-4 rounded bg-slate-300" />
                    </div>
                  </button>
                  <div class="grid w-full grid-cols-1 gap-2 md:grid-cols-[160px_1fr]">
                    <input v-model="(s as any).label" class="tw-input" type="text" placeholder="名称（GitHub）" />
                    <input v-model="(s as any).url" class="tw-input" type="text" placeholder="链接（https://...）" />
                  </div>
                  <div class="flex items-center justify-end gap-2 shrink-0">
                    <button
                      class="tw-btn-danger px-2 py-1 text-xs"
                      type="button"
                      :disabled="savingLists || savingAll || pending"
                      @click="requestDeleteSocial((s as any)._id)">
                      删除
                    </button>
                  </div>
                </div>
              </template>
            </SortableList>
            <button
              class="tw-btn-ghost px-2 py-1 text-xs"
              type="button"
              :disabled="savingLists || savingAll || pending"
              @click="addSocial">
              添加一项
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">我的项目（首页左侧栏）</label>
          <div class="space-y-2">
            <SortableList
              :model-value="(form.projects || []) as any"
              :item-key="(p: any) => p._id"
              :disabled="savingLists || savingAll || pending"
              @update:modelValue="(v) => (form.projects = v as any)"
              @change="() => saveSiteLists('已保存')">
              <template #default="{ item: p, handleAttrs }">
                <div
                  class="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <button
                    class="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 cursor-grab active:cursor-grabbing dark:border-slate-700 dark:bg-slate-950"
                    type="button"
                    v-bind="handleAttrs"
                    :disabled="savingLists || savingAll || pending"
                    aria-label="拖动排序">
                    <div class="flex flex-col gap-1">
                      <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                      <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                      <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                  </button>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <div v-if="(p as any).icon" class="text-lg">{{ (p as any).icon }}</div>
                      <div class="font-semibold text-slate-900 truncate dark:text-slate-50">
                        {{ (p as any).name || '未命名项目' }}
                      </div>
                    </div>
                    <div v-if="(p as any).desc" class="mt-1 text-slate-700 dark:text-slate-200">
                      {{ (p as any).desc }}
                    </div>
                    <div v-if="(p as any).url" class="mt-1 text-xs text-slate-500 break-all dark:text-slate-400">
                      {{ (p as any).url }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      class="tw-btn-ghost px-2 py-1 text-xs"
                      type="button"
                      :disabled="savingLists || savingAll || pending"
                      @click="openEditProject((p as any)._id)">
                      编辑
                    </button>
                    <button
                      class="tw-btn-danger px-2 py-1 text-xs"
                      type="button"
                      :disabled="savingLists || savingAll || pending"
                      @click="requestDeleteProject((p as any)._id)">
                      删除
                    </button>
                  </div>
                </div>
              </template>
            </SortableList>
            <button
              class="tw-btn-ghost px-2 py-1 text-xs"
              type="button"
              :disabled="savingLists || savingAll || pending"
              @click="openNewProject">
              添加项目
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">评论仓库（Beaudar，owner/repo）</label>
            <input v-model="form.comments!.beaudarRepo" class="tw-input" type="text" placeholder="owner/repo" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">评论主题</label>
            <select v-model="form.comments!.beaudarTheme" class="tw-input">
              <option value="github-light">github-light</option>
              <option value="github-dark">github-dark</option>
              <option value="preferred-color-scheme">preferred-color-scheme</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">Beaudar 服务地址</label>
          <input
            v-model="form.comments!.beaudarOrigin"
            class="tw-input"
            type="text"
            placeholder="https://beaudar.lipk.org" />
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">Beaudar 分支（branch，可选）</label>
          <input v-model="form.comments!.beaudarBranch" class="tw-input" type="text" placeholder="main" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">置顶文章 Slug（逗号分隔）</label>
            <input v-model="pinnedInput" class="tw-input" type="text" placeholder="2026-04-19-hello, xxx" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">精选文章 Slug（逗号分隔）</label>
            <input v-model="featuredInput" class="tw-input" type="text" placeholder="2026-04-19-post, yyy" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">首页最新文章数量</label>
            <input v-model="form.home!.latestCount" class="tw-input" type="number" min="1" step="1" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">显示统计信息</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="form.home!.showStats" type="checkbox" class="sr-only peer" />
              <span
                class="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-slate-800 dark:peer-checked:bg-slate-200 dark:after:bg-slate-950" />
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">碎碎念可见天数（0=全部可见）</label>
            <input v-model="form.murmurs!.visibleDays" class="tw-input" type="number" min="0" step="1" />
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            仅对前台展示与发布产物生效。设置为 7 表示只展示最近 7 天内的碎碎念。
          </div>
        </div>
      </div>
    </div>

    <ClientOnly>
      <FormDialog
        :open="projectDialogOpen"
        :loading="savingLists"
        :title="projectDialogMode === 'new' ? '添加项目' : '编辑项目'"
        submit-text="保存"
        @close="closeProjectDialog"
        @submit="submitProjectDialog">
        <div class="space-y-3">
          <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">项目名称</label>
              <input v-model="projectForm.name" class="tw-input" type="text" placeholder="例如：我的工具集" />
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">图标（可选）</label>
              <input v-model="projectForm.icon" class="tw-input" type="text" placeholder="例如：🚀" />
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">链接</label>
            <input v-model="projectForm.url" class="tw-input" type="text" placeholder="https://..." />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">描述（可选）</label>
            <input v-model="projectForm.desc" class="tw-input" type="text" placeholder="一句话描述" />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        :open="confirmOpen"
        danger
        title="确认删除"
        :message="confirmTarget?.kind === 'project' ? '将删除该项目。' : '将删除该社交链接。'"
        confirm-text="删除"
        :loading="savingLists"
        @close="closeConfirm"
        @confirm="confirmDelete" />
    </ClientOnly>
  </section>
</template>
