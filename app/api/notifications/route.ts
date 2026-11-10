import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { notifications } from "../../../db/schema";
import { requirePracaUser } from "../../../lib/praca-auth";

export async function GET() {
  const auth = await requirePracaUser(); if (auth.error) return auth.error;
  const user = auth.user!; const db = getDb();
  const [items, unread] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.recipientId, user.id)).orderBy(desc(notifications.createdAt)).limit(30),
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.recipientId, user.id), isNull(notifications.readAt))),
  ]);
  return Response.json({ unread: unread[0]?.value || 0, items: items.map((item) => ({ id: item.id, type: item.type, title: item.title, body: item.body, href: item.href, read: Boolean(item.readAt), createdAt: item.createdAt })) });
}

export async function POST(request: Request) {
  const auth = await requirePracaUser(); if (auth.error) return auth.error;
  const user = auth.user!; const payload = await request.json() as { id?: number; action?: string }; const db = getDb();
  if (payload.action === "read_all") await db.update(notifications).set({ readAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(notifications.recipientId, user.id), isNull(notifications.readAt)));
  else if (Number.isInteger(payload.id)) await db.update(notifications).set({ readAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(notifications.id, Number(payload.id)), eq(notifications.recipientId, user.id), isNull(notifications.readAt)));
  else return Response.json({ error: "Ação inválida." }, { status: 400 });
  return Response.json({ ok: true });
}
