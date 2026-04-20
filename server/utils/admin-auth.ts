import { createError, getCookie, H3Event, setCookie, deleteCookie } from 'h3';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { assertAdminEnabled } from './admin-content';

const SESSION_COOKIE_NAME = 'nuxt_admin_session';
const DEFAULT_TTL_SECONDS = 60 * 60 * 12;

function getAdminPassword() {
  const password = process.env.NUXT_ADMIN_PASSWORD;
  if (!password) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 NUXT_ADMIN_PASSWORD',
    });
  }
  return password;
}

function getSessionSecret() {
  return process.env.NUXT_ADMIN_SESSION_SECRET || getAdminPassword();
}

function getSessionTtlSeconds() {
  const raw = Number(process.env.NUXT_ADMIN_SESSION_TTL_SECONDS || DEFAULT_TTL_SECONDS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TTL_SECONDS;
  return Math.floor(raw);
}

function signPayload(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function serializeToken(expireAt: number) {
  const nonce = randomBytes(8).toString('hex');
  const payload = `${expireAt}.${nonce}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

function parseAndVerifyToken(token?: string) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expRaw, nonce, sig] = parts;
  if (expRaw == null || nonce == null || sig == null) return false;
  const expireAt = Number(expRaw);
  if (!Number.isFinite(expireAt)) return false;
  if (Date.now() >= expireAt) return false;

  const payload = `${expRaw}.${nonce}`;
  const expectedSig = signPayload(payload);
  return safeEqual(sig, expectedSig);
}

export function verifyAdminPassword(input?: string) {
  return !!input && input === getAdminPassword();
}

export function setAdminSession(event: H3Event) {
  assertAdminEnabled();
  const ttl = getSessionTtlSeconds();
  const token = serializeToken(Date.now() + ttl * 1000);
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: ttl,
  });
}

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/',
  });
}

export function isAdminAuthenticated(event: H3Event) {
  assertAdminEnabled();
  return parseAndVerifyToken(getCookie(event, SESSION_COOKIE_NAME));
}

export function assertAdminAuthenticated(event: H3Event) {
  if (!isAdminAuthenticated(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录',
    });
  }
}
