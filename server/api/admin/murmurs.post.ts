import { readBody } from 'h3'
import { assertAdminEnabled } from '../../utils/admin-content'
import type { MurmurData } from '../../utils/admin-murmurs'
import { createMurmur } from '../../utils/admin-murmurs'

type CreateMurmurBody = Partial<MurmurData>

export default defineEventHandler(async (event) => {
  assertAdminEnabled()
  const body = await readBody<CreateMurmurBody>(event)
  return await createMurmur(body || {})
})

