<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false, middleware: ['admin-dev-only'] });

type UserConfig = {
  admin: { ttlSeconds: number };
  cos: {
    bucket?: string;
    region?: string;
    secretIdSet: boolean;
    secretKeySet: boolean;
  };
};

type PublishJob = {
  id: string;
  status: 'idle' | 'running' | 'success' | 'error';
  stage: 'idle' | 'generating' | 'syncing' | 'done';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  logs: string[];
};

const { data, pending, error, refresh } = await useFetch<UserConfig>('/api/admin/user/config', {
  server: false,
});

const ttlSeconds = ref<number>(60 * 60 * 24 * 7);
const cosBucket = ref('');
const cosRegion = ref('');
const cosSecretId = ref('');
const cosSecretKey = ref('');

const cosSecretIdSet = ref(false);
const cosSecretKeySet = ref(false);

watchEffect(() => {
  if (!data.value) return;
  ttlSeconds.value = Number(data.value.admin?.ttlSeconds ?? ttlSeconds.value);
  cosBucket.value = String(data.value.cos?.bucket || '');
  cosRegion.value = String(data.value.cos?.region || '');
  cosSecretIdSet.value = Boolean(data.value.cos?.secretIdSet);
  cosSecretKeySet.value = Boolean(data.value.cos?.secretKeySet);
});

const savingConfig = ref(false);
const configMsg = ref<string | null>(null);

async function saveConfig() {
  configMsg.value = null;
  savingConfig.value = true;
  try {
    const payload: any = {
      ttlSeconds: Number(ttlSeconds.value),
      cos: {
        bucket: String(cosBucket.value || ''),
        region: String(cosRegion.value || ''),
      },
    };

    if (String(cosSecretId.value || '').trim()) {
      payload.cos.secretId = String(cosSecretId.value || '').trim();
    }
    if (String(cosSecretKey.value || '').trim()) {
      payload.cos.secretKey = String(cosSecretKey.value || '').trim();
    }

    const next = await $fetch<UserConfig>('/api/admin/user/config', { method: 'PUT', body: payload } as any);
    data.value = next as any;
    cosSecretId.value = '';
    cosSecretKey.value = '';
    configMsg.value = '已保存';
  } catch (e: any) {
    configMsg.value = e?.data?.statusMessage || e?.data?.message || e?.message || '保存失败';
  } finally {
    savingConfig.value = false;
    setTimeout(() => (configMsg.value = null), 1500);
  }
}

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingPassword = ref(false);
const passwordMsg = ref<string | null>(null);

const publishJob = ref<PublishJob | null>(null);
const publishLoading = ref(false);
const publishMsg = ref<string | null>(null);
let publishTimer: any = null;

function stageLabel(stage: PublishJob['stage']) {
  if (stage === 'generating') return '构建中';
  if (stage === 'syncing') return '上传中';
  if (stage === 'done') return '已完成';
  return '空闲';
}

async function fetchPublishStatus() {
  try {
    const res = await $fetch<PublishJob>('/api/admin/publish/status', { credentials: 'include' } as any);
    if (res && res.id) publishJob.value = res;
    else publishJob.value = null;
    if (publishJob.value?.status !== 'running' && publishTimer) {
      clearInterval(publishTimer);
      publishTimer = null;
    }
  } catch (e: any) {
    publishMsg.value = e?.data?.statusMessage || e?.data?.message || e?.message || '获取发布状态失败';
    publishJob.value = null;
    if (publishTimer) {
      clearInterval(publishTimer);
      publishTimer = null;
    }
  }
}

async function startPublish() {
  publishMsg.value = null;
  publishLoading.value = true;
  try {
    const res = await $fetch<PublishJob>('/api/admin/publish/start', {
      method: 'POST',
      credentials: 'include',
    } as any);
    publishJob.value = res;
    if (publishTimer) clearInterval(publishTimer);
    publishTimer = setInterval(fetchPublishStatus, 1200);
  } catch (e: any) {
    publishMsg.value = e?.data?.statusMessage || e?.data?.message || e?.message || '发布失败';
  } finally {
    publishLoading.value = false;
  }
}

onMounted(() => {
  fetchPublishStatus();
});

onBeforeUnmount(() => {
  if (publishTimer) clearInterval(publishTimer);
  publishTimer = null;
});

async function changePassword() {
  passwordMsg.value = null;
  if (newPassword.value !== confirmPassword.value) {
    passwordMsg.value = '两次输入的新密码不一致';
    return;
  }
  savingPassword.value = true;
  try {
    await $fetch('/api/admin/auth/password', {
      method: 'PUT',
      body: { oldPassword: oldPassword.value, newPassword: newPassword.value },
      credentials: 'include',
    } as any);
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordMsg.value = '密码已修改';
  } catch (e: any) {
    passwordMsg.value = e?.data?.statusMessage || e?.data?.message || e?.message || '修改失败';
  } finally {
    savingPassword.value = false;
    setTimeout(() => (passwordMsg.value = null), 1500);
  }
}
</script>

<template>
  <section class="mx-auto max-w-[1080px]">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">用户设置</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          这些配置写入本地私有配置文件（项目 .data/ 或桌面应用用户数据目录），不会被静态导出。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="tw-btn-primary" type="button" @click="saveConfig" :disabled="savingConfig || pending">
          {{ savingConfig ? '保存中...' : '保存配置' }}
        </button>
        <button class="tw-btn-ghost" type="button" @click="() => refresh()" :disabled="pending">刷新</button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-700 dark:text-red-300">加载失败：{{ error?.data?.message || error?.message }}</p>

    <div v-else class="space-y-4">
      <section class="tw-card p-4">
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">会话 TTL</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">单位：秒。保存后会刷新当前登录态的 cookie。</p>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 items-start">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">ttlSeconds</label>
            <input v-model.number="ttlSeconds" class="tw-input" type="number" min="1" step="1" />
          </div>
          <div class="text-sm text-slate-500 dark:text-slate-400">常用：1 天=86400；1 周=604800</div>
        </div>
      </section>

      <section class="tw-card p-4">
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">COS 配置</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">secret 不会回显；如需更新，请重新输入并保存。</p>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">bucket</label>
            <input v-model="cosBucket" class="tw-input" type="text" placeholder="例如：my-bucket-1250000000" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">region</label>
            <input v-model="cosRegion" class="tw-input" type="text" placeholder="例如：ap-guangzhou" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">secretId</label>
            <input
              v-model="cosSecretId"
              class="tw-input"
              type="password"
              :placeholder="cosSecretIdSet ? '已设置（不会回显）' : '未设置'"
              autocomplete="off" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">secretKey</label>
            <input
              v-model="cosSecretKey"
              class="tw-input"
              type="password"
              :placeholder="cosSecretKeySet ? '已设置（不会回显）' : '未设置'"
              autocomplete="off" />
          </div>
        </div>
      </section>

      <section class="tw-card p-4">
        <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">修改密码</h2>
        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">旧密码</label>
            <input v-model="oldPassword" class="tw-input" type="password" autocomplete="current-password" />
          </div>
          <div />
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">新密码</label>
            <input v-model="newPassword" class="tw-input" type="password" autocomplete="new-password" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2 dark:text-slate-400">确认新密码</label>
            <input v-model="confirmPassword" class="tw-input" type="password" autocomplete="new-password" />
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3">
          <div
            v-if="passwordMsg"
            class="text-sm"
            :class="passwordMsg.includes('失败') ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'">
            {{ passwordMsg }}
          </div>
          <div class="ml-auto">
            <button class="tw-btn-primary" type="button" @click="changePassword" :disabled="savingPassword">
              {{ savingPassword ? '提交中...' : '修改密码' }}
            </button>
          </div>
        </div>
      </section>

      <section class="tw-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">COS 一键发布</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              仅本地/桌面模式可用：服务端执行 generate:dist + coscli sync（使用上方 COS 配置）。
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="tw-btn-primary"
              type="button"
              @click="startPublish"
              :disabled="publishLoading || publishJob?.status === 'running'">
              {{ publishJob?.status === 'running' ? '发布中...' : publishLoading ? '启动中...' : '开始发布' }}
            </button>
            <button class="tw-btn-ghost" type="button" @click="fetchPublishStatus" :disabled="publishLoading">
              刷新状态
            </button>
          </div>
        </div>

        <div class="mt-3 text-sm text-slate-700 dark:text-slate-200">
          <div v-if="publishJob">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div>
                状态：{{
                  publishJob.status === 'running'
                    ? stageLabel(publishJob.stage)
                    : publishJob.message || stageLabel(publishJob.stage)
                }}
              </div>
              <div v-if="publishJob.startedAt">开始：{{ new Date(publishJob.startedAt).toLocaleString() }}</div>
              <div v-if="publishJob.finishedAt">结束：{{ new Date(publishJob.finishedAt).toLocaleString() }}</div>
            </div>
            <pre
              v-if="publishJob.logs?.length"
              class="mt-3 max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 text-xs leading-relaxed whitespace-pre-wrap dark:border-slate-800"
              >{{ publishJob.logs.join('\n') }}</pre
            >
          </div>
          <div v-else class="text-slate-500 dark:text-slate-400">暂无发布任务</div>
        </div>

        <p
          v-if="publishMsg"
          class="mt-3 text-sm"
          :class="publishMsg.includes('失败') ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'">
          {{ publishMsg }}
        </p>
      </section>

      <p v-if="configMsg" class="text-sm" :class="configMsg.includes('失败') ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'">
        {{ configMsg }}
      </p>
    </div>
  </section>
</template>
