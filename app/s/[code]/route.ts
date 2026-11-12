import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { posts, shareLinks, shareVisits } from "../../../db/schema";
import { visitorFromRequest } from "../../../lib/visitor";
import { getPracaUser } from "../../../lib/praca-auth";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const db = getDb();
  const visitor = visitorFromRequest(request);
  const user = await getPracaUser();
  const share = (
    await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.code, (await params).code))
      .limit(1)
  )[0];
  if (!share) return Response.redirect(new URL("/", request.url), 302);
  const post = (await db.select().from(posts).where(eq(posts.id, share.postId)).limit(1))[0];
  if (!post) return Response.redirect(new URL("/", request.url), 302);
  await db
    .update(shareLinks)
    .set({ clicks: sql`${shareLinks.clicks} + 1` })
    .where(eq(shareLinks.id, share.id));
  const existing = (
    await db.select().from(shareVisits).where(eq(shareVisits.shareLinkId, share.id))
  ).find((item) => item.visitorId === visitor.id);
  if (existing)
    await db
      .update(shareVisits)
      .set({
        visits: sql`${shareVisits.visits} + 1`,
        lastSeenAt: sql`CURRENT_TIMESTAMP`,
        userId: user?.id || existing.userId,
      })
      .where(eq(shareVisits.id, existing.id));
  else
    await db
      .insert(shareVisits)
      .values({ shareLinkId: share.id, visitorId: visitor.id, userId: user?.id });
  const headers = new Headers({
    location: new URL(`/p/${post.slug}?ref=${share.code}`, request.url).toString(),
    "cache-control": "no-store",
  });
  if (visitor.setCookie) headers.append("set-cookie", visitor.setCookie);
  headers.append(
    "set-cookie",
    `praca_ref=${share.code}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`,
  );
  return new Response(null, { status: 302, headers });
}
