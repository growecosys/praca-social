import { env } from "cloudflare:workers";
import { getPracaUser } from "../../../../../lib/praca-auth";
import { CircleError, readCircleWork, mutateCircleWork } from "../../../../../lib/circle-work";
const headers = { "cache-control": "private, no-store", vary: "Cookie" };
function fail(e: unknown) {
  return Response.json(
    { error: e instanceof CircleError ? e.message : "Não foi possível salvar o registro." },
    { status: e instanceof CircleError ? e.status : 500, headers },
  );
}
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPracaUser();
  if (!user) return Response.json({ error: "Entre para acessar." }, { status: 401, headers });
  try {
    const data = await readCircleWork(env.DB, Number((await params).id), user.id);
    if (new URL(request.url).searchParams.has("export"))
      return Response.json(
        { schema: 1, exportedAt: new Date().toISOString(), ...data },
        {
          headers: {
            ...headers,
            "content-disposition": 'attachment; filename="acordos-circulo.json"',
          },
        },
      );
    return Response.json(data, { headers });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403, headers });
  const user = await getPracaUser();
  if (!user) return Response.json({ error: "Entre para acessar." }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 30000) throw new CircleError("Registro muito grande.");
    let p;
    try {
      p = JSON.parse(raw);
    } catch {
      throw new CircleError("Dados inválidos.");
    }
    return Response.json(await mutateCircleWork(env.DB, Number((await params).id), user.id, p), {
      headers,
    });
  } catch (e) {
    return fail(e);
  }
}
