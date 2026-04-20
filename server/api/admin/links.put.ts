import { readBody } from 'h3'
import { writeLinks, type LinksData } from '../../utils/admin-data'

export default defineEventHandler(async (event) => {
  const body = await readBody<LinksData>(event)
  return await writeLinks(body)
})

