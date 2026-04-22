import { readBody } from 'h3'
import { assertAdminEnabled } from '../../../utils/admin-content'
import { initializeAdmin, setAdminSession } from '../../../utils/admin-auth'

type InitBody = {
  password?: string
}

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const body = await readBody<InitBody>(event)
  await initializeAdmin(body?.password ?? '')
  await setAdminSession(event)
  return { ok: true }
})

