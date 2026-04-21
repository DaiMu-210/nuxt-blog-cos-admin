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
    label: '',
  },
);

const hostRef = ref<HTMLElement | null>(null);
const route = useRoute();
const config = useRuntimeConfig();
const { data: site } = useNuxtData<any>('site:layout');
const loadError = ref('');

const siteBeaudarRepo = computed(() => String(site.value?.comments?.beaudarRepo || site.value?.beaudarRepo || ''));
const siteBeaudarTheme = computed(() =>
  String(site.value?.comments?.beaudarTheme || site.value?.beaudarTheme || 'github-light'),
);

const resolvedRepo = computed(
  () => props.repo || siteBeaudarRepo.value || (config.public as any).beaudarRepo || config.public.utterancesRepo || '',
);
const resolvedTheme = computed(
  () =>
    props.theme ||
    siteBeaudarTheme.value ||
    (config.public as any).beaudarTheme ||
    config.public.utterancesTheme ||
    'github-light',
);
const resolvedIssueTerm = computed(() => props.issueTerm || 'pathname');

const instanceKey = computed(() =>
  [resolvedRepo.value, resolvedIssueTerm.value, route.fullPath, resolvedTheme.value, props.label].join('|'),
);

function mountBeaudar() {
  if (!hostRef.value) return;
  hostRef.value.innerHTML = '';
  loadError.value = '';
  if (!resolvedRepo.value) return;

  const script = document.createElement('script');
  script.src = 'https://beaudar.lipk.org/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('repo', resolvedRepo.value);
  script.setAttribute('issue-term', resolvedIssueTerm.value);
  script.setAttribute('theme', resolvedTheme.value);
  if (props.label) script.setAttribute('label', props.label);
  script.onerror = () => {
    loadError.value = '评论脚本加载失败，请检查浏览器拦截插件、隐私设置或网络代理。';
  };
  hostRef.value.appendChild(script);
}

watch(instanceKey, () => {
  mountBeaudar();
});

onMounted(() => {
  mountBeaudar();
});
</script>

<template>
  <section class="mt-8 border-t border-slate-100 pt-6">
    <h2 class="m-0 text-lg font-semibold text-slate-900">评论</h2>
    <p v-if="!resolvedRepo" class="mt-2 text-sm text-slate-500">
      尚未配置评论仓库，请设置 <code>NUXT_PUBLIC_BEAUDAR_REPO</code>。
    </p>
    <p v-else-if="loadError" class="mt-2 text-sm text-rose-600">
      {{ loadError }}
    </p>
    <div ref="hostRef" class="mt-3" />
  </section>
</template>
