<script setup lang="ts">
import { useTheme } from '~/composables/useTheme';

const props = withDefaults(
  defineProps<{
    repo?: string;
    issueTerm?: string;
    theme?: string;
    label?: string;
  }>(),
  {
    repo: '',
    issueTerm: 'pathname',
    theme: '',
    label: 'comment',
  },
);

const hostRef = ref<HTMLElement | null>(null);
const route = useRoute();
const config = useRuntimeConfig();
const loadError = ref('');
const { theme: mode } = useTheme();

const resolvedRepo = computed(() => props.repo || config.public.utterancesRepo || '');
const autoTheme = computed(() => (mode.value === 'dark' ? 'github-dark' : 'github-light'));
const resolvedTheme = computed(() => props.theme || autoTheme.value);
const resolvedIssueTerm = computed(() => props.issueTerm || 'pathname');

const instanceKey = computed(() =>
  [resolvedRepo.value, resolvedIssueTerm.value, route.path, resolvedTheme.value, props.label].join('|'),
);

function mountUtterances() {
  if (!hostRef.value) return;
  hostRef.value.innerHTML = '';
  loadError.value = '';
  if (!resolvedRepo.value) return;

  const script = document.createElement('script');
  script.src = 'https://utteranc.es/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('repo', resolvedRepo.value);
  script.setAttribute('issue-term', resolvedIssueTerm.value);
  script.setAttribute('theme', resolvedTheme.value);
  script.setAttribute('label', props.label);
  script.onerror = () => {
    loadError.value = '评论脚本加载失败，请检查浏览器拦截插件、隐私设置或网络代理。';
  };
  hostRef.value.appendChild(script);
}

watch(instanceKey, () => {
  mountUtterances();
});

onMounted(() => {
  mountUtterances();
});
</script>

<template>
  <section class="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
    <h2 class="m-0 text-lg font-semibold text-slate-900 dark:text-slate-50">评论</h2>
    <p v-if="!resolvedRepo" class="mt-2 text-sm text-slate-500 dark:text-slate-400">
      尚未配置评论仓库，请设置 <code>NUXT_PUBLIC_UTTERANCES_REPO</code>。
    </p>
    <p v-else-if="loadError" class="mt-2 text-sm text-rose-600">
      {{ loadError }}
    </p>
    <div ref="hostRef" class="mt-3" />
  </section>
</template>
