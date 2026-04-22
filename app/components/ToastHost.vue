<script setup lang="ts">
import { computed } from 'vue';
import { useToast, type ToastKind } from '../composables/useToast';

const toast = useToast();
const items = computed(() => (Array.isArray(toast.toasts.value) ? toast.toasts.value.filter(Boolean) : []));

function kindClass(kind: ToastKind) {
  if (kind === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (kind === 'error') return 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200';
  return 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';
}
</script>

<template>
  <div class="fixed top-4 right-4 z-1000 pointer-events-none">
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2 items-end">
      <div
        v-for="t in items"
        :key="t.id"
        class="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-2xl border px-3 py-2 shadow-lg"
        :class="kindClass(t.kind)"
        role="status"
        aria-live="polite">
        <div class="flex items-start gap-2">
          <div class="text-sm leading-5 flex-1 wrap-break-word">
            {{ t.message }}
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100"
            @click="toast.remove(t.id)"
            aria-label="关闭">
            关闭
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
