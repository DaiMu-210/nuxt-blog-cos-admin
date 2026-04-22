import { createError } from 'h3'
import { readSite } from '../../utils/admin-data'

function assertDesktopOnly() {
  const desktopMode = (process.env.NUXT_DESKTOP || '').trim() === '1'
  if (!desktopMode) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

export default defineEventHandler(async () => {
  assertDesktopOnly()
  return await readSite()
})

