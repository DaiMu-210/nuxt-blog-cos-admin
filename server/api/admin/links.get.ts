import { readLinks } from '../../utils/admin-data'

export default defineEventHandler(async () => {
  return await readLinks()
})

