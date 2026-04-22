<script setup lang="ts">
import { useToast } from '~/composables/useToast';
import { enhanceCodeBlocks } from '~/utils/code-block';

const props = defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  (e: 'rendered'): void;
}>();

const el = ref<HTMLDivElement | null>(null);
let viewer: any = null;
let lastValue = '';
const toast = useToast();

function isHighlighted(node: HTMLElement) {
  const v = (node as any)?.dataset?.highlighted || node.getAttribute('data-highlighted');
  return v === 'yes' || v === 'true' || v === '1';
}

async function highlightCode() {
  if (!import.meta.client) return;
  const root = el.value;
  if (!root) return;
  const mod: any = await import('highlight.js/lib/common');
  const hljs = mod?.default || mod;
  const nodes = root.querySelectorAll<HTMLElement>('pre code');
  for (const node of nodes) {
    if (isHighlighted(node)) continue;
    try {
      hljs.highlightElement(node);
    } catch {}
  }
  enhanceCodeBlocks(root, { toast });
}

onMounted(async () => {
  if (!el.value) return;
  const mod: any = await import('@toast-ui/editor/dist/toastui-editor-viewer');
  const ViewerCtor = mod?.default || mod?.Viewer || mod;
  viewer = new ViewerCtor({
    el: el.value,
    initialValue: props.value || '',
  });
  lastValue = props.value || '';
  await nextTick();
  await highlightCode();
  emit('rendered');
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
      void nextTick().then(async () => {
        await highlightCode();
        emit('rendered');
      });
      return;
    }
    if (typeof viewer.setContent === 'function') {
      viewer.setContent(next);
      void nextTick().then(async () => {
        await highlightCode();
        emit('rendered');
      });
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
        await nextTick();
        await highlightCode();
        emit('rendered');
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
