// Only D1 comes from @cloudflare/workers-types. Its R2/Fetcher/Request types clash with the
// DOM lib that Next.js route handlers use, so those are described structurally here.
type D1Database = import("@cloudflare/workers-types/index.ts").D1Database;

interface R2ObjectBody {
  body: ReadableStream;
  httpEtag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
}

interface R2PutOptions {
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: R2PutOptions,
  ): Promise<unknown>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ objects: { key: string; uploaded: Date }[]; truncated: boolean; cursor?: string }>;
}

interface Fetcher {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
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
