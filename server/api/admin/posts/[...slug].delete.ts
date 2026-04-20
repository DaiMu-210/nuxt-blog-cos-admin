import { getRouterParam } from 'h3'
import { deletePost, assertAdminEnabled } from '../../../utils/admin-content'

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const slug = getRouterParam(event, 'slug') || ''
  await deletePost(slug)
  return { ok: true }
})

