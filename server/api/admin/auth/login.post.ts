import { createError, readBody } from 'h3'
import { assertAdminEnabled } from '../../../utils/admin-content'
import { setAdminSession, verifyAdminPassword } from '../../../utils/admin-auth'

type LoginBody = {
  password?: string;
};

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const body = await readBody<LoginBody>(event)
  if (!(await verifyAdminPassword(body?.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: '密码错误',
    })
  }

  await setAdminSession(event)
  return { ok: true }
});
