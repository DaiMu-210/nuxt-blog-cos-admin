import { createError, deleteCookie, getCookie, H3Event, setCookie } from 'h3'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { assertAdminEnabled } from './admin-content'
import {
  DEFAULT_ADMIN_TTL_SECONDS,
  isAdminInitialized,
  readLocalConfig,
  updateLocalConfig
} from './local-config'

const SESSION_COOKIE_NAME = 'nuxt_admin_session'

type AdminAuthConfig = {
  passwordHash: string
  sessionSecret: string
  ttlSeconds: number
}

function safeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.byteLength !== b.byteLength) return false
  return timingSafeEqual(a, b)
}

function signPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function serializeToken(expireAt: number, secret: string) {
  const nonce = randomBytes(8).toString('hex')
  const payload = `${expireAt}.${nonce}`
  const sig = signPayload(payload, secret)
  return `${payload}.${sig}`
}

function parseAndVerifyToken(token: string | undefined, secret: string) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [expRaw, nonce, sig] = parts
  if (!expRaw || !nonce || !sig) return false
  const expireAt = Number(expRaw)
  if (!Number.isFinite(expireAt)) return false
  if (Date.now() >= expireAt) return false

  const payload = `${expRaw}.${nonce}`
  const expectedSig = signPayload(payload, secret)
  return safeEqual(Buffer.from(sig), Buffer.from(expectedSig))
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = scryptSync(password, salt, 32)
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`
}

function verifyPasswordHash(password: string, stored: string) {
  try {
    const parts = stored.split('$')
    if (parts.length !== 3) return false
    const [scheme, saltHex, hashHex] = parts
    if (scheme !== 'scrypt') return false
    if (!saltHex || !hashHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const derived = scryptSync(password, salt, expected.byteLength)
    return safeEqual(derived, expected)
  } catch {
    return false
  }
}

async function getAdminAuthConfig(): Promise<AdminAuthConfig> {
  assertAdminEnabled()
  const cfg = await readLocalConfig()
  if (!isAdminInitialized(cfg)) {
    throw createError({ statusCode: 409, statusMessage: '未初始化，请先访问 /admin/setup' })
  }
  return {
    passwordHash: cfg.admin!.passwordHash!,
    sessionSecret: cfg.admin!.sessionSecret!,
    ttlSeconds: cfg.admin!.ttlSeconds ?? DEFAULT_ADMIN_TTL_SECONDS
  }
}

export async function isAdminSetupDone() {
  assertAdminEnabled()
  const cfg = await readLocalConfig()
  return isAdminInitialized(cfg)
}

export async function initializeAdmin(password: string) {
  assertAdminEnabled()
  const trimmed = String(password ?? '').trim()
  if (!trimmed) throw createError({ statusCode: 400, statusMessage: '密码不能为空' })

  const next = await updateLocalConfig((current) => {
    if (isAdminInitialized(current)) {
      throw createError({ statusCode: 409, statusMessage: '已初始化' })
    }
    const sessionSecret = randomBytes(32).toString('hex')
    return {
      ...current,
      admin: {
        ...(current.admin ?? {}),
        passwordHash: hashPassword(trimmed),
        sessionSecret,
        ttlSeconds: DEFAULT_ADMIN_TTL_SECONDS
      }
    }
  })
  return next
}

export async function verifyAdminPassword(input?: string) {
  const cfg = await getAdminAuthConfig()
  const password = String(input ?? '')
  if (!password) return false
  return verifyPasswordHash(password, cfg.passwordHash)
}

export async function setAdminSession(event: H3Event) {
  const cfg = await getAdminAuthConfig()
  const ttl = cfg.ttlSeconds
  const token = serializeToken(Date.now() + ttl * 1000, cfg.sessionSecret)
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: ttl
  })
}

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
}

export async function isAdminAuthenticated(event: H3Event) {
  const cfg = await getAdminAuthConfig()
  return parseAndVerifyToken(getCookie(event, SESSION_COOKIE_NAME), cfg.sessionSecret)
}

export async function assertAdminAuthenticated(event: H3Event) {
  if (!(await isAdminAuthenticated(event))) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
}

export async function changeAdminPassword(oldPassword: string, newPassword: string) {
  assertAdminEnabled()
  const oldValue = String(oldPassword ?? '')
  const nextValue = String(newPassword ?? '').trim()
  if (!nextValue) throw createError({ statusCode: 400, statusMessage: '新密码不能为空' })

  await updateLocalConfig((current) => {
    if (!isAdminInitialized(current)) {
      throw createError({ statusCode: 409, statusMessage: '未初始化' })
    }
    const ok = verifyPasswordHash(oldValue, current.admin!.passwordHash!)
    if (!ok) throw createError({ statusCode: 401, statusMessage: '旧密码错误' })
    return {
      ...current,
      admin: { ...(current.admin ?? {}), passwordHash: hashPassword(nextValue) }
    }
  })
  return { ok: true }
}

export async function updateAdminSessionTtlSeconds(ttlSeconds: number) {
  assertAdminEnabled()
  const ttl = Number(ttlSeconds)
  if (!Number.isFinite(ttl) || ttl <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ttlSeconds 非法' })
  }
  await updateLocalConfig((current) => {
    if (!isAdminInitialized(current)) {
      throw createError({ statusCode: 409, statusMessage: '未初始化' })
    }
    return {
      ...current,
      admin: { ...(current.admin ?? {}), ttlSeconds: Math.floor(ttl) }
    }
  })
  return { ok: true }
}
