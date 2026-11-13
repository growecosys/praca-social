export type EditorHistory<T> = { past: T[]; present: T; future: T[] };
export function commitHistory<T>(h: EditorHistory<T>, next: T, coalesce = false): EditorHistory<T> {
  if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
  return { past: coalesce ? h.past : [...h.past, h.present].slice(-30), present: next, future: [] };
}
export function stepHistory<T>(h: EditorHistory<T>, direction: "undo" | "redo"): EditorHistory<T> {
  if (direction === "undo") {
    if (!h.past.length) return h;
    return {
      past: h.past.slice(0, -1),
      present: h.past.at(-1)!,
      future: [h.present, ...h.future].slice(0, 30),
    };
  }
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present].slice(-30),
    present: h.future[0],
    future: h.future.slice(1),
  };
}
