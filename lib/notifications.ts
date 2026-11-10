import { getDb } from "../db";
import { notifications } from "../db/schema";

export async function notify(input: { recipientId: string; actorId?: string | null; type: string; title: string; body?: string; href: string; dedupeKey?: string }) {
  await getDb().insert(notifications).values({ recipientId: input.recipientId, actorId: input.actorId || null, type: input.type, title: input.title.slice(0, 140), body: (input.body || "").slice(0, 240), href: input.href.slice(0, 240), dedupeKey: input.dedupeKey }).onConflictDoNothing();
}
