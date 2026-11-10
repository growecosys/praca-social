import { and, desc, eq, sql } from "drizzle-orm";
import { getPracaUser } from "../../../../../lib/praca-auth";
import { getDb } from "../../../../../db";
import { activityEvents, comments, likes, pokes, posts, users } from "../../../../../db/schema";
import { jsonWithVisitor, visitorFromRequest } from "../../../../../lib/visitor";
import { notify } from "../../../../../lib/notifications";

async function findPost(slug: string) {
  return (await getDb().select().from(posts).where(eq(posts.slug, slug)).limit(1))[0] || null;
}

async function state(postId: number, visitorId: string, canModerate = false) {
  const db = getDb();
  const [postLikes, postComments, people] = await Promise.all([
    db.select().from(likes).where(eq(likes.postId, postId)),
    db.select().from(comments).where(eq(comments.postId, postId)).orderBy(desc(comments.createdAt)).limit(100),
    db.select({ id: users.id, username: users.username, imageGenerationsUsed: users.imageGenerationsUsed }).from(users),
  ]);
  const personById = new Map(people.map((person) => [person.id, person]));
  return {
    likes: postLikes.length,
    liked: postLikes.some((like) => like.visitorId === visitorId),
    comments: postComments.map((comment) => {
      const person = comment.userId && !comment.anonymous ? personById.get(comment.userId) : null;
      return {
      id: comment.id,
      name: comment.anonymous ? "Anônimo" : comment.displayName,
      body: comment.body,
      createdAt: comment.createdAt,
      mine: comment.visitorId === visitorId,
      deletable: comment.visitorId === visitorId || canModerate,
      username: person?.username || null,
      avatar: person ? `/avatar/${person.id}?v=${person.imageGenerationsUsed}` : null,
    };}),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const visitor = visitorFromRequest(request);
  const post = await findPost((await params).slug);
  if (!post) return jsonWithVisitor({ error: "Publicação não encontrada." }, visitor, { status: 404 });
  const user = await getPracaUser();
  return jsonWithVisitor(await state(post.id, visitor.id, Boolean(user && user.id === post.ownerId)), visitor);
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const visitor = visitorFromRequest(request);
  const post = await findPost((await params).slug);
  if (!post) return jsonWithVisitor({ error: "Publicação não encontrada." }, visitor, { status: 404 });
  const payload = await request.json() as { action?: string; name?: string; body?: string; anonymous?: boolean };
  const db = getDb();
  const user = await getPracaUser();
  const canModerate = Boolean(user && user.id === post.ownerId);

  if (payload.action === "toggle_like") {
    const existing = await db.select().from(likes).where(and(eq(likes.postId, post.id), eq(likes.visitorId, visitor.id))).limit(1);
    if (existing.length) await db.delete(likes).where(eq(likes.id, existing[0].id));
    else { await db.insert(likes).values({ postId: post.id, visitorId: visitor.id, userId: user?.id }); if(user) await db.insert(activityEvents).values({userId:user.id,action:"like_added",entityType:"post",entityId:String(post.id)}); if (post.ownerId && post.ownerId !== user?.id) await notify({ recipientId: post.ownerId, actorId: user?.id, type: "like", title: user ? `❤️ ${user.displayName} curtiu sua publicação` : "❤️ Alguém curtiu sua publicação", body: post.title, href: `/p/${post.slug}`, dedupeKey: `like:${post.id}:${visitor.id}` }); }
    return jsonWithVisitor(await state(post.id, visitor.id, canModerate), visitor);
  }

  if (payload.action === "comment") {
    const body = payload.body?.replace(/\s+/g, " ").trim().slice(0, 800) || "";
    const anonymous = Boolean(payload.anonymous);
    const name = anonymous ? "Anônimo" : user?.displayName || payload.name?.replace(/\s+/g, " ").trim().slice(0, 40) || "Anônimo";
    if (body.length < 2) return jsonWithVisitor({ error: "Escreva pelo menos dois caracteres." }, visitor, { status: 400 });
    const created = await db.insert(comments).values({ postId: post.id, visitorId: visitor.id, userId: user?.id, displayName: name, anonymous, body }).returning({ id: comments.id });
    if(user) await db.insert(activityEvents).values({userId:user.id,action:"comment_created",entityType:"post",entityId:String(post.id)});
    if (user) await db.update(pokes).set({ status: "completed", resolvedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(pokes.recipientId, user.id), eq(pokes.targetPostId, post.id), eq(pokes.kind, "opinion"), eq(pokes.status, "accepted")));
    if (post.ownerId && post.ownerId !== user?.id) await notify({ recipientId: post.ownerId, actorId: anonymous ? undefined : user?.id, type: "comment", title: `💬 ${name} comentou na sua publicação`, body, href: `/p/${post.slug}#comentarios`, dedupeKey: `comment:${created[0]?.id}` });
    return jsonWithVisitor(await state(post.id, visitor.id, canModerate), visitor, { status: 201 });
  }

  return jsonWithVisitor({ error: "Ação inválida." }, visitor, { status: 400 });
}
