<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

const el = ref<HTMLDivElement | null>(null);
let viewer: any = null;
let lastValue = '';

onMounted(async () => {
  if (!el.value) return;
  const mod: any = await import('@toast-ui/editor/dist/toastui-editor-viewer');
  const ViewerCtor = mod?.default || mod?.Viewer || mod;
  viewer = new ViewerCtor({
    el: el.value,
    initialValue: props.value || '',
  });
  lastValue = props.value || '';
});

watch(
  () => props.value,
  (v) => {
    const next = v || '';
    if (!viewer) {
      lastValue = next;
      return;
    }
    if (next === lastValue) return;
    lastValue = next;
    if (typeof viewer.setMarkdown === 'function') {
      viewer.setMarkdown(next);
      return;
    }
    if (typeof viewer.setContent === 'function') {
      viewer.setContent(next);
      return;
    }
    if (el.value) {
      try {
        viewer.destroy?.();
      } catch {}
      viewer = null;
      void (async () => {
        const mod: any = await import('@toast-ui/editor/dist/toastui-editor-viewer');
        const ViewerCtor = mod?.default || mod?.Viewer || mod;
        viewer = new ViewerCtor({ el: el.value!, initialValue: next });
      })();
    }
  },
);

onBeforeUnmount(() => {
  try {
    viewer?.destroy?.();
  } catch {}
  viewer = null;
});
</script>

<template>
  <div ref="el" />
</template>
