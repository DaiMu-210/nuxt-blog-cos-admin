import { readBody } from 'h3'
import { writeSite, type SiteData } from '../../utils/admin-data'

export default defineEventHandler(async (event) => {
  const body = await readBody<SiteData>(event)
  return await writeSite(body)
})

