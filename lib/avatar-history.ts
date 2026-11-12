import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { avatarGenerations } from "../db/schema";

export async function recoverAvatarHistory(userId: string, activeImageKey: string | null) {
  if (!env.BUCKET) return;
  const db = getDb();
  const existing = await db
    .select({ imageKey: avatarGenerations.imageKey })
    .from(avatarGenerations)
    .where(eq(avatarGenerations.userId, userId));
  const known = new Set(existing.map((item) => item.imageKey));
  let cursor: string | undefined;
  do {
    const page = await env.BUCKET.list({ prefix: `avatars/${userId}/`, cursor, limit: 1000 });
    for (const object of page.objects) {
      if (known.has(object.key)) continue;
      await db
        .insert(avatarGenerations)
        .values({
          id: crypto.randomUUID(),
          userId,
          imageKey: object.key,
          active: object.key === activeImageKey,
          createdAt: object.uploaded.toISOString().replace("T", " ").replace(".000Z", ""),
        })
        .onConflictDoNothing();
      known.add(object.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
