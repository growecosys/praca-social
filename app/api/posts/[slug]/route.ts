import { inlinePlainText } from "../../../../lib/inline-text";
import { env } from "cloudflare:workers";
import { normalizePostBlocks, mentionStatements } from "../../../../lib/post-mentions";
import { and, desc, eq, sql } from "drizzle-orm";
import { requirePracaUser } from "../../../../lib/praca-auth";
import { getDb } from "../../../../db";
import { postRevisions, posts } from "../../../../db/schema";

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const slug = (await params).slug;
  const db = getDb();
  const post = (
    await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), eq(posts.ownerId, user.id)))
      .limit(1)
  )[0];
  if (!post)
    return Response.json({ error: "Publicação não encontrada ou sem permissão." }, { status: 404 });
  const raw = await request.text();
  if (raw.length > 1500000)
    return Response.json({ error: "Publicação muito grande." }, { status: 413 });
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Conteúdo inválido." }, { status: 400 });
  }
  const title = typeof payload?.title === "string" ? payload.title.trim().slice(0, 180) : "";
  let blocks;
  try {
    if (!title) throw Error("Adicione um título.");
    blocks = normalizePostBlocks(payload.blocks);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Conteúdo inválido." },
      { status: 400 },
    );
  }
  const content = blocks
    .map(
      (block) =>
        (block.inlineFormat === "markdown" ? inlinePlainText(block.text || "") : block.text) ||
        block.caption ||
        block.url ||
        "",
    )
    .join("\n\n")
    .slice(0, 100000);
  const latest = (
    await db
      .select({ version: postRevisions.version })
      .from(postRevisions)
      .where(eq(postRevisions.postId, post.id))
      .orderBy(desc(postRevisions.version))
      .limit(1)
  )[0];
  const nextVersion = (latest?.version || 1) + 1;
  try {
    await env.DB.batch([
      ...(!latest
        ? [
            env.DB.prepare(
              "INSERT INTO post_revisions(post_id,version,title,author,content,content_json,editor_id) VALUES (?,1,?,?,?,?,?)",
            ).bind(post.id, post.title, post.author, post.content, post.contentJson, post.ownerId),
          ]
        : []),
      env.DB.prepare(
        "INSERT INTO post_revisions(post_id,version,title,author,content,content_json,editor_id) VALUES (?,?,?,?,?,?,?)",
      ).bind(post.id, nextVersion, title, post.author, content, JSON.stringify(blocks), user.id),
      env.DB.prepare(
        "UPDATE posts SET title=?,content=?,content_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(title, content, JSON.stringify(blocks), post.id),
      env.DB.prepare(
        "INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json) VALUES (?,'post_edited','post',?,?)",
      ).bind(user.id, String(post.id), JSON.stringify({ slug, version: nextVersion })),
      ...mentionStatements(env.DB, blocks, user, slug, title),
    ]);
  } catch {
    return Response.json(
      { error: "Não foi possível salvar esta versão. Atualize a página e tente novamente." },
      { status: 409 },
    );
  }
  return Response.json({ slug, version: nextVersion });
}
