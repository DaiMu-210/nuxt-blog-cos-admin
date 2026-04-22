export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number) {
  const next = arr.slice();
  if (next.length === 0) return next;
  const from = Math.max(0, Math.min(next.length - 1, fromIndex));
  const to = Math.max(0, Math.min(next.length - 1, toIndex));
  if (from === to) return next;
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}
