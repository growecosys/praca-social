export function unreadCount(value: unknown) {
  const n = typeof value === "number" ? value : 0;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
export function notificationTitle(title: string, count: number) {
  const base = title.replace(/^\((?:\d+|99\+)\)\s*/, "");
  const n = unreadCount(count);
  return n ? `(${n > 99 ? "99+" : n}) ${base}` : base;
}
export function brandIcon(count = 0) {
  const n = unreadCount(count);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#244e35"/><path d="M17 47 38 26M20 42C13 29 24 13 44 14c5 18-2 31-20 30" fill="none" stroke="#f5f1e8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 36h10M33 30V20" stroke="#f0c64b" stroke-width="4" stroke-linecap="round"/>${n ? `<circle cx="50" cy="14" r="14" fill="#b52d25" stroke="#f5f1e8" stroke-width="2"/><text x="50" y="18" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="${n > 9 ? 12 : 16}" font-weight="700">${n > 99 ? "99+" : n}</text>` : ""}</svg>`;
}
