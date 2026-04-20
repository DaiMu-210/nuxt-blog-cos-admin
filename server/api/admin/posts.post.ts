import { createError, readBody } from 'h3'
import { writePost, assertAdminEnabled } from '../../utils/admin-content'

type CreatePostBody = {
  slug: string
  markdown?: string
  meta?: Record<string, any>
  body?: string
}

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const body = await readBody<CreatePostBody>(event)
  if (!body?.slug) {
    throw createError({ statusCode: 400, statusMessage: '缺少 slug' })
  }

  if (body.markdown) {
    await writePost(body.slug, { markdown: body.markdown })
    return { ok: true }
  }

  const meta = body.meta ?? {
    title: '未命名',
    date: new Date().toISOString().slice(0, 10),
    tags: [],
    draft: true
  }
  const contentBody = body.body ?? `# ${meta.title || '未命名'}\n\n`
  await writePost(body.slug, { meta, body: contentBody })
  return { ok: true }
})
