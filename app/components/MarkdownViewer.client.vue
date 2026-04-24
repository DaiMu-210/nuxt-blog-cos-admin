<script setup lang="ts">
import { useToast } from '~/composables/useToast';
import { enhanceCodeBlocks } from '~/utils/code-block';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';

const props = defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  (e: 'rendered'): void;
}>();

const el = ref<HTMLDivElement | null>(null);
let lastValue = '';
const toast = useToast();

const renderedHtml = ref('');

let md: MarkdownIt | null = null;
let hljs: any = null;

function isDangerousHref(href: string) {
  const v = String(href || '').trim().toLowerCase();
  if (!v) return false;
  if (v.startsWith('#') || v.startsWith('/')) return false;
  return v.startsWith('javascript:') || v.startsWith('data:') || v.startsWith('vbscript:');
}

function isExternalHref(href: string) {
  const v = String(href || '').trim();
  if (!v) return false;
  if (v.startsWith('#') || v.startsWith('/')) return false;
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v, window.location.href);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

async function ensureMarkdownIt() {
  if (md) return md;
  const mod: any = await import('highlight.js/lib/common');
  hljs = mod?.default || mod;

  const inst = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight(code, lang) {
      const language = String(lang || '').trim().toLowerCase();
      try {
        if (language && hljs?.getLanguage?.(language)) {
          return hljs.highlight(code, { language, ignoreIllegals: true }).value;
        }
        return hljs.highlightAuto(code).value;
      } catch {
        return inst.utils.escapeHtml(code);
      }
    },
  });

  inst.use(taskLists, { enabled: true, label: true, labelAfter: true });

  const fence = inst.renderer.rules.fence;
  inst.renderer.rules.fence = (tokens, idx, options, env, self) => {
    tokens[idx].attrJoin('class', 'hljs');
    return fence ? fence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };

  inst.renderer.rules.code_block = (tokens, idx) => {
    const code = tokens[idx].content || '';
    try {
      const highlighted = hljs.highlightAuto(code).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>\n`;
    } catch {
      return `<pre><code class="hljs">${inst.utils.escapeHtml(code)}</code></pre>\n`;
    }
  };

  const linkOpen = inst.renderer.rules.link_open;
  inst.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const hrefIndex = tokens[idx].attrIndex('href');
    const href = hrefIndex >= 0 ? String(tokens[idx].attrs?.[hrefIndex]?.[1] || '') : '';

    if (href && isDangerousHref(href)) {
      tokens[idx].attrSet('href', '#');
    }

    tokens[idx].attrSet('rel', 'noopener noreferrer');
    if (href && isExternalHref(href)) {
      tokens[idx].attrSet('target', '_blank');
    }

    return linkOpen ? linkOpen(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };

  md = inst;
  return inst;
}

async function renderNow(next: string) {
  const root = el.value;
  if (!root) return;
  const inst = await ensureMarkdownIt();
  renderedHtml.value = inst.render(next || '');
  await nextTick();
  enhanceCodeBlocks(root, { toast });
  emit('rendered');
}

onMounted(() => {
  lastValue = props.value || '';
  void renderNow(lastValue);
});

watch(
  () => props.value,
  (v) => {
    const next = v || '';
    if (next === lastValue) return;
    lastValue = next;
    void renderNow(next);
  },
);
</script>

<template>
  <div ref="el" v-html="renderedHtml" />
</template>
