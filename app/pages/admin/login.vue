<script setup lang="ts">
definePageMeta({ ssr: false, middleware: ['admin-dev-only'] });

const route = useRoute();
const password = ref('');
const submitting = ref(false);
const errMsg = ref('');

const redirectTo = computed(() => {
  const value = route.query.redirect;
  const path = typeof value === 'string' ? value : '/admin';
  return path.startsWith('/admin') ? path : '/admin';
});

async function submit() {
  errMsg.value = '';
  submitting.value = true;
  try {
    await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: { password: password.value },
      credentials: 'include',
    });
    await navigateTo(redirectTo.value);
  } catch (err: any) {
    errMsg.value = err?.data?.statusMessage || err?.message || '登录失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
    <div class="tw-card w-full p-6">
      <h1 class="text-xl font-bold text-slate-900 dark:text-slate-50">后台登录</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">请输入初始化时设置的管理员密码。</p>

      <form class="mt-5 space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1 block text-sm text-slate-600 dark:text-slate-300">管理员密码</label>
          <input
            v-model="password"
            type="password"
            class="tw-input"
            placeholder="请输入管理员密码"
            autocomplete="current-password"
            required />
        </div>

        <div v-if="errMsg" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {{ errMsg }}
        </div>

        <button class="tw-btn-primary w-full justify-center" type="submit" :disabled="submitting">
          {{ submitting ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </section>
</template>
