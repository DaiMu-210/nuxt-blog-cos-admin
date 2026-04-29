<script setup lang="ts">
import { useToast } from '../../composables/useToast'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] })

type MurmurListItem = {
  slug: string
  date?: string
  text?: string
  images?: string[]
  imagesCount?: number
  draft?: boolean
  updatedAt?: string
}

type MurmurData = {
  slug: string
  text: string
  date: string
  images?: string[]
  draft?: boolean
}

function encodeSlug(slug: string) {
  return slug
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

function parseImages(input: string): string[] {
  return String(input || '')
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 9)
}

function parseTimeMs(s: any): number {
  const t = Date.parse(String(s || ''))
  return Number.isFinite(t) ? t : 0
}

function isExpired(dateStr: any, visibleDays: number) {
  if (visibleDays <= 0) return false
  const t = parseTimeMs(dateStr)
  if (!t) return false
  return t < Date.now() - visibleDays * 24 * 60 * 60 * 1000
}

function toDatetimeLocalValue(iso: string) {
  const t = parseTimeMs(iso)
  if (!t) return ''
  const d = new Date(t)
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function fromDatetimeLocalValue(v: string) {
  const s = String(v || '').trim()
  if (!s) return new Date().toISOString()
  const t = Date.parse(s)
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString()
}

const toast = useToast()

const {
  data: murmurs,
  refresh: refreshMurmurs,
  pending: pendingMurmurs,
  error: errorMurmurs,
} = await useFetch<MurmurListItem[]>('/api/admin/murmurs', { server: false })

const { data: site } = await useFetch<any>('/api/admin/site', { server: false })
const visibleDays = computed(() => Number(site.value?.murmurs?.visibleDays ?? 0))

const creating = ref(false)
const newText = ref('')
const newImages = ref('')

async function submitNew() {
  if (creating.value) return
  creating.value = true
  try {
    const payload = {
      text: String(newText.value || '').trim(),
      images: parseImages(newImages.value),
      date: new Date().toISOString(),
      draft: false,
    }
    await $fetch('/api/admin/murmurs', { method: 'POST' as any, body: payload, credentials: 'include' } as any)
    newText.value = ''
    newImages.value = ''
    toast.success('已发布')
    await refreshMurmurs()
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '发布失败')
  } finally {
    creating.value = false
  }
}

const confirmOpen = ref(false)
const targetSlug = ref<string | null>(null)
const deleting = ref(false)

function openDelete(slug: string) {
  targetSlug.value = slug
  confirmOpen.value = true
}

function closeDelete() {
  if (deleting.value) return
  confirmOpen.value = false
  targetSlug.value = null
}

async function confirmDelete() {
  if (!targetSlug.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/murmurs/${encodeSlug(targetSlug.value)}`, {
      method: 'DELETE' as any,
      credentials: 'include',
    })
    toast.success('已删除')
    confirmOpen.value = false
    targetSlug.value = null
    await refreshMurmurs()
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

const editOpen = ref(false)
const editLoading = ref(false)
const editSlug = ref<string | null>(null)
const editText = ref('')
const editImages = ref('')
const editDatetime = ref('')
const editDraft = ref(false)

async function openEdit(slug: string) {
  if (editLoading.value) return
  editLoading.value = true
  try {
    const res = await $fetch<{ slug: string; data: MurmurData }>(`/api/admin/murmurs/${encodeSlug(slug)}`, {
      credentials: 'include',
    })
    editSlug.value = res.slug
    editText.value = String(res.data?.text || '')
    editImages.value = (res.data?.images || []).join('\n')
    editDatetime.value = toDatetimeLocalValue(String(res.data?.date || ''))
    editDraft.value = Boolean(res.data?.draft)
    editOpen.value = true
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '加载失败')
  } finally {
    editLoading.value = false
  }
}

function closeEdit() {
  if (editLoading.value) return
  editOpen.value = false
  editSlug.value = null
}

async function submitEdit() {
  if (!editSlug.value) return
  if (editLoading.value) return
  editLoading.value = true
  try {
    const payload = {
      text: String(editText.value || '').trim(),
      images: parseImages(editImages.value),
      date: fromDatetimeLocalValue(editDatetime.value),
      draft: Boolean(editDraft.value),
    }
    await $fetch(`/api/admin/murmurs/${encodeSlug(editSlug.value)}`, {
      method: 'PUT' as any,
      body: payload,
      credentials: 'include',
    } as any)
    toast.success('已保存')
    editOpen.value = false
    editSlug.value = null
    await refreshMurmurs()
  } catch (e: any) {
    toast.error(e?.data?.message || e?.message || '保存失败')
  } finally {
    editLoading.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">碎碎念</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">纯文本 + 最多 9 张图（URL）。</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="tw-btn-ghost" type="button" @click="() => refreshMurmurs()" :disabled="pendingMurmurs">刷新</button>
        <NuxtLink class="tw-btn-ghost" to="/murmurs" target="_blank">前台预览</NuxtLink>
      </div>
    </div>

    <div class="tw-card p-4">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">内容</label>
          <textarea v-model="newText" class="tw-textarea min-h-[120px]" placeholder="写点什么…" />
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">图片 URL（最多 9 张，换行或逗号分隔）</label>
          <textarea v-model="newImages" class="tw-textarea min-h-[120px]" placeholder="https://...\nhttps://..." />
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="text-xs text-slate-500 dark:text-slate-400">
          <span v-if="visibleDays > 0">当前前台仅展示最近 {{ visibleDays }} 天；更早内容发布时会在前台隐藏。</span>
          <span v-else>当前前台展示不做天数限制（visibleDays=0）。</span>
        </div>
        <button class="tw-btn-primary" type="button" :disabled="creating" @click="submitNew">
          {{ creating ? '发布中...' : '发布' }}
        </button>
      </div>
    </div>

    <p v-if="errorMurmurs" class="mt-3 text-sm text-red-700 dark:text-red-300">
      无法加载列表：{{ errorMurmurs?.data?.message || errorMurmurs?.message }}
    </p>

    <ul v-if="!errorMurmurs" class="mt-3 space-y-3">
      <li v-for="m in murmurs || []" :key="m.slug" class="tw-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs text-slate-500 dark:text-slate-400">
              <span>{{ m.date }}</span>
              <span v-if="m.draft"> · draft</span>
              <span v-else-if="isExpired(m.date, visibleDays)"> · 已过期</span>
            </div>
            <div v-if="m.text" class="mt-2 whitespace-pre-wrap text-slate-900 dark:text-slate-50">
              {{ m.text.length > 160 ? m.text.slice(0, 160) + '…' : m.text }}
            </div>
            <div v-if="m.images?.length" class="mt-3 max-w-[420px]">
              <MurmurGrid :images="m.images" />
            </div>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-2">
            <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" :disabled="editLoading" @click="openEdit(m.slug)">
              编辑
            </button>
            <button
              class="tw-btn-danger px-2 py-1 text-xs"
              type="button"
              :disabled="deleting"
              @click="openDelete(m.slug)">
              删除
            </button>
          </div>
        </div>
      </li>
    </ul>

    <ClientOnly>
      <ConfirmDialog
        :open="confirmOpen"
        danger
        title="确认删除"
        :message="targetSlug ? `将永久删除碎碎念：${targetSlug}` : ''"
        confirm-text="删除"
        :loading="deleting"
        @close="closeDelete"
        @confirm="confirmDelete" />

      <FormDialog :open="editOpen" :loading="editLoading" title="编辑碎碎念" submit-text="保存" @close="closeEdit" @submit="submitEdit">
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">时间</label>
            <input v-model="editDatetime" class="tw-input" type="datetime-local" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">内容</label>
            <textarea v-model="editText" class="tw-textarea min-h-[120px]" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">图片 URL（最多 9 张，换行或逗号分隔）</label>
            <textarea v-model="editImages" class="tw-textarea min-h-[96px]" />
          </div>
          <div class="flex items-center gap-2">
            <input id="edit-draft" v-model="editDraft" type="checkbox" class="h-4 w-4" />
            <label for="edit-draft" class="text-sm text-slate-700 dark:text-slate-200">草稿（前台不展示）</label>
          </div>
        </div>
      </FormDialog>
    </ClientOnly>
  </section>
</template>

