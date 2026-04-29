import { createError } from 'h3'
import { readSite } from '../../utils/admin-data'
import { listMurmurs } from '../../utils/admin-murmurs'

function assertDesktopOnly() {
  const desktopMode = (process.env.NUXT_DESKTOP || '').trim() === '1'
  if (!desktopMode) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

export default defineEventHandler(async () => {
  assertDesktopOnly()
  const site: any = await readSite().catch(() => null)
  const visibleDays = Number(site?.murmurs?.visibleDays ?? 0)
  const cutoff = visibleDays > 0 ? Date.now() - visibleDays * 24 * 60 * 60 * 1000 : 0

  const items = await listMurmurs()
  return items.filter((it: any) => {
    if (it?.draft) return false
    if (visibleDays <= 0) return true
    const t = Date.parse(String(it?.date || ''))
    if (!Number.isFinite(t)) return true
    return t >= cutoff
  })
})

