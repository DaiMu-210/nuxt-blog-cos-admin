<script setup lang="ts">
import { useIsDesktopProduction, useSiteData } from '~/composables/useDesktopContent'

type MurmurItem = {
  slug?: string
  date?: string
  text?: string
  images?: string[]
  draft?: boolean
}

function toImages(input: any): string[] {
  return (Array.isArray(input) ? input : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 9)
}

function parseTimeMs(s: any): number {
  const t = Date.parse(String(s || ''))
  return Number.isFinite(t) ? t : 0
}

function formatDay(s: any): string {
  const str = String(s || '')
  return str.length >= 10 ? str.slice(0, 10) : '未知日期'
}

function formatHm(s: any): string {
  const t = parseTimeMs(s)
  if (!t) return ''
  const d = new Date(t)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const isDesktopProd = useIsDesktopProduction()
const { data: site } = await useSiteData('site:murmurs')

const { data: raw } = await useAsyncData<any[]>('murmurs:list', async () => {
  if (isDesktopProd.value) return await $fetch<any[]>('/api/desktop/murmurs')
  return (await queryCollection('murmurs').order('date', 'DESC').all()) as any[]
})

const visibleDays = computed(() => Number((site.value as any)?.murmurs?.visibleDays ?? 0))
const cutoffMs = computed(() =>
  visibleDays.value > 0 ? Date.now() - visibleDays.value * 24 * 60 * 60 * 1000 : 0,
)

const items = computed(() => {
  const list = (raw.value ?? [])
    .map((it: any) => {
      const slug = String(it?.slug || '').trim()
      const date = String(it?.date || '').trim()
      const text = String(it?.text || '')
      const images = toImages(it?.images)
      const draft = Boolean(it?.draft)
      return { slug, date, text, images, draft }
    })
    .filter((it) => !it.draft)
    .filter((it) => {
      if (visibleDays.value <= 0) return true
      const t = parseTimeMs(it.date)
      if (!t) return true
      return t >= cutoffMs.value
    })

  list.sort((a, b) => parseTimeMs(b.date) - parseTimeMs(a.date))
  return list
})

const groups = computed(() => {
  const map = new Map<string, any[]>()
  for (const it of items.value) {
    const day = formatDay(it.date)
    const list = map.get(day) ?? []
    list.push(it)
    map.set(day, list)
  }
  return Array.from(map.entries())
})
</script>

<template>
  <section>
    <div class="flex items-baseline justify-between gap-2">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">碎碎念</h1>
      <div v-if="visibleDays > 0" class="text-xs text-slate-500 dark:text-slate-400">仅展示最近 {{ visibleDays }} 天</div>
    </div>

    <div v-if="groups.length" class="mt-4 space-y-6">
      <section v-for="[day, list] in groups" :key="day">
        <h2 class="mb-2 text-base font-semibold text-slate-900 dark:text-slate-50">{{ day }}</h2>
        <ul class="space-y-3">
          <li v-for="it in list" :key="it.slug || it.date" class="tw-card p-4">
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs text-slate-500 dark:text-slate-400">{{ formatHm(it.date) }}</div>
            </div>
            <div v-if="it.text" class="mt-2 whitespace-pre-wrap text-slate-800 dark:text-slate-100">
              {{ it.text }}
            </div>
            <div v-if="it.images?.length" class="mt-3">
              <MurmurGrid :images="it.images" />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <p v-else class="mt-3 text-slate-500 dark:text-slate-400">还没有碎碎念。</p>
  </section>
</template>

