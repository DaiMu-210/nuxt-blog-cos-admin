import { createError, readBody } from 'h3';
import { setAdminSession } from '../../../utils/admin-auth';
import { assertAdminEnabled } from '../../../utils/admin-content';
import { DEFAULT_ADMIN_TTL_SECONDS, updateLocalConfig } from '../../../utils/local-config';
import { resolve } from 'node:path';

type Body = {
  ttlSeconds?: number;
  cos?: {
    bucket?: string;
    region?: string;
    secretId?: string;
    secretKey?: string;
  };
};

function normalizeMaybeString(value: any) {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return s ? s : undefined;
}

function hasOwn(obj: any, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

export default defineEventHandler(async (event) => {
  assertAdminEnabled();
  const body = await readBody<Body>(event);

  const hasTtl = hasOwn(body, 'ttlSeconds') && body?.ttlSeconds !== undefined;
  const ttl = Number(body?.ttlSeconds);
  if (hasTtl && (!Number.isFinite(ttl) || ttl <= 0)) {
    throw createError({ statusCode: 400, statusMessage: 'ttlSeconds 非法' });
  }

  const cosInput = body?.cos;
  const hasCos = !!cosInput;
  const hasBucket = hasOwn(cosInput, 'bucket');
  const hasRegion = hasOwn(cosInput, 'region');
  const hasSecretId = hasOwn(cosInput, 'secretId');
  const hasSecretKey = hasOwn(cosInput, 'secretKey');

  const next = await updateLocalConfig((current) => {
    const currentAdmin = current.admin ?? {};
    const currentCos = current.cos ?? {};

    const ttlSeconds = hasTtl ? Math.floor(ttl) : currentAdmin.ttlSeconds;

    const bucket = hasCos && hasBucket ? normalizeMaybeString((cosInput as any).bucket) : currentCos.bucket;
    const region = hasCos && hasRegion ? normalizeMaybeString((cosInput as any).region) : currentCos.region;

    const secretId = hasCos && hasSecretId ? normalizeMaybeString((cosInput as any).secretId) : currentCos.secretId;
    const secretKey = hasCos && hasSecretKey ? normalizeMaybeString((cosInput as any).secretKey) : currentCos.secretKey;

    return {
      ...current,
      admin: {
        ...currentAdmin,
        ...(hasTtl ? { ttlSeconds } : {}),
      },
      cos: {
        ...currentCos,
        ...(hasCos && hasBucket ? { bucket } : {}),
        ...(hasCos && hasRegion ? { region } : {}),
        ...(hasCos && hasSecretId ? { secretId } : {}),
        ...(hasCos && hasSecretKey ? { secretKey } : {}),
      },
    };
  });

  await setAdminSession(event);

  const dataDir = String(process.env.NUXT_DESKTOP_DATA_DIR || '').trim();
  const configPath = dataDir ? resolve(dataDir, 'local-config.json') : resolve(process.cwd(), '.data', 'local-config.json');
  return {
    admin: {
      ttlSeconds: next.admin?.ttlSeconds ?? DEFAULT_ADMIN_TTL_SECONDS,
    },
    cos: {
      bucket: next.cos?.bucket,
      region: next.cos?.region,
      secretIdSet: !!next.cos?.secretId,
      secretKeySet: !!next.cos?.secretKey,
    },
    desktop: {
      dataDir: dataDir || '',
      configPath,
    },
  };
});
