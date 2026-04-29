import { assertAdminEnabled } from '../../../utils/admin-content'
import { readMurmur } from '../../../utils/admin-murmurs'

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const slug = event.context.params?.slug
  return await readMurmur(Array.isArray(slug) ? slug.join('/') : String(slug || ''))
})

