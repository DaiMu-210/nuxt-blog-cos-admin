import { assertAdminEnabled } from '../../../utils/admin-content';
import { DEFAULT_ADMIN_TTL_SECONDS, readLocalConfig } from '../../../utils/local-config';
import { resolve } from 'node:path';

export default defineEventHandler(async () => {
  assertAdminEnabled();
  const cfg = await readLocalConfig();
  const dataDir = String(process.env.NUXT_DESKTOP_DATA_DIR || '').trim();
  const configPath = dataDir ? resolve(dataDir, 'local-config.json') : resolve(process.cwd(), '.data', 'local-config.json');
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
    desktop: {
      dataDir: dataDir || '',
      configPath,
    },
  };
});
