import { clearAdminSession } from '../../../utils/admin-auth';
import { assertAdminEnabled } from '../../../utils/admin-content';

export default defineEventHandler((event) => {
  assertAdminEnabled();
  clearAdminSession(event);
  return { ok: true };
});
