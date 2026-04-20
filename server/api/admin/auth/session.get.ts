import { isAdminAuthenticated } from '../../../utils/admin-auth';
import { assertAdminEnabled } from '../../../utils/admin-content';

export default defineEventHandler((event) => {
  assertAdminEnabled();
  return { authenticated: isAdminAuthenticated(event) };
});
