import { env } from "../../../../lib/env";
import { cookies } from "next/headers";
import { getPracaUser } from "../../../../lib/praca-auth";
import { deleteAccount } from "../../../../lib/delete-account";
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ error: "Origem inválida." }, 403);
  const user = await getPracaUser();
  if (!user) return reply({ error: "Entre novamente para excluir sua conta." }, 401);
  const raw = await request.text();
  if (raw.length > 256) return reply({ error: "Pedido inválido." }, 400);
  let p: any;
  try {
    p = JSON.parse(raw);
  } catch {
    return reply({ error: "Pedido inválido." }, 400);
  }
  if (p?.confirmation !== "DELETAR CONTA")
    return reply({ error: "Escreva DELETAR CONTA para confirmar." }, 400);
  try {
    await deleteAccount(env.DB, user.id, p.confirmation);
  } catch {
    return reply({ error: "Não foi possível excluir a conta. Tente novamente." }, 500);
  }
  const jar = await cookies();
  for (const name of ["praca_session", "praca_email_request"])
    jar.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return reply({ ok: true, next: "/conta-excluida" });
}
