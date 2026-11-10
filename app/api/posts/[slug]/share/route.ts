import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { activityEvents, posts, shareLinks } from "../../../../../db/schema";
import { jsonWithVisitor, visitorFromRequest } from "../../../../../lib/visitor";
import { getPracaUser } from "../../../../../lib/praca-auth";
import { notify } from "../../../../../lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const visitor = visitorFromRequest(request);
  const user = await getPracaUser();
  const db = getDb();
  const post = (await db.select().from(posts).where(eq(posts.slug, (await params).slug)).limit(1))[0];
  if (!post) return jsonWithVisitor({ error: "Publicação não encontrada." }, visitor, { status: 404 });
  let share = user
    ? (await db.select().from(shareLinks).where(and(eq(shareLinks.postId, post.id), eq(shareLinks.userId, user.id))).limit(1))[0]
    : (await db.select().from(shareLinks).where(and(eq(shareLinks.postId, post.id), eq(shareLinks.visitorId, visitor.id), isNull(shareLinks.userId))).limit(1))[0];
  if (!share && user) {
    const anonymous = (await db.select().from(shareLinks).where(and(eq(shareLinks.postId, post.id), eq(shareLinks.visitorId, visitor.id), isNull(shareLinks.userId))).limit(1))[0];
    if (anonymous) {
      await db.update(shareLinks).set({ userId: user.id }).where(eq(shareLinks.id, anonymous.id));
      share = { ...anonymous, userId: user.id };
    }
  }
  if (!share) {
    const code = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
    await db.insert(shareLinks).values({ postId: post.id, code, visitorId: visitor.id, userId: user?.id });
    if(user) await db.insert(activityEvents).values({userId:user.id,action:"share_created",entityType:"post",entityId:String(post.id)});
    share = (await db.select().from(shareLinks).where(eq(shareLinks.code, code)).limit(1))[0];
    if (post.ownerId && post.ownerId !== user?.id) await notify({ recipientId: post.ownerId, actorId: user?.id, type: "share", title: user ? `🔗 ${user.displayName} criou um link para sua publicação` : "🔗 Sua publicação ganhou um novo link", body: post.title, href: `/p/${post.slug}`, dedupeKey: `share:${share.id}` });
  }
  const origin = new URL(request.url).origin;
  return jsonWithVisitor({ url: `${origin}/s/${share.code}`, shares: (await db.select().from(shareLinks).where(eq(shareLinks.postId, post.id))).length }, visitor, { status: 201 });
}
