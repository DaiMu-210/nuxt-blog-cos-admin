import { startPublish } from '../../../utils/publish';

export default defineEventHandler(async () => {
  return await startPublish();
});
