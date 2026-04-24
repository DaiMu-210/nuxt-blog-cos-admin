import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const src = resolve(root, '.output', 'public')
const dest = resolve(root, 'dist')

async function pathExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

await rm(dest, { recursive: true, force: true })
await cp(src, dest, { recursive: true })

const notFoundHtml = resolve(dest, '404.html')
if (await pathExists(notFoundHtml)) {
  const targets = [
    resolve(dest, 'admin', 'index.html'),
    resolve(dest, 'admin', 'login', 'index.html'),
    resolve(dest, 'admin', 'setup', 'index.html'),
  ]
  for (const file of targets) {
    await mkdir(dirname(file), { recursive: true })
    await cp(notFoundHtml, file)
  }
}

console.log(`[export] copied ${src} -> ${dest}`)
