import { env } from "cloudflare:workers";
import { storyRow } from "../../../../lib/stories-store";
export async function GET(request: Request) {
  const url = new URL(request.url),
    campaign = url.searchParams.get("campanha"),
    id = url.searchParams.get("usuario");
  if (!campaign || !id) return new Response("", { status: 404 });
  const row = await storyRow(env.DB, campaign);
  const m = row?.state.members.find((m) => m.id === id && !m.left);
  if (
    !m ||
    !(await env.DB.prepare("SELECT id FROM users WHERE id=? AND deleted_at IS NULL")
      .bind(id)
      .first())
  )
    return new Response("", { status: 404 });
  if (m.avatar) {
    const object = await env.BUCKET.get(m.avatar);
    if (object)
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || "image/png",
          "cache-control": "public, max-age=3600",
        },
      });
  }
  return Response.redirect(new URL("/avatar/" + encodeURIComponent(id), url), 302);
}
