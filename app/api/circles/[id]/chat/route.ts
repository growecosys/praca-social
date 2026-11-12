import { env } from "../../../../../lib/env";
import { getPracaUser } from "../../../../../lib/praca-auth";
import {
  ChatError,
  readCircleChat,
  sendCircleMessage,
  markCircleChatRead,
} from "../../../../../lib/circle-chat";
const headers = { "cache-control": "private, no-store", vary: "Cookie" };
function fail(error: unknown) {
  if (error instanceof ChatError)
    return Response.json({ error: error.message }, { status: error.status, headers });
  console.error("Circle chat request failed");
  return Response.json(
    { error: "Não foi possível acessar a conversa. Tente novamente." },
    { status: 500, headers },
  );
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPracaUser();
  if (!user)
    return Response.json({ error: "Entre para acessar a conversa." }, { status: 401, headers });
  try {
    const id = Number((await params).id),
      q = new URL(request.url).searchParams;
    const cursor = (name: string) => (q.has(name) ? Number(q.get(name)) : undefined);
    return Response.json(
      await readCircleChat(env.DB, id, user.id, {
        before: cursor("before"),
        after: cursor("after"),
      }),
      { headers },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403, headers });
  const user = await getPracaUser();
  if (!user)
    return Response.json({ error: "Entre para participar da conversa." }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw new ChatError("Mensagem muito grande.", 413);
    let p: any;
    try {
      p = JSON.parse(raw);
    } catch {
      throw new ChatError("Mensagem inválida.");
    }
    const id = Number((await params).id);
    if (p?.action === "read") {
      await markCircleChatRead(env.DB, id, user.id, p.lastSeen);
      return Response.json({ ok: true }, { headers });
    }
    const result = await sendCircleMessage(env.DB, id, user.id, p);
    return Response.json(result, { status: result.replayed ? 200 : 201, headers });
  } catch (e) {
    return fail(e);
  }
}
