import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, isAbsolute } from 'node:path'
import { createError } from 'h3'
import { assertAdminEnabled } from './admin-content'

export type MurmurData = {
  slug: string
  text: string
  date: string
  images?: string[]
  draft?: boolean
}

export type AdminMurmurListItem = {
  slug: string
  filePath: string
  date?: string
  text?: string
  images?: string[]
  imagesCount?: number
  draft?: boolean
  updatedAt?: string
}

function getDesktopDataDir() {
  const v = String(process.env.NUXT_DESKTOP_DATA_DIR || '').trim()
  return v ? resolve(v) : ''
}

function getBundledMurmursDir() {
  return resolve(process.cwd(), 'content', 'murmurs')
}

function getDesktopMurmursDir() {
  const base = getDesktopDataDir()
  return base ? resolve(base, 'content', 'murmurs') : ''
}

async function pathExists(p: string) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

function safeResolveMurmurPath(murmursDir: string, slug: string) {
  const filePath = resolve(murmursDir, `${slug}.json`)
  const rel = relative(murmursDir, filePath)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw createError({ statusCode: 400, statusMessage: '非法路径' })
  }
  return filePath
}

async function walk(dir: string): Promise<string[]> {
  const ents = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const ent of ents) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) files.push(...(await walk(p)))
    else files.push(p)
  }
  return files
}

function normalizeImages(input: any): string[] | undefined {
  if (!input) return undefined
  const list = Array.isArray(input) ? input : [input]
  const items = list.map((x) => String(x || '').trim()).filter(Boolean)
  return items.length ? items.slice(0, 9) : undefined
}

function normalizeText(input: any): string {
  return String(input || '').trim()
}

function normalizeDate(input: any): string | undefined {
  if (!input) return undefined
  if (input instanceof Date) return input.toISOString()
  if (typeof input === 'number') return new Date(input).toISOString()
  if (typeof input === 'string') return input
  return String(input)
}

function normalizeMurmurData(input: Partial<MurmurData> | any, slugFallback = ''): MurmurData {
  const slug = String(input?.slug || slugFallback || '').trim()
  const text = normalizeText(input?.text)
  const images = normalizeImages(input?.images)
  const date = normalizeDate(input?.date)
  const draft = Boolean(input?.draft)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少 slug' })
  }
  if (!text && !(images && images.length)) {
    throw createError({ statusCode: 400, statusMessage: '内容或图片至少填写一项' })
  }
  if (!date) {
    throw createError({ statusCode: 400, statusMessage: '缺少 date' })
  }

  return {
    slug,
    text,
    date,
    ...(images ? { images } : {}),
    ...(draft ? { draft: true } : {}),
  }
}

async function collectMurmurs(murmursDir: string): Promise<AdminMurmurListItem[]> {
  if (!(await pathExists(murmursDir))) return []
  const allFiles = (await walk(murmursDir)).filter((f) => f.endsWith('.json'))
  const items: AdminMurmurListItem[] = []
  for (const file of allFiles) {
    const slug = relative(murmursDir, file).replace(/\\/g, '/').replace(/\.json$/, '')
    try {
      const raw = await readFile(file, 'utf8')
      const parsed = JSON.parse(raw || '{}') as Partial<MurmurData>
      const st = await stat(file)
      items.push({
        slug,
        filePath: `content/murmurs/${slug}.json`,
        date: normalizeDate(parsed?.date),
        text: String(parsed?.text || ''),
        images: normalizeImages(parsed?.images),
        imagesCount: Array.isArray(parsed?.images) ? parsed.images.length : 0,
        draft: Boolean(parsed?.draft),
        updatedAt: st.mtime.toISOString(),
      })
    } catch {
      const st = await stat(file).catch(() => null)
      items.push({
        slug,
        filePath: `content/murmurs/${slug}.json`,
        date: undefined,
        text: '',
        images: undefined,
        imagesCount: 0,
        draft: true,
        updatedAt: st?.mtime?.toISOString?.() || undefined,
      })
    }
  }
  return items
}

export async function listMurmurs(): Promise<AdminMurmurListItem[]> {
  const bundledDir = getBundledMurmursDir()
  const desktopDir = getDesktopMurmursDir()
  const [bundled, desktop] = await Promise.all([
    collectMurmurs(bundledDir).catch(() => []),
    desktopDir ? collectMurmurs(desktopDir).catch(() => []) : Promise.resolve([]),
  ])

  const map = new Map<string, AdminMurmurListItem>()
  for (const it of bundled) map.set(it.slug, it)
  for (const it of desktop) map.set(it.slug, it)
  const items = Array.from(map.values())

  items.sort(
    (a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  )
  return items
}

export async function readMurmur(slug: string) {
  const desktopDir = getDesktopMurmursDir()
  const bundledDir = getBundledMurmursDir()
  const desktopPath = desktopDir ? safeResolveMurmurPath(desktopDir, slug) : ''
  const bundledPath = safeResolveMurmurPath(bundledDir, slug)
  const filePath = desktopPath && (await pathExists(desktopPath)) ? desktopPath : bundledPath
  const raw = await readFile(filePath, 'utf8')
  const data = normalizeMurmurData(JSON.parse(raw || '{}'), slug)
  return { slug, data }
}

export async function createMurmur(input: Partial<MurmurData>) {
  assertAdminEnabled()
  const murmursDir = getDesktopMurmursDir() || getBundledMurmursDir()
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const baseSlug = `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}`

  let slug = baseSlug
  let filePath = safeResolveMurmurPath(murmursDir, slug)
  if (await pathExists(filePath)) {
    const rand = Math.random().toString(36).slice(2, 6)
    slug = `${baseSlug}-${rand}`
    filePath = safeResolveMurmurPath(murmursDir, slug)
  }

  const data = normalizeMurmurData({
    slug,
    ...input,
    date: input?.date || now.toISOString(),
  }, slug)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  return { ok: true, slug }
}

export async function updateMurmur(slug: string, input: Partial<MurmurData>) {
  assertAdminEnabled()
  const murmursDir = getDesktopMurmursDir() || getBundledMurmursDir()
  const filePath = safeResolveMurmurPath(murmursDir, slug)
  const data = normalizeMurmurData({ ...input, slug }, slug)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  return { ok: true }
}

export async function deleteMurmur(slug: string) {
  assertAdminEnabled()
  const murmursDir = getDesktopMurmursDir() || getBundledMurmursDir()
  const filePath = safeResolveMurmurPath(murmursDir, slug)
  await rm(filePath, { force: true })
  return { ok: true }
}
