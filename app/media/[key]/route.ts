import { env } from "cloudflare:workers";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(key) || !env.BUCKET) return new Response("Não encontrado", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Não encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
  if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
