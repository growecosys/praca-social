import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { notifications, pokes, posts, users } from "../../../db/schema";
import { getPracaUser, requirePracaUser } from "../../../lib/praca-auth";

export async function GET() {
  const user = await getPracaUser();
  if (!user) return Response.json({ poke: null });
  const row = (await getDb().select({ id: pokes.id, kind: pokes.kind, senderName: users.displayName, senderUsername: users.username, targetSlug: posts.slug, targetTitle: posts.title })
    .from(pokes).innerJoin(users, eq(pokes.senderId, users.id)).leftJoin(posts, eq(pokes.targetPostId, posts.id))
    .where(and(eq(pokes.recipientId, user.id), eq(pokes.kind, "mystery"), inArray(pokes.status, ["pending", "seen"]), gt(pokes.expiresAt, sql`CURRENT_TIMESTAMP`)))
    .orderBy(asc(pokes.createdAt)).limit(1))[0];
  return Response.json({ poke: row || null }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const payload = await request.json().catch(() => ({})) as { id?: number; action?: string };
  const db = getDb();
  if (payload.action === "archive_all") {
    await db.update(pokes).set({ status: "archived", resolvedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(pokes.recipientId, auth.user!.id), inArray(pokes.status, ["pending", "seen"])));
    await db.update(notifications).set({ readAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(notifications.recipientId, auth.user!.id), eq(notifications.type, "connection")));
    return Response.json({ ok: true });
  }
  if (!payload.id) return Response.json({ error: "Cutucada inválida." }, { status: 400 });
  const now = sql`CURRENT_TIMESTAMP`;
  await db.update(pokes).set({ status: "archived", seenAt: now, resolvedAt: now }).where(and(eq(pokes.id, payload.id), eq(pokes.recipientId, auth.user!.id)));
  return Response.json({ ok: true });
}
