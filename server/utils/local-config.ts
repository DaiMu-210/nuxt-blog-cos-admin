import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createError } from 'h3';
import { assertAdminEnabled } from './admin-content';

export const DEFAULT_ADMIN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type LocalAdminConfig = {
  passwordHash?: string;
  sessionSecret?: string;
  ttlSeconds?: number;
};

export type LocalCosConfig = {
  bucket?: string;
  region?: string;
  secretId?: string;
  secretKey?: string;
};

export type LocalConfig = {
  version: 1;
  admin?: LocalAdminConfig;
  cos?: LocalCosConfig;
};

const CONFIG_VERSION: LocalConfig['version'] = 1;

function getConfigPath() {
  const desktopDataDir = String(process.env.NUXT_DESKTOP_DATA_DIR || '').trim();
  if (desktopDataDir) return resolve(desktopDataDir, 'local-config.json');
  return resolve(process.cwd(), '.data', 'local-config.json');
}

function normalizeConfig(input: any): LocalConfig {
  const raw = (input ?? {}) as Partial<LocalConfig>;
  const adminRaw = (raw.admin ?? {}) as Partial<LocalAdminConfig>;
  const cosRaw = (raw.cos ?? {}) as Partial<LocalCosConfig>;
  const ttl =
    typeof adminRaw.ttlSeconds === 'number' && Number.isFinite(adminRaw.ttlSeconds) && adminRaw.ttlSeconds > 0
      ? Math.floor(adminRaw.ttlSeconds)
      : undefined;
  return {
    version: CONFIG_VERSION,
    admin: {
      passwordHash: typeof adminRaw.passwordHash === 'string' ? adminRaw.passwordHash : undefined,
      sessionSecret: typeof adminRaw.sessionSecret === 'string' ? adminRaw.sessionSecret : undefined,
      ttlSeconds: ttl,
    },
    cos: {
      bucket: typeof cosRaw.bucket === 'string' ? cosRaw.bucket : undefined,
      region: typeof cosRaw.region === 'string' ? cosRaw.region : undefined,
      secretId: typeof cosRaw.secretId === 'string' ? cosRaw.secretId : undefined,
      secretKey: typeof cosRaw.secretKey === 'string' ? cosRaw.secretKey : undefined,
    },
  };
}

export async function readLocalConfig(): Promise<LocalConfig> {
  assertAdminEnabled();
  const p = getConfigPath();
  try {
    const raw = await readFile(p, 'utf8');
    return normalizeConfig(JSON.parse(raw));
  } catch (e: any) {
    if (e?.code === 'ENOENT') return normalizeConfig({ version: CONFIG_VERSION });
    throw createError({ statusCode: 500, statusMessage: '读取本地配置失败' });
  }
}

export async function writeLocalConfig(next: LocalConfig) {
  assertAdminEnabled();
  const p = getConfigPath();
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(normalizeConfig(next), null, 2) + '\n', 'utf8');
  return { ok: true };
}

export async function updateLocalConfig(updater: (current: LocalConfig) => LocalConfig) {
  const current = await readLocalConfig();
  const next = updater(current);
  await writeLocalConfig(next);
  return next;
}

export function isAdminInitialized(cfg: LocalConfig) {
  return !!cfg.admin?.passwordHash && !!cfg.admin?.sessionSecret;
}
