<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] })

const route = useRoute()
const router = useRouter()

const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s.join('/') : String(s || '')
})

type PostMeta = {
  title?: string
  description?: string
  date?: string
  category?: string
  tags?: string[]
  draft?: boolean
  [k: string]: any
}

type AdminPostResponse = {
  slug: string
  meta: PostMeta
  body: string
}

const { data, pending, error } = await useFetch<AdminPostResponse>(
  () => `/api/admin/posts/${slug.value}`,
  { server: false }
)

const meta = reactive<PostMeta>({})
const tagsInput = ref('')
const body = ref('')

watchEffect(() => {
  if (!data.value) return
  Object.assign(meta, data.value.meta || {})
  tagsInput.value = Array.isArray(data.value.meta?.tags) ? (data.value.meta.tags || []).join(', ') : ''
  body.value = data.value.body || ''
})

const saving = ref(false)
const saveMsg = ref<string | null>(null)

async function onSave() {
  saveMsg.value = null
  saving.value = true
  try {
    await $fetch(`/api/admin/posts/${slug.value}`, {
      method: 'PUT' as any,
      body: {
        meta: {
          ...meta,
          tags: tagsInput.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        },
        body: body.value
      }
    } as any)
    saveMsg.value = '已保存'
    setTimeout(() => (saveMsg.value = null), 1500)
  } catch (e: any) {
    saveMsg.value = e?.data?.message || e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function onBack() {
  await router.push('/admin/posts')
}
</script>

<template>
  <section class="mx-auto max-w-none">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" @click="onBack">返回</button>
        <div class="truncate font-mono text-xs text-slate-500">{{ slug }}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink class="tw-btn-ghost px-2 py-1 text-xs" :to="`/posts/${slug}`" target="_blank">预览</NuxtLink>
        <button class="tw-btn-primary px-2 py-1 text-xs" type="button" @click="onSave" :disabled="saving || pending">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700">加载失败：{{ error?.data?.message || error?.message }}</p>

    <div v-else class="grid gap-4 min-[1024px]:grid-cols-[360px_1fr] items-start">
      <div class="tw-card p-4">
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-500 mb-2">标题</label>
            <input v-model="meta.title" class="tw-input" type="text" placeholder="文章标题" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-500 mb-2">日期</label>
              <input v-model="meta.date" class="tw-input" type="date" />
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-2">草稿</label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="meta.draft" type="checkbox" class="sr-only peer" />
                <span
                  class="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
                />
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs text-slate-500 mb-2">分类</label>
            <input v-model="meta.category" class="tw-input" type="text" placeholder="例如：技术 / 随笔" />
          </div>

          <div>
            <label class="block text-xs text-slate-500 mb-2">标签（逗号分隔）</label>
            <input v-model="tagsInput" class="tw-input" type="text" placeholder="nuxt, blog" />
          </div>

          <div>
            <label class="block text-xs text-slate-500 mb-2">描述</label>
            <textarea v-model="meta.description" class="tw-textarea min-h-[72px]" rows="2" placeholder="用于列表摘要/SEO" />
          </div>
        </div>
      </div>

      <div class="tw-card overflow-hidden bg-white h-[60vh] min-[1024px]:h-[calc(100vh-12rem)]">
        <AdminEditor v-model="body" />
      </div>
    </div>

    <p v-if="saveMsg" class="mt-3 text-sm text-emerald-700">{{ saveMsg }}</p>
  </section>
</template>
