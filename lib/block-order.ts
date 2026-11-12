export function reorderBlock<T extends { id: string }>(
  items: T[],
  id: string,
  destination: number,
): T[] {
  const from = items.findIndex((b) => b.id === id);
  if (from < 0 || !Number.isInteger(destination)) return items;
  const to = Math.max(0, Math.min(items.length - 1, destination));
  if (from === to) return items;
  const next = [...items],
    [block] = next.splice(from, 1);
  next.splice(to, 0, block);
  return next;
}
export function blockDropIndex(rects: Array<{ top: number; bottom: number }>, y: number) {
  return rects.filter((r) => y > (r.top + r.bottom) / 2).length;
}
