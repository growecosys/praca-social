/**
 * Caller address for rate limiting. Vercel overwrites these headers at the edge, so they cannot be
 * spoofed by the client in production.
 */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
