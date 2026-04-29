import { assertAdminEnabled } from '../../../utils/admin-content'
import { deleteMurmur } from '../../../utils/admin-murmurs'

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const slug = event.context.params?.slug
  return await deleteMurmur(Array.isArray(slug) ? slug.join('/') : String(slug || ''))
})

