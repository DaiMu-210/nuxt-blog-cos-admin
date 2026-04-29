import { assertAdminEnabled } from '../../utils/admin-content'
import { listMurmurs } from '../../utils/admin-murmurs'

export default defineEventHandler(async () => {
  assertAdminEnabled()
  return await listMurmurs()
})

