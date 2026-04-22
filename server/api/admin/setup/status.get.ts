import { assertAdminEnabled } from '../../../utils/admin-content'
import { isAdminSetupDone } from '../../../utils/admin-auth'

export default defineEventHandler(async () => {
  assertAdminEnabled()
  return { initialized: await isAdminSetupDone() }
})

