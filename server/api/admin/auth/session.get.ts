import { isAdminAuthenticated } from '../../../utils/admin-auth'
import { assertAdminEnabled } from '../../../utils/admin-content'

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  return { authenticated: await isAdminAuthenticated(event) }
})
