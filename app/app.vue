<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppBoot } from './composables/useAppBoot';
import { useTheme } from '~/composables/useTheme';

const boot = useAppBoot();
const { theme } = useTheme();
onMounted(() => boot.markBooted());
</script>

<template>
  <NuxtRouteAnnouncer />
  <ClientOnly>
    <NuxtLoadingIndicator :color="theme === 'dark' ? '#e2e8f0' : '#0f172a'" :height="3" />
  </ClientOnly>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <ToastHost />
  </ClientOnly>
  <AppBootSplash />
</template>
