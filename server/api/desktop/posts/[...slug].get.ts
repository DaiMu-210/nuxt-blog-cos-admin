import { createError } from 'h3'
import { readPost } from '../../../utils/admin-content'

function assertDesktopOnly() {
  const desktopMode = (process.env.NUXT_DESKTOP || '').trim() === '1'
  if (!desktopMode) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

export default defineEventHandler(async (event) => {
  assertDesktopOnly()
  const slug = getRouterParam(event, 'slug') || ''
  return await readPost(slug)
})

