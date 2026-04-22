<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppBoot } from './composables/useAppBoot';

const boot = useAppBoot();
onMounted(() => boot.markBooted());
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator color="#0f172a" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <ToastHost />
  </ClientOnly>
  <AppBootSplash />
</template>
