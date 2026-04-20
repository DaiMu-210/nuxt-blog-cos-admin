import { createError, getRouterParam, readBody } from 'h3'
import { writePost, assertAdminEnabled } from '../../../utils/admin-content'

type UpdatePostBody = {
  markdown?: string
  meta?: Record<string, any>
  body?: string
}

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const slug = getRouterParam(event, 'slug') || ''
  const body = await readBody<UpdatePostBody>(event)
  if (!body?.markdown && body?.body == null) {
    throw createError({ statusCode: 400, statusMessage: '缺少内容' })
  }
  if (body.markdown) {
    await writePost(slug, { markdown: body.markdown })
    return { ok: true }
  }
  await writePost(slug, { meta: body.meta ?? {}, body: body.body ?? '' })
  return { ok: true }
})
