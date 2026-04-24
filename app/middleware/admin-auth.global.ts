export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return;

  const cfg = useRuntimeConfig();
  const desktopMode = Boolean((cfg as any)?.public?.desktopMode);
  if (!import.meta.dev && !desktopMode) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const redirectParam = encodeURIComponent(to.fullPath);

  try {
    const setup = await $fetch<{ initialized: boolean }>('/api/admin/setup/status', {
      credentials: 'include',
    });

    if (!setup.initialized) {
      if (to.path !== '/admin/setup') {
        return navigateTo(`/admin/setup?redirect=${redirectParam}`);
      }
      return;
    }

    if (to.path === '/admin/setup') {
      return navigateTo('/admin/login');
    }
  } catch {
    if (to.path === '/admin/login' || to.path === '/admin/setup') return;
  }

  if (to.path === '/admin/login') return;

  try {
    const session = await $fetch<{ authenticated: boolean }>('/api/admin/auth/session', {
      credentials: 'include',
    });
    if (!session.authenticated) {
      return navigateTo(`/admin/login?redirect=${redirectParam}`);
    }
  } catch {
    return navigateTo(`/admin/login?redirect=${redirectParam}`);
  }
});
