<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    images: string[]
    startIndex?: number
  }>(),
  { startIndex: 0 },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const index = ref(0)

watch(
  () => [props.open, props.startIndex, props.images] as const,
  () => {
    if (!props.open) return
    const max = Math.max(0, (props.images || []).length - 1)
    const i = Number(props.startIndex || 0)
    index.value = Math.min(max, Math.max(0, i))
  },
  { immediate: true },
)

const canPrev = computed(() => index.value > 0)
const canNext = computed(() => index.value < (props.images || []).length - 1)
const currentSrc = computed(() => String((props.images || [])[index.value] || ''))

function close() {
  emit('close')
}

function prev() {
  if (!canPrev.value) return
  index.value -= 1
}

function next() {
  if (!canNext.value) return
  index.value += 1
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
        <div class="absolute inset-0 bg-slate-900/60 dark:bg-black/80" @click="close" />

        <div class="relative w-full max-w-5xl">
          <div class="absolute right-0 top-0 z-10 flex items-center gap-2 p-2">
            <div class="text-xs text-white/80">{{ index + 1 }} / {{ images.length }}</div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
              aria-label="关闭"
              @click="close">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="relative overflow-hidden rounded-2xl bg-black/20">
            <img v-if="currentSrc" :src="currentSrc" class="mx-auto max-h-[80vh] w-auto select-none object-contain" alt="" />
          </div>

          <div class="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              class="tw-btn-ghost px-3 py-2 text-sm"
              :disabled="!canPrev"
              @click="prev">
              上一张
            </button>
            <button
              type="button"
              class="tw-btn-ghost px-3 py-2 text-sm"
              :disabled="!canNext"
              @click="next">
              下一张
            </button>
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

