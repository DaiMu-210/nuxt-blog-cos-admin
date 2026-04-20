import { getRouterParam } from 'h3'
import { readPost, assertAdminEnabled } from '../../../utils/admin-content'

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const slug = getRouterParam(event, 'slug') || ''
  return await readPost(slug)
})

