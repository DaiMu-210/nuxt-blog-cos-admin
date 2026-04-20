<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] })

type LinkItem = { title: string; url: string; desc?: string; avatar?: string }
type LinkGroup = { name: string; items: LinkItem[] }
type LinksData = { groups: LinkGroup[] }

const { data, pending, error, refresh } = await useFetch<LinksData>('/api/admin/links', {
  server: false
})

const form = reactive<LinksData>({ groups: [] })
watchEffect(() => {
  if (!data.value) return
  form.groups = (data.value.groups || []).map((g) => ({
    name: g.name,
    items: (g.items || []).map((i) => ({ ...i }))
  }))
})

function addGroup() {
  form.groups.push({ name: '新分组', items: [] })
}
function removeGroup(index: number) {
  form.groups = form.groups.filter((_, i) => i !== index)
}
function addItem(groupIndex: number) {
  const g = form.groups[groupIndex]
  if (!g) return
  g.items.push({ title: '', url: '', desc: '', avatar: '' })
}
function removeItem(groupIndex: number, itemIndex: number) {
  const g = form.groups[groupIndex]
  if (!g) return
  g.items = g.items.filter((_, i) => i !== itemIndex)
}

const saving = ref(false)
const msg = ref<string | null>(null)

async function onSave() {
  msg.value = null
  saving.value = true
  try {
    const payload: LinksData = {
      groups: form.groups
        .filter((g) => g.name)
        .map((g) => ({
          name: g.name,
          items: (g.items || [])
            .filter((i) => i.title && i.url)
            .map((i) => ({
              title: i.title,
              url: i.url,
              desc: i.desc || undefined,
              avatar: i.avatar || undefined
            }))
        }))
    }
    await $fetch('/api/admin/links', { method: 'PUT' as any, body: payload } as any)
    msg.value = '已保存'
    await refresh()
  } catch (e: any) {
    msg.value = e?.data?.message || e?.message || '保存失败'
  } finally {
    saving.value = false
    setTimeout(() => (msg.value = null), 1500)
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">友链管理</h1>
        <p class="mt-2 text-sm text-slate-500">会写入 content/links.json，仅在本地控制台可编辑。</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="tw-btn-ghost" type="button" @click="addGroup">新增分组</button>
        <button class="tw-btn-primary" type="button" @click="onSave" :disabled="saving || pending">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <NuxtLink class="tw-btn-ghost" to="/links" target="_blank">预览</NuxtLink>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700">加载失败：{{ error?.data?.message || error?.message }}</p>

    <div v-else class="tw-card p-4">
      <div v-if="form.groups.length" class="space-y-4">
        <section v-for="(g, gi) in form.groups" :key="gi" class="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input v-model="g.name" type="text" class="tw-input md:max-w-[420px]" placeholder="分组名称" />
            <div class="flex items-center gap-2 flex-wrap justify-end">
              <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" @click="addItem(gi)">新增友链</button>
              <button class="tw-btn-danger px-2 py-1 text-xs" type="button" @click="removeGroup(gi)">删除分组</button>
            </div>
          </div>

          <div v-if="g.items.length" class="mt-3 space-y-3">
            <div v-for="(it, ii) in g.items" :key="ii" class="tw-card p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-500 mb-2">标题</label>
                  <input v-model="it.title" class="tw-input" type="text" placeholder="网站名称" />
                </div>
                <div>
                  <label class="block text-xs text-slate-500 mb-2">URL</label>
                  <input v-model="it.url" class="tw-input" type="text" placeholder="https://..." />
                </div>
              </div>

              <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-500 mb-2">描述</label>
                  <input v-model="it.desc" class="tw-input" type="text" placeholder="一句话描述（可选）" />
                </div>
                <div>
                  <label class="block text-xs text-slate-500 mb-2">头像</label>
                  <input v-model="it.avatar" class="tw-input" type="text" placeholder="https://...（可选）" />
                </div>
              </div>

              <div class="mt-3 flex justify-end">
                <button class="tw-btn-danger px-2 py-1 text-xs" type="button" @click="removeItem(gi, ii)">删除这条</button>
              </div>
            </div>
          </div>

          <p v-else class="mt-3 text-sm text-slate-500">该分组暂无友链。</p>
        </section>
      </div>

      <p v-else class="text-sm text-slate-500">还没有分组，点“新增分组”开始。</p>

      <p v-if="msg" class="mt-3 text-sm text-emerald-700">{{ msg }}</p>
    </div>
  </section>
</template>
