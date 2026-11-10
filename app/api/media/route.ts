import { env } from "cloudflare:workers";
import { requirePracaUser } from "../../../lib/praca-auth";

const allowed = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  const auth = await requirePracaUser(); if (auth.error) return auth.error; const user = auth.user!;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type)) return Response.json({ error: "Envie uma imagem JPG, PNG, GIF, WebP ou AVIF." }, { status: 400 });
  if (file.size > 900 * 1024) return Response.json({ error: "A imagem enviada deve ter até 900 KB após otimização." }, { status: 413 });
  if (!env.BUCKET) return Response.json({ error: "O armazenamento de imagens está indisponível." }, { status: 503 });
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
  const key = `${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { ownerId: user.id } });
  return Response.json({ url: `/media/${key}`, mediaType: file.type }, { status: 201 });
}
