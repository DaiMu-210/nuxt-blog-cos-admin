import { assertAdminEnabled } from '../../../utils/admin-content';
import { DEFAULT_ADMIN_TTL_SECONDS, readLocalConfig } from '../../../utils/local-config';

export default defineEventHandler(async () => {
  assertAdminEnabled();
  const cfg = await readLocalConfig();
  return {
    admin: {
      ttlSeconds: cfg.admin?.ttlSeconds ?? DEFAULT_ADMIN_TTL_SECONDS,
    },
    cos: {
      bucket: cfg.cos?.bucket,
      region: cfg.cos?.region,
      secretIdSet: !!cfg.cos?.secretId,
      secretKeySet: !!cfg.cos?.secretKey,
    },
  };
});
