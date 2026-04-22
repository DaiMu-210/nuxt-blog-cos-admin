import { assertAdminAuthenticated } from '../utils/admin-auth'

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/admin/')) return
  if (path.startsWith('/api/admin/auth/')) return
  if (path.startsWith('/api/admin/setup/')) return
  await assertAdminAuthenticated(event)
})
