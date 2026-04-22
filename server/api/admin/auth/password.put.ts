import { readBody } from 'h3'
import { assertAdminEnabled } from '../../../utils/admin-content'
import { assertAdminAuthenticated, changeAdminPassword } from '../../../utils/admin-auth'

type Body = {
  oldPassword?: string
  newPassword?: string
}

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  await assertAdminAuthenticated(event)
  const body = await readBody<Body>(event)
  return await changeAdminPassword(body?.oldPassword ?? '', body?.newPassword ?? '')
})

