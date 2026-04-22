<script setup lang="ts">
const visible = ref(false)

function updateVisibility() {
  visible.value = window.scrollY > 480
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    updateVisibility()
    ticking = false
  })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <button
    v-show="visible"
    type="button"
    class="fixed right-4 bottom-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900/60 dark:hover:text-slate-50"
    aria-label="返回顶部"
    @click="scrollToTop"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  </button>
</template>
