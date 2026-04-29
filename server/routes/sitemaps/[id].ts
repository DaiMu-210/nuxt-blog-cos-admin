import { createError, defineEventHandler, getRequestURL, setHeader } from 'h3'
import { buildSitemapUrlEntries, chunkUrls, renderUrlsetXml, SITEMAP_MAX_URLS_PER_FILE } from '../../utils/sitemap'

export default defineEventHandler(async (event) => {
  const raw = String(event.context.params?.id || '').trim()
  const m = raw.match(/^(\d+)\.xml$/)
  if (!m) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const idx = Number(m[1]) - 1
  if (!(idx >= 0)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const config = useRuntimeConfig()
  const url = getRequestURL(event)
  const baseUrl = String((config.public as any)?.siteUrl || `${url.protocol}//${url.host}`).replace(/\/+$/, '')

  const sitemapCfg = (config.public as any)?.sitemap || {}
  const locales = sitemapCfg.locales ?? (config.public as any)?.sitemapLocales
  const defaultLocale = sitemapCfg.defaultLocale ?? (config.public as any)?.sitemapDefaultLocale
  const localeStrategy =
    sitemapCfg.strategy || sitemapCfg.localeStrategy || (config.public as any)?.sitemapLocaleStrategy || 'prefix_except_default'

  const { urls } = await buildSitemapUrlEntries({
    baseUrl,
    locales,
    defaultLocale,
    localeStrategy,
  })

  const parts = chunkUrls(urls, SITEMAP_MAX_URLS_PER_FILE)
  const part = parts[idx]
  if (!part) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const xml = renderUrlsetXml(part)
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})

