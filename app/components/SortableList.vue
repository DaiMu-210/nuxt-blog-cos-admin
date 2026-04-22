<script setup lang="ts">
import { arrayMove } from '~/utils/reorder';

const props = withDefaults(
  defineProps<{
    modelValue: any[];
    itemKey: (item: any, index: number) => string | number;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void;
  (e: 'change', value: any[]): void;
}>();

const listEl = ref<HTMLElement | null>(null);
let sortable: any = null;

async function initSortable() {
  if (!listEl.value) return;
  if (sortable) return;

  const mod = await import('sortablejs');
  const Sortable = (mod as any).default || (mod as any);

  sortable = new Sortable(listEl.value, {
    animation: 150,
    handle: '[data-sortable-handle]',
    disabled: props.disabled,
    onEnd: (evt: any) => {
      if (props.disabled) return;
      const from = evt?.oldIndex;
      const to = evt?.newIndex;
      if (typeof from !== 'number' || typeof to !== 'number') return;
      if (from === to) return;
      const next = arrayMove(props.modelValue, from, to);
      emit('update:modelValue', next);
      emit('change', next);
    },
  });
}

onMounted(() => {
  initSortable();
});

watch(
  () => props.disabled,
  (v) => {
    sortable?.option?.('disabled', v);
  },
);

onBeforeUnmount(() => {
  sortable?.destroy?.();
  sortable = null;
});
</script>

<template>
  <ul ref="listEl" class="space-y-3">
    <li v-for="(item, index) in modelValue" :key="itemKey(item, index)" class="select-none">
      <slot
        :item="item"
        :index="index"
        :handle-attrs="{
          'data-sortable-handle': '',
        }" />
    </li>
  </ul>
</template>
