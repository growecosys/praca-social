import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { posts, postViews } from "../../../../../db/schema";
import { getPracaUser } from "../../../../../lib/praca-auth";
import { jsonWithVisitor, visitorFromRequest } from "../../../../../lib/visitor";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const visitor = visitorFromRequest(request);
  const db = getDb();
  const post = (
    await db
      .select()
      .from(posts)
      .where(eq(posts.slug, (await params).slug))
      .limit(1)
  )[0];
  if (!post)
    return jsonWithVisitor({ error: "Publicação não encontrada." }, visitor, { status: 404 });
  const user = await getPracaUser();
  if (user?.id !== post.ownerId) {
    const existing = (
      await db
        .select()
        .from(postViews)
        .where(and(eq(postViews.postId, post.id), eq(postViews.visitorId, visitor.id)))
        .limit(1)
    )[0];
    if (existing)
      await db
        .update(postViews)
        .set({
          views: sql`${postViews.views} + 1`,
          lastSeenAt: sql`CURRENT_TIMESTAMP`,
          userId: user?.id || existing.userId,
        })
        .where(eq(postViews.id, existing.id));
    else
      await db
        .insert(postViews)
        .values({ postId: post.id, visitorId: visitor.id, userId: user?.id });
  }
  const rows = await db.select().from(postViews).where(eq(postViews.postId, post.id));
  return jsonWithVisitor(
    { uniqueViews: rows.length, totalViews: rows.reduce((sum, item) => sum + item.views, 0) },
    visitor,
  );
}
