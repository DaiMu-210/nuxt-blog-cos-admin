import { readBody } from 'h3'
import { assertAdminEnabled } from '../../../utils/admin-content'
import type { MurmurData } from '../../../utils/admin-murmurs'
import { updateMurmur } from '../../../utils/admin-murmurs'

type UpdateMurmurBody = Partial<MurmurData>

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const body = await readBody<UpdateMurmurBody>(event)
  const slug = event.context.params?.slug
  return await updateMurmur(Array.isArray(slug) ? slug.join('/') : String(slug || ''), body || {})
})

