export default defineNuxtRouteMiddleware(() => {
  const cfg = useRuntimeConfig();
  const desktopMode = Boolean((cfg as any)?.public?.desktopMode);
  if (!import.meta.dev && !desktopMode) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }
});
