import { listPosts, assertAdminEnabled } from '../../utils/admin-content'

export default defineEventHandler(async () => {
  assertAdminEnabled()
  return await listPosts()
})

