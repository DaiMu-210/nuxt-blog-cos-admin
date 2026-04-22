import { useState } from '#app';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
  createdAt: number;
};

function makeId() {
  try {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function useToast() {
  const toasts = useState<ToastItem[]>('app:toasts', () => []);
  const timers = useState<Record<string, number>>('app:toastTimers', () => ({}));

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
    const timer = timers.value[id];
    if (timer && import.meta.client) window.clearTimeout(timer);
    delete timers.value[id];
  }

  function push(kind: ToastKind, message: string, durationMs = 1800) {
    const item: ToastItem = {
      id: makeId(),
      kind,
      message,
      durationMs,
      createdAt: Date.now(),
    };
    toasts.value = [...toasts.value, item].slice(-5);

    if (import.meta.client) {
      const timer = window.setTimeout(() => remove(item.id), Math.max(0, durationMs));
      timers.value[item.id] = timer;
    }

    return item.id;
  }

  return {
    toasts,
    push,
    remove,
    success: (message: string, durationMs?: number) => push('success', message, durationMs),
    error: (message: string, durationMs?: number) => push('error', message, durationMs),
    info: (message: string, durationMs?: number) => push('info', message, durationMs),
  };
}
