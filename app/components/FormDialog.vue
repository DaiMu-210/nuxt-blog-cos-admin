<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    submitText?: string;
    cancelText?: string;
    loading?: boolean;
  }>(),
  {
    title: '',
    submitText: '保存',
    cancelText: '取消',
    loading: false,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit'): void;
}>();

function close() {
  if (props.loading) return;
  emit('close');
}

function submit() {
  if (props.loading) return;
  emit('submit');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center px-4 py-16">
        <div class="absolute inset-0 bg-slate-900/30" @click="close" />
        <div class="tw-card relative w-full max-w-lg p-4 shadow-lg">
          <div class="flex items-center justify-between gap-3">
            <div class="text-base font-semibold text-slate-900">{{ title }}</div>
            <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" :disabled="loading" @click="close">关闭</button>
          </div>
          <div class="mt-3">
            <slot />
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="tw-btn-ghost" type="button" :disabled="loading" @click="close">{{ cancelText }}</button>
            <button class="tw-btn-primary" type="button" :disabled="loading" @click="submit">
              {{ loading ? '处理中...' : submitText }}
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

