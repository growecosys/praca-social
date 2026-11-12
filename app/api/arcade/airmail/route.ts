import { env } from "cloudflare:workers";
import { getPracaUser } from "../../../../lib/praca-auth";
import { gameProfile, startFlight, finishFlight } from "../../../../lib/arcade-store";
import { FlightError } from "../../../../lib/airmail";
const headers = { "cache-control": "private, no-store", vary: "Cookie" };
export async function GET() {
  const u = await getPracaUser();
  if (!u) return Response.json({ profile: null }, { headers });
  return Response.json({ profile: await gameProfile(env.DB, u.id) }, { headers });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403, headers });
  const u = await getPracaUser();
  if (!u)
    return Response.json(
      { error: "Entre para registrar os pontos no perfil." },
      { status: 401, headers },
    );
  try {
    const raw = await request.text();
    if (raw.length > 55000) throw new FlightError("Partida muito grande.", 413);
    let p;
    try {
      p = JSON.parse(raw);
    } catch {
      throw new FlightError("Dados inválidos.");
    }
    if (p?.action === "start")
      return Response.json(await startFlight(env.DB, u.id, p.id), { headers });
    if (p?.action === "finish")
      return Response.json(await finishFlight(env.DB, u.id, p), { headers });
    throw new FlightError("Ação inválida.");
  } catch (e) {
    if (!(e instanceof FlightError)) console.error("Arcade flight request failed");
    return Response.json(
      {
        error:
          e instanceof FlightError
            ? e.message
            : "Não foi possível registrar o voo. Tente novamente.",
      },
      { status: e instanceof FlightError ? e.status : 500, headers },
    );
  }
}
