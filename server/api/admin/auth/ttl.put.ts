import { readBody } from 'h3'
import { assertAdminEnabled } from '../../../utils/admin-content'
import {
  assertAdminAuthenticated,
  setAdminSession,
  updateAdminSessionTtlSeconds
} from '../../../utils/admin-auth'

type Body = {
  ttlSeconds?: number
}

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  await assertAdminAuthenticated(event)
  const body = await readBody<Body>(event)
  const res = await updateAdminSessionTtlSeconds(body?.ttlSeconds as any)
  await setAdminSession(event)
  return res
})

