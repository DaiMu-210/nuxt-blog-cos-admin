import { cp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const src = resolve(root, '.output', 'public')
const dest = resolve(root, 'dist')

await rm(dest, { recursive: true, force: true })
await cp(src, dest, { recursive: true })

console.log(`[export] copied ${src} -> ${dest}`)

