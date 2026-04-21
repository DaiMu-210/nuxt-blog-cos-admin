<script setup lang="ts">
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
    theme: 'github-light',
    label: 'comment',
  },
);

const hostRef = ref<HTMLElement | null>(null);
const route = useRoute();
const config = useRuntimeConfig();

const resolvedRepo = computed(() => props.repo || config.public.utterancesRepo || '');
const resolvedTheme = computed(() => props.theme || config.public.utterancesTheme || 'github-light');
const resolvedIssueTerm = computed(() => props.issueTerm || 'pathname');

const instanceKey = computed(() =>
  [resolvedRepo.value, resolvedIssueTerm.value, route.path, resolvedTheme.value, props.label].join('|'),
);

function mountUtterances() {
  if (!hostRef.value) return;
  hostRef.value.innerHTML = '';
  if (!resolvedRepo.value) return;

  const script = document.createElement('script');
  script.src = 'https://utteranc.es/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('repo', resolvedRepo.value);
  script.setAttribute('issue-term', resolvedIssueTerm.value);
  script.setAttribute('theme', resolvedTheme.value);
  script.setAttribute('label', props.label);
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
  <section class="mt-8 border-t border-slate-100 pt-6">
    <h2 class="m-0 text-lg font-semibold text-slate-900">评论</h2>
    <p v-if="!resolvedRepo" class="mt-2 text-sm text-slate-500">
      尚未配置评论仓库，请设置 <code>NUXT_PUBLIC_UTTERANCES_REPO</code>。
    </p>
    <div ref="hostRef" class="mt-3" />
  </section>
</template>
