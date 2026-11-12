// Module-scoped imports keep the DOM lib types (Request.json(): any) intact,
// unlike the global @cloudflare/workers-types entry, which would replace them.
declare module "cloudflare:workers" {
  import type { D1Database, R2Bucket, Fetcher } from "@cloudflare/workers-types/index.ts";

  interface PracaEnv {
    DB: D1Database;
    BUCKET: R2Bucket;
    ASSETS: Fetcher;
    OPENAI_API_KEY?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
    AUTH_EMAIL_ORIGIN?: string;
  }

  export const env: PracaEnv;
}

type D1Database = import("@cloudflare/workers-types/index.ts").D1Database;
type R2Bucket = import("@cloudflare/workers-types/index.ts").R2Bucket;
type Fetcher = import("@cloudflare/workers-types/index.ts").Fetcher;
