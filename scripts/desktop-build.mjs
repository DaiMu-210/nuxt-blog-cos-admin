import { rm, rename, stat } from 'node:fs/promises'
import os from 'node:os'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'

const target = String(process.argv[2] || '').trim()
if (!target || (target !== 'nsis' && target !== 'portable' && target !== 'dmg')) {
  throw new Error('Usage: node scripts/desktop-build.mjs <nsis|portable|dmg>')
}
if (target === 'dmg' && process.platform !== 'darwin') {
  throw new Error('dmg 只能在 macOS (darwin) 上构建')
}

const root = process.cwd()
const distElectronDir = resolve(root, 'dist-electron')

async function pathExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function rmWithRetry(p) {
  let lastError = null
  for (let i = 0; i < 20; i += 1) {
    try {
      await rm(p, { recursive: true, force: true, maxRetries: 30, retryDelay: 200 })
      return
    } catch (e) {
      lastError = e
      await sleep(300)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError || 'rm failed'))
}

async function cleanupDistElectron() {
  if (!(await pathExists(distElectronDir))) return

  const tempDir = join(os.tmpdir(), `nuxt-blog-cos-admin-dist-electron-${Date.now()}`)
  let moved = false
  try {
    await rename(distElectronDir, tempDir)
    moved = true
  } catch {}

  await rmWithRetry(moved ? tempDir : distElectronDir)
}

function run(cmd, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env, cwd: root, shell: false, windowsHide: true })
    child.on('error', (e) => reject(e))
    child.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${cmd} exited with code=${code}`))
    })
  })
}

await cleanupDistElectron()

const env = { ...process.env, NUXT_DESKTOP: '1', ELECTRON_RUN_AS_NODE: '1' }

const nuxtCli = resolve(root, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
if (!(await pathExists(nuxtCli))) throw new Error(`未找到 Nuxt CLI：${nuxtCli}`)
await run(process.execPath, [nuxtCli, 'build'], env)

const builderCli = resolve(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js')
const builderArgs =
  target === 'dmg' ? ['--mac', 'dmg', '--universal'] : ['--win', target]
if (await pathExists(builderCli)) {
  await run(process.execPath, [builderCli, ...builderArgs], env)
} else {
  const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  await run(pnpmCmd, ['exec', 'electron-builder', ...builderArgs], env)
}
