import { env } from "cloudflare:workers";
import { getPracaUser } from "../../../lib/praca-auth";
import { GameError } from "../../../lib/after-hours";
import { readGame, mutateGame } from "../../../lib/after-hours-store";
const headers = { "cache-control": "private, no-store", vary: "Cookie" };
function fail(e: unknown) {
  if (!(e instanceof GameError)) console.error("After Hours request failed");
  return Response.json(
    {
      error: e instanceof GameError ? e.message : "Não foi possível abrir o jogo. Tente novamente.",
    },
    { status: e instanceof GameError ? e.status : 500, headers },
  );
}
export async function GET() {
  const u = await getPracaUser();
  if (!u)
    return Response.json(
      { error: "Entre na Praça para salvar sua aventura." },
      { status: 401, headers },
    );
  try {
    return Response.json(await readGame(env.DB, u.id), { headers });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403, headers });
  const u = await getPracaUser();
  if (!u) return Response.json({ error: "Entre para jogar." }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 6000) throw new GameError("Ação muito grande.", 413);
    let p;
    try {
      p = JSON.parse(raw);
    } catch {
      throw new GameError("Dados inválidos.");
    }
    return Response.json(await mutateGame(env.DB, u.id, p), { headers });
  } catch (e) {
    return fail(e);
  }
}
