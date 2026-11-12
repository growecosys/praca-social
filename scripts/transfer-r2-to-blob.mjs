// Copies every object from the Cloudflare R2 bucket into the private Vercel Blob store.
//
//   R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=… \
//   BLOB_READ_WRITE_TOKEN=… node scripts/transfer-r2-to-blob.mjs [--verify]
//
// Logical keys (avatars/<user-id>/…, <uuid>.png, …) become Blob pathnames unchanged, so every
// /media/<key> and /avatar/<id> URL keeps working. Progress is stored in a JSONL manifest that
// records original key, size, content type, SHA-256, the original R2 timestamp and owner metadata
// (Blob keeps none of these). The manifest is sensitive: it is git-ignored, keep it private.
// Re-running resumes: objects whose destination already hashes to the recorded SHA-256 are skipped.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, appendFileSync } from "node:fs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function readManifest(path) {
  const entries = new Map();
  if (!existsSync(path)) return entries;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim()) {
      const entry = JSON.parse(line);
      entries.set(entry.key, entry);
    }
  }
  return entries;
}

/**
 * source:      { list(): AsyncIterable<{key,size}>, get(key): Promise<{bytes,contentType,uploaded,metadata}> }
 * destination: { put(key, bytes, contentType): Promise<void>, read(key): Promise<Uint8Array|null> }
 */
export async function transferObjects({ source, destination, manifest, record, log = () => {} }) {
  const stats = { copied: 0, skipped: 0, failed: [] };
  for await (const { key } of source.list()) {
    try {
      const previous = manifest.get(key);
      if (previous) {
        const existing = await destination.read(key);
        if (existing && sha256(existing) === previous.sha256) {
          stats.skipped++;
          continue;
        }
      }
      const object = await source.get(key);
      const digest = sha256(object.bytes);
      await destination.put(key, object.bytes, object.contentType);
      const copy = await destination.read(key);
      if (!copy || sha256(copy) !== digest) throw new Error("checksum mismatch after upload");
      const entry = {
        key,
        pathname: key,
        size: object.bytes.byteLength,
        contentType: object.contentType,
        sha256: digest,
        originalUploaded: object.uploaded,
        ownerMetadata: object.metadata ?? {},
      };
      manifest.set(key, entry);
      record(entry);
      stats.copied++;
      log(`copied ${key}`);
    } catch (error) {
      stats.failed.push({ key, error: error.message });
    }
  }
  return stats;
}

/** Re-hashes every manifest entry in the destination without touching the source. */
export async function verifyManifest({ destination, manifest }) {
  const problems = [];
  for (const entry of manifest.values()) {
    const bytes = await destination.read(entry.key);
    if (!bytes) problems.push({ key: entry.key, error: "missing in destination" });
    else if (sha256(bytes) !== entry.sha256)
      problems.push({ key: entry.key, error: "checksum differs" });
  }
  return problems;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "BLOB_READ_WRITE_TOKEN",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment: ${missing.join(", ")}`);

  const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { put, get } = await import("@vercel/blob");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const Bucket = process.env.R2_BUCKET;

  const source = {
    async *list() {
      let ContinuationToken;
      do {
        const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken }));
        for (const item of page.Contents ?? []) yield { key: item.Key, size: item.Size };
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
    },
    async get(key) {
      const object = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
      return {
        bytes: Buffer.from(await object.Body.transformToByteArray()),
        contentType: object.ContentType || "application/octet-stream",
        uploaded: object.LastModified?.toISOString(),
        metadata: object.Metadata,
      };
    },
  };
  const destination = {
    async put(key, bytes, contentType) {
      await put(key, Buffer.from(bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        cacheControlMaxAge: 31_536_000,
      });
    },
    async read(key) {
      const result = await get(key, { access: "private" });
      if (!result || result.statusCode !== 200) return null;
      return Buffer.from(await new Response(result.stream).arrayBuffer());
    },
  };

  const manifestPath = process.env.TRANSFER_MANIFEST || "transfer-manifest.jsonl";
  const manifest = readManifest(manifestPath);
  if (process.argv.includes("--verify")) {
    const problems = await verifyManifest({ destination, manifest });
    console.log(`[verify] ${manifest.size} objects, ${problems.length} problems`);
    console.table(problems);
    process.exit(problems.length ? 1 : 0);
  }
  const stats = await transferObjects({
    source,
    destination,
    manifest,
    record: (entry) => appendFileSync(manifestPath, JSON.stringify(entry) + "\n"),
    log: console.log,
  });
  console.log(
    `[transfer] copied ${stats.copied}, skipped ${stats.skipped}, failed ${stats.failed.length}`,
  );
  if (stats.failed.length) {
    console.table(stats.failed);
    process.exit(1);
  }
}
