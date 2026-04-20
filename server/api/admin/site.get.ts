import { readSite } from '../../utils/admin-data'

export default defineEventHandler(async () => {
  return await readSite()
})

