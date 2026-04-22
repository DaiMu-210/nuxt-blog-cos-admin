<script setup lang="ts">
import { useAppBoot } from '../composables/useAppBoot';
import { useSiteData } from '../composables/useDesktopContent';

const { bootPending } = useAppBoot();
const { data: site } = useSiteData('site:splash');
</script>

<template>
  <Transition name="boot">
    <div
      v-if="bootPending"
      class="fixed inset-0 z-[1100] flex items-center justify-center bg-white dark:bg-slate-950"
      aria-busy="true"
      aria-live="polite">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin dark:border-slate-800 dark:border-t-slate-200" />
        <div class="text-base font-semibold text-slate-900 dark:text-slate-50">欢迎访问</div>
        <div v-if="site?.title" class="text-sm text-slate-500 dark:text-slate-400">{{ site.title }}</div>
      </div>
    </div>
  </Transition>
</template>
