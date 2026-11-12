import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activityEvents, notifications, pokes, posts, users } from "../../../../db/schema";
import { requirePracaUser } from "../../../../lib/praca-auth";
import { connect } from "../../../../lib/connections";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const id = Number((await params).id);
  const payload = (await request.json().catch(() => ({}))) as { action?: string };
  const db = getDb();
  const poke = (
    await db
      .select({
        id: pokes.id,
        status: pokes.status,
        senderId: pokes.senderId,
        recipientId: pokes.recipientId,
        kind: pokes.kind,
        targetSlug: posts.slug,
        senderUsername: users.username,
      })
      .from(pokes)
      .innerJoin(users, eq(pokes.senderId, users.id))
      .leftJoin(posts, eq(pokes.targetPostId, posts.id))
      .where(eq(pokes.id, id))
      .limit(1)
  )[0];
  if (!poke) return Response.json({ error: "Conexão não encontrada." }, { status: 404 });
  const now = sql`CURRENT_TIMESTAMP`;
  if (payload.action === "cancel") {
    if (poke.senderId !== auth.user!.id)
      return Response.json({ error: "Somente quem iniciou pode cancelar." }, { status: 403 });
    await db.update(pokes).set({ status: "cancelled", resolvedAt: now }).where(eq(pokes.id, id));
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.recipientId, poke.recipientId),
          eq(notifications.dedupeKey, `connection:${id}`),
        ),
      );
    return Response.json({ ok: true });
  }
  if (poke.recipientId !== auth.user!.id)
    return Response.json({ error: "Esta conexão não espera uma ação sua." }, { status: 403 });
  if (!["pending", "seen", "accepted"].includes(poke.status))
    return Response.json({ error: "Essa interação já foi resolvida." }, { status: 409 });
  if (!["return", "decline", "attend", "archive"].includes(payload.action || ""))
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  if (payload.action === "return") {
    if (poke.kind !== "mystery")
      return Response.json(
        { error: "Somente aproximações podem ser retribuídas." },
        { status: 400 },
      );
    await connect(poke.senderId, poke.recipientId);
  }
  const status =
    payload.action === "attend" && (poke.kind === "opinion" || poke.kind === "publish")
      ? "accepted"
      : "archived";
  await db.update(pokes).set({ status, seenAt: now, resolvedAt: now }).where(eq(pokes.id, id));
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.recipientId, auth.user!.id),
        eq(notifications.dedupeKey, `connection:${id}`),
      ),
    );
  await db
    .insert(activityEvents)
    .values({
      userId: auth.user!.id,
      action: `poke_${status}`,
      entityType: "poke",
      entityId: String(id),
      metadataJson: JSON.stringify({
        senderUsername: poke.senderUsername,
        kind: poke.kind,
        userAction: payload.action,
      }),
    });
  const href =
    poke.kind === "opinion" && poke.targetSlug
      ? `/p/${poke.targetSlug}#comment-body`
      : poke.targetSlug && ["thread", "reminder", "mystery"].includes(poke.kind)
        ? `/p/${poke.targetSlug}`
        : poke.kind === "publish"
          ? "/escrever"
          : poke.kind === "missing"
            ? "/mural"
            : `/u/${poke.senderUsername}`;
  return Response.json({ ok: true, href, senderUsername: poke.senderUsername });
}
