import { env } from "../../../lib/env";
import { createImage } from "../../../lib/ai";
import { requirePracaUser } from "../../../lib/praca-auth";
const LIMIT = 3;
async function state(userId: string) {
  const rows = await env.DB.prepare(
    "SELECT id,status,image_key FROM post_images WHERE user_id=? ORDER BY created_at DESC",
  )
    .bind(userId)
    .all();
  const used = rows.results.filter((r: any) => r.status !== "failed").length;
  return {
    remaining: Math.max(0, LIMIT - used),
    limit: LIMIT,
    images: rows.results
      .filter((r: any) => r.status === "complete")
      .map((r: any) => ({ id: r.id, url: `/media/${r.image_key}` })),
  };
}
export async function GET() {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  return Response.json(await state(auth.user!.id), { headers: { "cache-control": "no-store" } });
}
export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const p = await request.json().catch(() => null);
  if (
    p?.confirmed !== true ||
    typeof p.prompt !== "string" ||
    p.prompt.trim().length < 20 ||
    p.prompt.length > 6000 ||
    !/^[-a-f0-9]{36}$/i.test(p.requestId || "")
  )
    return Response.json(
      { error: "Revise um prompt de 20 a 6.000 caracteres e confirme a geração." },
      { status: 400 },
    );
  if (!env.BUCKET)
    return Response.json(
      { error: "A geração está temporariamente indisponível." },
      { status: 503 },
    );
  const existing = await env.DB.prepare(
    "SELECT user_id,status,image_key FROM post_images WHERE id=?",
  )
    .bind(p.requestId)
    .first();
  if (existing) {
    if (existing.user_id !== user.id)
      return Response.json({ error: "Solicitação inválida." }, { status: 409 });
    return existing.status === "complete"
      ? Response.json({ url: `/media/${existing.image_key}`, ...(await state(user.id)) })
      : Response.json(
          {
            error:
              "Esta solicitação já foi recebida. Reabra a galeria para verificar o resultado; ela não será gerada novamente.",
          },
          { status: 409 },
        );
  }
  const reservation = await env.DB.prepare(
    "INSERT INTO post_images(id,user_id,prompt,status) SELECT CAST(? AS text),CAST(? AS text),CAST(? AS text),'pending' WHERE (SELECT count(*) FROM post_images WHERE user_id=? AND status!='failed') < CAST(? AS bigint) ON CONFLICT DO NOTHING",
  )
    .bind(p.requestId, user.id, p.prompt.trim(), user.id, LIMIT)
    .run();
  if (!reservation.meta.changes)
    return Response.json(
      {
        error: "Sua cota de imagens para posts foi utilizada. Os créditos de avatar são separados.",
      },
      { status: 429 },
    );
  try {
    const image = await createImage({
      model: "gpt-image-2",
      prompt: p.prompt.trim(),
      format: "webp",
      quality: "low",
      signal: AbortSignal.timeout(180000),
    });
    if (!image.ok) {
      await env.DB.prepare("UPDATE post_images SET status='failed' WHERE id=?")
        .bind(p.requestId)
        .run();
      return Response.json(
        {
          error:
            "A geração não foi concluída. Nenhum crédito da Praça foi descontado. Verifique a disponibilidade da API e tente novamente.",
        },
        { status: 502 },
      );
    }
    const imageKey = `${crypto.randomUUID()}.webp`;
    await env.BUCKET.put(imageKey, image.bytes, {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { ownerId: user.id },
    });
    await env.DB.prepare("UPDATE post_images SET status='complete',image_key=? WHERE id=?")
      .bind(imageKey, p.requestId)
      .run();
    return Response.json({ url: `/media/${imageKey}`, ...(await state(user.id)) });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível confirmar o resultado. Para evitar cobrança duplicada, esta solicitação não será repetida automaticamente. Reabra a galeria para verificar.",
      },
      { status: 502 },
    );
  }
}
