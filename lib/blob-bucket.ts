import { get, list, put } from "@vercel/blob";

export interface BucketObject {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  httpMetadata: { contentType?: string; cacheControl?: string };
  writeHttpMetadata(headers: Headers): void;
}

export interface BucketPutOptions {
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
}

type PutBody = Parameters<typeof put>[1];

function toBody(value: ArrayBuffer | ArrayBufferView | ReadableStream | string | Blob): PutBody {
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer as ArrayBuffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  return value as PutBody;
}

/** R2-shaped facade over a private Vercel Blob store. Keys map to blob pathnames. */
export const bucket = {
  async get(key: string): Promise<BucketObject | null> {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const contentType = result.blob.contentType;
    return {
      body: result.stream,
      httpEtag: result.blob.etag,
      // Private blobs report `cache-control: private`; callers own the caching policy instead.
      httpMetadata: { contentType },
      writeHttpMetadata(headers: Headers) {
        if (contentType) headers.set("content-type", contentType);
      },
    };
  },

  async put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string | Blob,
    options: BucketPutOptions = {},
  ) {
    return put(key, toBody(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: options.httpMetadata?.contentType,
      cacheControlMaxAge: 31_536_000,
    });
  },

  async list(options: { prefix?: string; limit?: number; cursor?: string } = {}) {
    const page = await list({
      prefix: options.prefix,
      limit: options.limit,
      cursor: options.cursor,
    });
    return {
      objects: page.blobs.map((blob) => ({
        key: blob.pathname,
        uploaded: new Date(blob.uploadedAt),
      })),
      truncated: page.hasMore,
      cursor: page.cursor,
    };
  },
};

export type Bucket = typeof bucket;
