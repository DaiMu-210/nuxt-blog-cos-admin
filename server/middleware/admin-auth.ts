import { assertAdminAuthenticated } from '../utils/admin-auth';

export default defineEventHandler((event) => {
  const path = event.path || '';
  if (!path.startsWith('/api/admin/')) return;
  if (path.startsWith('/api/admin/auth/')) return;
  assertAdminAuthenticated(event);
});
