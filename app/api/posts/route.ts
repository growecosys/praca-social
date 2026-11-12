import { inlinePlainText } from "../../../lib/inline-text";
import { env } from "cloudflare:workers";
import { normalizePostBlocks, mentionStatements } from "../../../lib/post-mentions";
import { and, eq, sql } from "drizzle-orm";
import { requirePracaUser } from "../../../lib/praca-auth";
import { getDb } from "../../../db";
import { pokes, posts } from "../../../db/schema";

function baseSlug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "texto"
  );
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Origem inválida." }, { status: 403 });
    const auth = await requirePracaUser();
    if (auth.error) return auth.error;
    const user = auth.user!;
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
    const db = getDb();
    const stem = baseSlug(title);
    let slug = stem;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.slug, slug))
        .limit(1);
      if (!exists.length) break;
      slug = `${stem}-${crypto.randomUUID().slice(0, 6)}`;
    }
    const author = `${user.displayName} · ${user.roleTitle}`.slice(0, 100);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO posts(slug,title,author,content,content_json,owner_id) VALUES (?,?,?,?,?,?)",
      ).bind(slug, title, author, content, JSON.stringify(blocks), user.id),
      env.DB.prepare(
        "INSERT INTO post_revisions(post_id,version,title,author,content,content_json,editor_id) SELECT id,1,title,author,content,content_json,? FROM posts WHERE slug=?",
      ).bind(user.id, slug),
      env.DB.prepare(
        "INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json) SELECT ?,'post_created','post',CAST(id AS TEXT),? FROM posts WHERE slug=?",
      ).bind(user.id, JSON.stringify({ slug, title }), slug),
      ...mentionStatements(env.DB, blocks, user, slug, title),
    ]);
    await db
      .update(pokes)
      .set({ status: "completed", resolvedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(pokes.recipientId, user.id),
          eq(pokes.kind, "publish"),
          eq(pokes.status, "accepted"),
        ),
      );
    return Response.json({ slug }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada.";
    return Response.json({ error: message }, { status: 500 });
  }
}
