<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] })
await navigateTo('/admin/posts/new')
</script>

<template>
  <div class="text-sm text-slate-500">跳转中...</div>
</template>
