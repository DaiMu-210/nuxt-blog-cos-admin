export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return;
  if (to.path === '/admin/login') return;

  try {
    const session = await $fetch<{ authenticated: boolean }>('/api/admin/auth/session', {
      credentials: 'include',
    });
    if (!session.authenticated) {
      return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`);
    }
  } catch {
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
