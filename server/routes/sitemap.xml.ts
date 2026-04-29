import { defineEventHandler, getRequestURL, setHeader } from 'h3'
import { buildSitemapUrlEntries, chunkUrls, renderSitemapIndexXml, SITEMAP_MAX_URLS_PER_FILE } from '../utils/sitemap'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const url = getRequestURL(event)
  const baseUrl = String((config.public as any)?.siteUrl || `${url.protocol}//${url.host}`).replace(/\/+$/, '')

  const sitemapCfg = (config.public as any)?.sitemap || {}
  const locales = sitemapCfg.locales ?? (config.public as any)?.sitemapLocales
  const defaultLocale = sitemapCfg.defaultLocale ?? (config.public as any)?.sitemapDefaultLocale
  const localeStrategy =
    sitemapCfg.strategy || sitemapCfg.localeStrategy || (config.public as any)?.sitemapLocaleStrategy || 'prefix_except_default'

  const { urls, lastmodMax } = await buildSitemapUrlEntries({
    baseUrl,
    locales,
    defaultLocale,
    localeStrategy,
  })

  const parts = chunkUrls(urls, SITEMAP_MAX_URLS_PER_FILE)
  const indexParts = parts.map((_, i) => ({
    loc: `${baseUrl}/sitemaps/${i + 1}.xml`,
    lastmod: lastmodMax,
  }))

  const xml = renderSitemapIndexXml(baseUrl, indexParts)
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
