<script setup lang="ts">
import { useTheme } from '~/composables/useTheme';

const props = withDefaults(
  defineProps<{
    repo?: string;
    issueTerm?: string;
    theme?: string;
    label?: string;
    branch?: string;
  }>(),
  {
    repo: '',
    issueTerm: 'pathname',
    theme: '',
    label: '',
    branch: '',
  },
);

const hostRef = ref<HTMLElement | null>(null);
const route = useRoute();
const config = useRuntimeConfig();
const { data: site } = useNuxtData<any>('site:layout');
const loadError = ref('');
const lastCleanedBeaudarParam = ref('');
const { theme: mode } = useTheme();

let authCleanupTimeoutId: number | null = null;
let authMessageHandler: ((event: MessageEvent) => void) | null = null;

const siteBeaudarRepo = computed(() => String(site.value?.comments?.beaudarRepo || site.value?.beaudarRepo || ''));

const resolvedRepo = computed(
  () => props.repo || siteBeaudarRepo.value || (config.public as any).beaudarRepo || config.public.utterancesRepo || '',
);
const autoTheme = computed(() => (mode.value === 'dark' ? 'github-dark' : 'github-light'));
const resolvedTheme = computed(() => props.theme || autoTheme.value);
const resolvedIssueTerm = computed(() => props.issueTerm || 'pathname');
const resolvedBranch = computed(() =>
  String(
    props.branch ||
      site.value?.comments?.beaudarBranch ||
      site.value?.beaudarBranch ||
      (config.public as any).beaudarBranch ||
      '',
  ).trim(),
);
const resolvedOrigin = computed(() =>
  String(
    (site.value?.comments?.beaudarOrigin || site.value?.beaudarOrigin || (config.public as any).beaudarOrigin) ??
      'https://beaudar.lipk.org',
  )
    .trim()
    .replace(/\/+$/, ''),
);

const instanceKey = computed(() =>
  [
    resolvedRepo.value,
    resolvedOrigin.value,
    resolvedBranch.value,
    resolvedIssueTerm.value,
    route.fullPath,
    resolvedTheme.value,
    props.label,
  ].join('|'),
);

function mountBeaudar() {
  if (!hostRef.value) return;
  hostRef.value.innerHTML = '';
  loadError.value = '';
  teardownAuthCleanup();
  if (!resolvedRepo.value) return;

  const script = document.createElement('script');
  script.src = `${resolvedOrigin.value}/client.js`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute('repo', resolvedRepo.value);
  script.setAttribute('issue-term', resolvedIssueTerm.value);
  script.setAttribute('theme', resolvedTheme.value);
  if (props.label) script.setAttribute('label', props.label);
  if (resolvedBranch.value) script.setAttribute('branch', resolvedBranch.value);
  script.onerror = () => {
    loadError.value = '评论脚本加载失败，请检查浏览器拦截插件、隐私设置或网络代理。';
  };
  hostRef.value.appendChild(script);

  setupAuthCleanup();
}

watch(instanceKey, () => {
  mountBeaudar();
});

onMounted(() => {
  mountBeaudar();
});

onBeforeUnmount(() => {
  teardownAuthCleanup();
});

function getBeaudarParamFromUrl() {
  if (typeof window === 'undefined') return '';
  try {
    return new URL(window.location.href).searchParams.get('beaudar') || '';
  } catch {
    return '';
  }
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

function teardownAuthCleanup() {
  if (typeof window !== 'undefined' && authMessageHandler) {
    window.removeEventListener('message', authMessageHandler);
  }
  authMessageHandler = null;
  if (authCleanupTimeoutId != null && typeof window !== 'undefined') {
    window.clearTimeout(authCleanupTimeoutId);
  }
  authCleanupTimeoutId = null;
}

function cleanAuthParam() {
  if (typeof window === 'undefined') return;
  const token = getBeaudarParamFromUrl();
  if (!token) return;
  if (lastCleanedBeaudarParam.value === token) return;
  lastCleanedBeaudarParam.value = token;
  teardownAuthCleanup();
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('beaudar');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {}
}

function setupAuthCleanup() {
  if (typeof window === 'undefined') return;
  const token = getBeaudarParamFromUrl();
  if (!token) return;

  const expectedOrigin = normalizeOrigin(resolvedOrigin.value);

  authMessageHandler = (event: MessageEvent) => {
    if (event.origin !== expectedOrigin) return;
    cleanAuthParam();
  };
  window.addEventListener('message', authMessageHandler);

  authCleanupTimeoutId = window.setTimeout(() => {
    cleanAuthParam();
  }, 15000);
}
</script>

<template>
  <section class="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
    <h2 class="m-0 text-lg font-semibold text-slate-900 dark:text-slate-50">评论</h2>
    <p v-if="!resolvedRepo" class="mt-2 text-sm text-slate-500 dark:text-slate-400">
      尚未配置评论仓库，请设置 <code>NUXT_PUBLIC_BEAUDAR_REPO</code>。
    </p>
    <p v-else-if="loadError" class="mt-2 text-sm text-rose-600">
      {{ loadError }}
    </p>
    <div ref="hostRef" class="mt-3" />
  </section>
</template>
