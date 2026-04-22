<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

const { theme, toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')
const label = computed(() => (isDark.value ? '切换到明亮主题' : '切换到黑暗主题'))
</script>

<template>
  <button
    type="button"
    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-slate-50"
    :aria-label="label"
    :title="label"
    @click="toggleTheme">
    <svg
      v-if="isDark"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4">
      <path d="M12 3a7 7 0 0 0 9 9a9 9 0 1 1-9-9" />
    </svg>
  </button>
</template>
