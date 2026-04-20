<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    loading?: boolean;
  }>(),
  {
    title: '确认操作',
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    danger: false,
    loading: false,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

function close() {
  if (props.loading) return;
  emit('close');
}

function confirm() {
  if (props.loading) return;
  emit('confirm');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center px-4 py-16">
        <div class="absolute inset-0 bg-slate-900/30" @click="close" />
        <div class="tw-card relative w-full max-w-md p-4 shadow-lg">
          <div class="text-base font-semibold text-slate-900">{{ title }}</div>
          <div v-if="message" class="mt-2 text-sm text-slate-600">{{ message }}</div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="tw-btn-ghost" type="button" :disabled="loading" @click="close">
              {{ cancelText }}
            </button>
            <button
              :class="danger ? 'tw-btn-danger' : 'tw-btn-primary'"
              type="button"
              :disabled="loading"
              @click="confirm">
              {{ loading ? '处理中...' : confirmText }}
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
