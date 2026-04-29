<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    images: string[]
  }>(),
  { images: () => [] },
)

const list = computed(() => (props.images || []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 9))

const gridClass = computed(() => {
  const n = list.value.length
  if (n === 1) return 'grid grid-cols-1 gap-2'
  if (n === 2) return 'grid grid-cols-2 gap-2'
  if (n === 4) return 'grid grid-cols-2 gap-2'
  return 'grid grid-cols-3 gap-2'
})

const previewOpen = ref(false)
const previewIndex = ref(0)

function openPreview(i: number) {
  previewIndex.value = i
  previewOpen.value = true
}
</script>

<template>
  <div v-if="list.length" :class="gridClass">
    <button
      v-for="(src, i) in list"
      :key="src + ':' + i"
      type="button"
      class="group relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900"
      @click="openPreview(i)">
      <img
        :src="src"
        class="h-full w-full select-none object-cover transition duration-200 group-hover:scale-[1.02]"
        :class="list.length === 1 ? 'aspect-[4/3]' : 'aspect-square'"
        alt="" />
    </button>

    <ImagePreviewDialog :open="previewOpen" :images="list" :start-index="previewIndex" @close="previewOpen = false" />
  </div>
</template>

