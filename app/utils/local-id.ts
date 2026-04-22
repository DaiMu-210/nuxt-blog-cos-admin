export function makeLocalId(prefix = 'id') {
  try {
    const id = globalThis.crypto?.randomUUID?.();
    if (id) return `${prefix}_${id}`;
  } catch {}
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

