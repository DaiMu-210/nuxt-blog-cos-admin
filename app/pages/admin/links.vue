<script setup lang="ts">
import type { LinkItem, LinksData } from '~/types/links';
import { makeLocalId } from '~/utils/local-id';
import { useToast } from '../../composables/useToast';
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

type LinkItemUI = LinkItem & { _id: string };
type LinkGroupUI = { _id: string; name: string; items: LinkItemUI[] };

const { data, pending, error, refresh } = await useFetch<LinksData>('/api/admin/links', {
  server: false,
});

const groups = ref<LinkGroupUI[]>([]);

function toUI(input: LinksData): LinkGroupUI[] {
  return (input.groups || []).map((g) => ({
    _id: makeLocalId('lg'),
    name: g.name,
    items: (g.items || []).map((i) => ({ ...i, _id: makeLocalId('li') })),
  }));
}

function toPayload(nextGroups: LinkGroupUI[]): LinksData {
  return {
    groups: nextGroups
      .map((g) => ({
        name: String(g.name || '').trim(),
        items: (g.items || [])
          .map((i) => ({
            title: String(i.title || '').trim(),
            url: String(i.url || '').trim(),
            desc: String(i.desc || '').trim(),
            avatar: String(i.avatar || '').trim(),
          }))
          .filter((i) => i.title && i.url)
          .map((i) => ({
            title: i.title,
            url: i.url,
            ...(i.desc ? { desc: i.desc } : {}),
            ...(i.avatar ? { avatar: i.avatar } : {}),
          })),
      }))
      .filter((g) => g.name),
  };
}

watchEffect(() => {
  if (!data.value) return;
  groups.value = toUI(data.value);
});

const saving = ref(false);
const toast = useToast();

async function saveLinks(successMessage = '已保存') {
  if (saving.value) return;
  saving.value = true;
  try {
    await $fetch('/api/admin/links', { method: 'PUT' as any, body: toPayload(groups.value) } as any);
    toast.success(successMessage);
    await refresh();
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '保存失败');
    try {
      await refresh();
    } catch {}
  } finally {
    saving.value = false;
  }
}

const groupDialogOpen = ref(false);
const groupDialogMode = ref<'new' | 'edit'>('new');
const groupForm = reactive({ name: '' });
const targetGroupId = ref<string | null>(null);

function openNewGroup() {
  groupDialogMode.value = 'new';
  groupForm.name = '';
  targetGroupId.value = null;
  groupDialogOpen.value = true;
}

function openEditGroup(groupId: string) {
  const g = groups.value.find((x) => x._id === groupId);
  if (!g) return;
  groupDialogMode.value = 'edit';
  groupForm.name = g.name;
  targetGroupId.value = groupId;
  groupDialogOpen.value = true;
}

function closeGroupDialog() {
  if (saving.value) return;
  groupDialogOpen.value = false;
  targetGroupId.value = null;
}

async function submitGroupDialog() {
  const name = String(groupForm.name || '').trim();
  if (!name) {
    toast.error('分组名称不能为空');
    return;
  }

  if (groupDialogMode.value === 'new') {
    groups.value = [...groups.value, { _id: makeLocalId('lg'), name, items: [] }];
  } else if (targetGroupId.value) {
    const g = groups.value.find((x) => x._id === targetGroupId.value);
    if (!g) return;
    g.name = name;
  }

  groupDialogOpen.value = false;
  targetGroupId.value = null;
  await saveLinks('已保存');
}

const itemDialogOpen = ref(false);
const itemDialogMode = ref<'new' | 'edit'>('new');
const itemForm = reactive({ title: '', url: '', desc: '', avatar: '' });
const targetGroupForItem = ref<string | null>(null);
const targetItemId = ref<string | null>(null);

function openNewItem(groupId: string) {
  itemDialogMode.value = 'new';
  itemForm.title = '';
  itemForm.url = '';
  itemForm.desc = '';
  itemForm.avatar = '';
  targetGroupForItem.value = groupId;
  targetItemId.value = null;
  itemDialogOpen.value = true;
}

function openEditItem(groupId: string, itemId: string) {
  const g = groups.value.find((x) => x._id === groupId);
  const it = g?.items?.find((x) => x._id === itemId);
  if (!g || !it) return;
  itemDialogMode.value = 'edit';
  itemForm.title = it.title || '';
  itemForm.url = it.url || '';
  itemForm.desc = it.desc || '';
  itemForm.avatar = it.avatar || '';
  targetGroupForItem.value = groupId;
  targetItemId.value = itemId;
  itemDialogOpen.value = true;
}

function closeItemDialog() {
  if (saving.value) return;
  itemDialogOpen.value = false;
  targetGroupForItem.value = null;
  targetItemId.value = null;
}

async function submitItemDialog() {
  const groupId = targetGroupForItem.value;
  if (!groupId) return;
  const g = groups.value.find((x) => x._id === groupId);
  if (!g) return;

  const title = String(itemForm.title || '').trim();
  const url = String(itemForm.url || '').trim();
  const desc = String(itemForm.desc || '').trim();
  const avatar = String(itemForm.avatar || '').trim();

  if (!title || !url) {
    toast.error('标题与 URL 不能为空');
    return;
  }

  if (itemDialogMode.value === 'new') {
    g.items = [...(g.items || []), { _id: makeLocalId('li'), title, url, desc, avatar }];
  } else if (targetItemId.value) {
    const it = g.items.find((x) => x._id === targetItemId.value);
    if (!it) return;
    it.title = title;
    it.url = url;
    it.desc = desc;
    it.avatar = avatar;
  }

  itemDialogOpen.value = false;
  targetGroupForItem.value = null;
  targetItemId.value = null;
  await saveLinks('已保存');
}

type ConfirmTarget =
  | { kind: 'group'; groupId: string }
  | { kind: 'item'; groupId: string; itemId: string };

const confirmOpen = ref(false);
const confirmTarget = ref<ConfirmTarget | null>(null);

function requestDeleteGroup(groupId: string) {
  confirmTarget.value = { kind: 'group', groupId };
  confirmOpen.value = true;
}

function requestDeleteItem(groupId: string, itemId: string) {
  confirmTarget.value = { kind: 'item', groupId, itemId };
  confirmOpen.value = true;
}

function closeConfirm() {
  if (saving.value) return;
  confirmOpen.value = false;
  confirmTarget.value = null;
}

async function confirmDelete() {
  const t = confirmTarget.value;
  if (!t) return;

  if (t.kind === 'group') {
    groups.value = groups.value.filter((g) => g._id !== t.groupId);
  } else {
    const g = groups.value.find((x) => x._id === t.groupId);
    if (!g) return;
    g.items = (g.items || []).filter((x) => x._id !== t.itemId);
  }

  confirmOpen.value = false;
  confirmTarget.value = null;
  await saveLinks('已删除');
}

async function onSorted() {
  await saveLinks('已保存');
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">友链管理</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">会写入 content/links.json，仅在本地控制台可编辑。</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="tw-btn-ghost" type="button" :disabled="saving || pending" @click="openNewGroup">新增分组</button>
        <button class="tw-btn-ghost" type="button" :disabled="saving || pending" @click="() => refresh()">刷新</button>
        <NuxtLink class="tw-btn-ghost" to="/links" target="_blank">预览</NuxtLink>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700 dark:text-red-300">加载失败：{{ error?.data?.message || error?.message }}</p>

    <div v-else class="tw-card p-4">
      <div v-if="groups.length" class="space-y-4">
        <SortableList v-model="groups" :item-key="(g) => g._id" :disabled="saving || pending" @change="onSorted">
          <template #default="{ item: g, handleAttrs }">
            <section class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0">
                  <button
                    class="mt-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 cursor-grab active:cursor-grabbing dark:border-slate-700 dark:bg-slate-950"
                    type="button"
                    v-bind="handleAttrs"
                    :disabled="saving || pending"
                    aria-label="拖动排序">
                    <div class="flex flex-col gap-1">
                      <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                      <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                      <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                  </button>
                  <div class="min-w-0">
                    <h2 class="text-base font-semibold text-slate-900 truncate dark:text-slate-50">{{ g.name }}</h2>
                    <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ (g.items || []).length }} 条友链</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap justify-end shrink-0">
                  <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" :disabled="saving || pending" @click="openNewItem(g._id)">
                    新增友链
                  </button>
                  <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" :disabled="saving || pending" @click="openEditGroup(g._id)">
                    编辑
                  </button>
                  <button class="tw-btn-danger px-2 py-1 text-xs" type="button" :disabled="saving || pending" @click="requestDeleteGroup(g._id)">
                    删除
                  </button>
                </div>
              </div>

              <div v-if="(g.items || []).length" class="mt-3">
                <SortableList
                  :model-value="g.items"
                  :item-key="(it) => it._id"
                  :disabled="saving || pending"
                  @update:modelValue="(v) => (g.items = v)"
                  @change="onSorted">
                  <template #default="{ item: it, handleAttrs: itemHandleAttrs }">
                    <div class="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <button
                        class="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 cursor-grab active:cursor-grabbing dark:border-slate-700 dark:bg-slate-950"
                        type="button"
                        v-bind="itemHandleAttrs"
                        :disabled="saving || pending"
                        aria-label="拖动排序">
                        <div class="flex flex-col gap-1">
                          <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                          <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                          <span class="h-0.5 w-4 rounded bg-slate-300 dark:bg-slate-600" />
                        </div>
                      </button>
                      <img
                        v-if="it.avatar"
                        class="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                        :src="it.avatar"
                        alt="avatar" />
                      <div class="min-w-0 flex-1">
                        <a class="font-semibold text-slate-900 no-underline hover:underline dark:text-slate-50" :href="it.url" target="_blank" rel="noreferrer">
                          {{ it.title }}
                        </a>
                        <div v-if="it.desc" class="mt-1 text-slate-700 dark:text-slate-200">{{ it.desc }}</div>
                        <div class="mt-1 text-xs text-slate-500 break-all dark:text-slate-400">{{ it.url }}</div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <button
                          class="tw-btn-ghost px-2 py-1 text-xs"
                          type="button"
                          :disabled="saving || pending"
                          @click="openEditItem(g._id, it._id)">
                          编辑
                        </button>
                        <button
                          class="tw-btn-danger px-2 py-1 text-xs"
                          type="button"
                          :disabled="saving || pending"
                          @click="requestDeleteItem(g._id, it._id)">
                          删除
                        </button>
                      </div>
                    </div>
                  </template>
                </SortableList>
              </div>

              <p v-else class="mt-3 text-sm text-slate-500 dark:text-slate-400">该分组暂无友链。</p>
            </section>
          </template>
        </SortableList>
      </div>

      <p v-else class="text-sm text-slate-500 dark:text-slate-400">还没有分组，点“新增分组”开始。</p>
    </div>

    <ClientOnly>
      <FormDialog
        :open="groupDialogOpen"
        :loading="saving"
        :title="groupDialogMode === 'new' ? '新增分组' : '编辑分组'"
        submit-text="保存"
        @close="closeGroupDialog"
        @submit="submitGroupDialog">
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">分组名称</label>
            <input v-model="groupForm.name" class="tw-input" type="text" placeholder="例如：朋友们" />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        :open="itemDialogOpen"
        :loading="saving"
        :title="itemDialogMode === 'new' ? '新增友链' : '编辑友链'"
        submit-text="保存"
        @close="closeItemDialog"
        @submit="submitItemDialog">
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">标题</label>
            <input v-model="itemForm.title" class="tw-input" type="text" placeholder="网站名称" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">URL</label>
            <input v-model="itemForm.url" class="tw-input" type="text" placeholder="https://..." />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">描述（可选）</label>
            <input v-model="itemForm.desc" class="tw-input" type="text" placeholder="一句话描述" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">头像（可选）</label>
            <input v-model="itemForm.avatar" class="tw-input" type="text" placeholder="https://..." />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        :open="confirmOpen"
        danger
        title="确认删除"
        :message="confirmTarget?.kind === 'group' ? '将删除该分组及其全部友链。' : '将删除该友链。'"
        confirm-text="删除"
        :loading="saving"
        @close="closeConfirm"
        @confirm="confirmDelete" />
    </ClientOnly>
  </section>
</template>
