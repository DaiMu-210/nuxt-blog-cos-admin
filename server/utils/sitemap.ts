import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import matter from 'gray-matter'

export type SitemapAlt = { hreflang: string; href: string }

export type SitemapUrl = {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  alternates?: SitemapAlt[]
}

export type SitemapBuildOptions = {
  baseUrl: string
  locales?: string[]
  defaultLocale?: string
  localeStrategy?: 'no_prefix' | 'prefix' | 'prefix_except_default'
}

export const SITEMAP_MAX_URLS_PER_FILE = 45000

function escapeXml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeBaseUrl(baseUrl: string) {
  return String(baseUrl || '').replace(/\/+$/, '')
}

function toAbs(baseUrl: string, path: string) {
  const b = normalizeBaseUrl(baseUrl)
  const p = String(path || '').startsWith('/') ? String(path || '') : `/${String(path || '')}`
  return `${b}${p}`
}

function normalizeLocales(input: any): string[] {
  if (!input) return []
  if (Array.isArray(input)) return input.map((x) => String(x || '').trim()).filter(Boolean)
  return String(input || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildAlternates(baseUrl: string, path: string, opts: SitemapBuildOptions) {
  const locales = normalizeLocales(opts.locales)
  if (!locales.length) return undefined

  const defaultLocale = String(opts.defaultLocale || locales[0] || '').trim()
  const strategy = opts.localeStrategy || 'prefix_except_default'

  const hrefFor = (locale: string) => {
    const lc = String(locale || '').trim()
    if (!lc) return toAbs(baseUrl, path)
    if (strategy === 'no_prefix') return toAbs(baseUrl, path)
    if (strategy === 'prefix') return toAbs(baseUrl, `/${lc}${path === '/' ? '' : path}`)
    if (strategy === 'prefix_except_default') {
      if (lc === defaultLocale) return toAbs(baseUrl, path)
      return toAbs(baseUrl, `/${lc}${path === '/' ? '' : path}`)
    }
    return toAbs(baseUrl, path)
  }

  const alts: SitemapAlt[] = locales.map((lc) => ({ hreflang: lc, href: hrefFor(lc) }))
  if (defaultLocale) alts.push({ hreflang: 'x-default', href: hrefFor(defaultLocale) })
  return alts
}

function base64UrlEncodeUtf8(input: string) {
  // Node 18+ supports base64url
  return Buffer.from(String(input || ''), 'utf8').toString('base64url')
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

async function listPublishedPosts() {
  const postsDir = resolve(process.cwd(), 'content', 'posts')
  let files: string[] = []
  try {
    files = (await walk(postsDir)).filter((f) => f.endsWith('.md'))
  } catch {
    files = []
  }

  const posts: Array<{ slug: string; category?: string; mtime: Date; date?: string }> = []
  for (const file of files) {
    const slug = relative(postsDir, file).replace(/\\/g, '/').replace(/\.md$/, '')
    const raw = await readFile(file, 'utf8')
    const parsed = matter(raw)
    const meta = (parsed.data ?? {}) as any
    if (meta?.draft) continue
    const st = await stat(file)
    posts.push({
      slug,
      category: meta?.category ? String(meta.category) : undefined,
      mtime: st.mtime,
      date: meta?.date ? String(meta.date) : undefined,
    })
  }

  posts.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  return posts
}

export async function buildSitemapUrlEntries(opts: SitemapBuildOptions): Promise<{
  urls: SitemapUrl[]
  lastmodMax?: string
  warnings: string[]
}> {
  const baseUrl = normalizeBaseUrl(opts.baseUrl)
  const warnings: string[] = []

  const topPages: Array<{ path: string; changefreq: SitemapUrl['changefreq']; priority: number }> = [
    { path: '/', changefreq: 'daily', priority: 1.0 },
    { path: '/posts', changefreq: 'daily', priority: 0.9 },
    { path: '/archives', changefreq: 'weekly', priority: 0.6 },
    { path: '/categories', changefreq: 'weekly', priority: 0.6 },
    { path: '/links', changefreq: 'monthly', priority: 0.4 },
    { path: '/murmurs', changefreq: 'daily', priority: 0.7 },
  ]

  const posts = await listPublishedPosts()
  const urls: SitemapUrl[] = []

  const lastmodMaxTs = posts.length ? posts[0]!.mtime.getTime() : Date.now()
  const lastmodMax = new Date(lastmodMaxTs).toISOString()

  for (const p of topPages) {
    urls.push({
      loc: toAbs(baseUrl, p.path),
      lastmod: lastmodMax,
      changefreq: p.changefreq,
      priority: p.priority,
      alternates: buildAlternates(baseUrl, p.path, opts),
    })
  }

  for (const p of posts) {
    const path = `/posts/${encodeURI(p.slug)}`
    urls.push({
      loc: toAbs(baseUrl, path),
      lastmod: p.mtime.toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
      alternates: buildAlternates(baseUrl, path, opts),
    })
  }

  const categories = new Map<string, number>()
  for (const p of posts) {
    const c = String(p.category || '未分类')
    const ts = p.mtime.getTime()
    const cur = categories.get(c) || 0
    if (ts > cur) categories.set(c, ts)
  }

  for (const [name, ts] of categories.entries()) {
    const encoded = base64UrlEncodeUtf8(name)
    const path = `/categories/${encoded}`
    urls.push({
      loc: toAbs(baseUrl, path),
      lastmod: new Date(ts).toISOString(),
      changefreq: 'weekly',
      priority: 0.5,
      alternates: buildAlternates(baseUrl, path, opts),
    })
  }

  if (!baseUrl) warnings.push('baseUrl 为空：请配置 runtimeConfig.public.siteUrl（例如 https://blog.example.com）')
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(baseUrl)) {
    warnings.push('当前 sitemap 使用 localhost 作为站点域名：请在构建/发布时设置 NUXT_PUBLIC_SITE_URL')
  }
  return { urls, lastmodMax, warnings }
}

export function chunkUrls<T>(list: T[], chunkSize = SITEMAP_MAX_URLS_PER_FILE) {
  const size = Math.max(1, Math.floor(chunkSize))
  const chunks: T[][] = []
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size))
  return chunks
}

export function renderSitemapIndexXml(baseUrl: string, parts: Array<{ loc: string; lastmod?: string }>) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...parts.map((p) => {
      const lastmod = p.lastmod ? `<lastmod>${escapeXml(p.lastmod)}</lastmod>` : ''
      return `<sitemap><loc>${escapeXml(p.loc)}</loc>${lastmod}</sitemap>`
    }),
    '</sitemapindex>',
  ].join('')
  return xml
}

export function renderUrlsetXml(urls: SitemapUrl[]) {
  const hasAlt = urls.some((u) => (u.alternates || []).length)
  const ns = hasAlt
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset ${ns}>`,
    ...urls.map((u) => {
      const parts: string[] = []
      parts.push('<url>')
      parts.push(`<loc>${escapeXml(u.loc)}</loc>`)
      if (u.lastmod) parts.push(`<lastmod>${escapeXml(u.lastmod)}</lastmod>`)
      if (u.changefreq) parts.push(`<changefreq>${escapeXml(u.changefreq)}</changefreq>`)
      if (typeof u.priority === 'number') parts.push(`<priority>${escapeXml(u.priority.toFixed(1))}</priority>`)
      for (const alt of u.alternates || []) {
        parts.push(
          `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />`,
        )
      }
      parts.push('</url>')
      return parts.join('')
    }),
    '</urlset>',
  ].join('')

  return xml
}
