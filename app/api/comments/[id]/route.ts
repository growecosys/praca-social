import { eq } from "drizzle-orm";
import { getPracaUser } from "../../../../lib/praca-auth";
import { getDb } from "../../../../db";
import { comments, posts } from "../../../../db/schema";
import { jsonWithVisitor, visitorFromRequest } from "../../../../lib/visitor";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const visitor = visitorFromRequest(request);
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return jsonWithVisitor({ error: "Comentário inválido." }, visitor, { status: 400 });
  const db = getDb();
  const comment = (await db.select().from(comments).where(eq(comments.id, id)).limit(1))[0];
  if (!comment) return jsonWithVisitor({ error: "Comentário não encontrado." }, visitor, { status: 404 });
  const post = (await db.select().from(posts).where(eq(posts.id, comment.postId)).limit(1))[0];
  const user = await getPracaUser();
  const allowed = comment.visitorId === visitor.id || Boolean(user && post && user.id === post.ownerId);
  if (!allowed) return jsonWithVisitor({ error: "Você não pode apagar este comentário." }, visitor, { status: 403 });
  await db.delete(comments).where(eq(comments.id, id));
  return jsonWithVisitor({ ok: true }, visitor);
}
