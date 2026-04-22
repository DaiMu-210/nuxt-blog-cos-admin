import { setTimeout as delay } from 'node:timers/promises'

const base = (process.env.BASE_URL || 'http://127.0.0.1:34567').replace(/\/+$/, '')
const password = process.env.ADMIN_PASSWORD || 'test12345'
const keepAliveTtlSeconds = Number.parseInt(process.env.ADMIN_TTL_SECONDS || '', 10) || 600

let cookie = ''

function pickSessionCookie(setCookie) {
  const header = Array.isArray(setCookie) ? setCookie.join(',') : String(setCookie || '')
  const m = header.match(/nuxt_admin_session=[^;]+/)
  return m ? m[0] : ''
}

async function req(method, path, body) {
  const url = `${base}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const setCookie = res.headers.getSetCookie?.() || res.headers.get('set-cookie')
  const nextCookie = pickSessionCookie(setCookie)
  if (nextCookie) cookie = nextCookie

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { res, text, json }
}

function logTitle(title) {
  process.stdout.write(`\n== ${title} ==\n`)
}

function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`)
}

async function main() {
  logTitle('Setup status')
  const setupStatus = await req('GET', '/api/admin/setup/status')
  printJson(setupStatus.json ?? setupStatus.text)

  if (!setupStatus.json?.initialized) {
    logTitle('Setup init')
    const init = await req('POST', '/api/admin/setup/init', { password })
    printJson(init.json ?? init.text)
  } else {
    logTitle('Login')
    const login = await req('POST', '/api/admin/auth/login', { password })
    printJson(login.json ?? login.text)
  }

  logTitle(`Set TTL to ${keepAliveTtlSeconds}s (keep session alive)`)
  const ttl = await req('PUT', '/api/admin/auth/ttl', { ttlSeconds: keepAliveTtlSeconds })
  printJson(ttl.json ?? ttl.text)

  logTitle('Force COS config empty')
  const clear = await req('PUT', '/api/admin/user/config', {
    cos: { bucket: '', region: '', secretId: '', secretKey: '' },
  })
  printJson(clear.json ?? clear.text)

  logTitle('Publish: start (no config)')
  const startNoCfg = await req('POST', '/api/admin/publish/start')
  printJson(startNoCfg.json ?? startNoCfg.text)

  await delay(800)
  const statusNoCfg = await req('GET', '/api/admin/publish/status')
  logTitle('Publish: status (no config)')
  printJson(statusNoCfg.json ?? statusNoCfg.text)

  logTitle('Set dummy COS config')
  const setCfg = await req('PUT', '/api/admin/user/config', {
    cos: { bucket: 'dummy-bucket', region: 'ap-guangzhou', secretId: 'dummySecretId', secretKey: 'dummySecretKey' },
  })
  printJson(setCfg.json ?? setCfg.text)

  logTitle('Publish: start (with config)')
  const startCfg = await req('POST', '/api/admin/publish/start')
  printJson(startCfg.json ?? startCfg.text)

  const startedAt = Date.now()
  while (Date.now() - startedAt < 120_000) {
    await delay(2000)
    const status = await req('GET', '/api/admin/publish/status')
    const job = status.json
    process.stdout.write(
      `[poll] status=${job?.status} stage=${job?.stage} message=${job?.message || ''} logs=${job?.logs?.length || 0}\n`,
    )
    if (job?.status && job.status !== 'running') {
      logTitle('Publish: final status')
      printJson(job)
      return
    }
  }

  logTitle('Publish: timeout status')
  const status = await req('GET', '/api/admin/publish/status')
  printJson(status.json ?? status.text)
  process.exitCode = 2
}

await main()
