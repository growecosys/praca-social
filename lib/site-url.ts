/**
 * Public origin of this deployment. Email links must open on the same origin that requested them
 * (the confirmation cookie is per-origin), so previews use their own URL while production uses
 * the production domain. An explicit AUTH_EMAIL_ORIGIN or NEXT_PUBLIC_SITE_URL always wins.
 */
export function siteOrigin(): string | undefined {
  const explicit = process.env.AUTH_EMAIL_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL;
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const value = explicit || (host ? `https://${host}` : undefined);
  return value ? new URL(value).origin : undefined;
}

export function metadataBase(): URL {
  return new URL(siteOrigin() ?? "http://localhost:3000");
}
