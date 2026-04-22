<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] })
const route = useRoute()
const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s.join('/') : String(s || '')
})
await navigateTo(`/admin/posts/edit/${slug.value}`)
</script>

<template>
  <div class="text-sm text-slate-500 dark:text-slate-400">跳转中...</div>
</template>
