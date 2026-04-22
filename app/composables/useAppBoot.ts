import { useState } from '#app';

export function useAppBoot() {
  const bootPending = useState<boolean>('app:bootPending', () => true);

  function markBooted() {
    bootPending.value = false;
  }

  return { bootPending, markBooted };
}
