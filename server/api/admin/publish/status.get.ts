import { getPublishJob } from '../../../utils/publish';

export default defineEventHandler(() => {
  return getPublishJob();
});
