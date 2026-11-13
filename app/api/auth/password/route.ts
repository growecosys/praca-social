import { env } from "../../../../lib/env";
import { getPracaUser, hashSecret, verifySecret, createSession } from "../../../../lib/praca-auth";
import { takeEmailLimit } from "../../../../lib/email-access";
import { changePassword } from "../../../../lib/change-password";
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ error: "Origem inválida." }, 403);
  const user = await getPracaUser();
  if (!user) return reply({ error: "Entre para alterar sua senha." }, 401);
  if (!(await takeEmailLimit(env.DB, "password-change:" + user.id, 5)))
    return reply({ error: "Muitas tentativas. Aguarde 15 minutos." }, 429);
  const raw = await request.text();
  if (raw.length > 4096) return reply({ error: "Dados inválidos." }, 400);
  let p;
  try {
    p = JSON.parse(raw);
  } catch {
    return reply({ error: "Dados inválidos." }, 400);
  }
  try {
    await changePassword(env.DB, user.id, p, verifySecret, hashSecret);
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : "Não foi possível alterar." }, 400);
  }
  try {
    await createSession(user.id);
  } catch {
    return reply({
      ok: true,
      reauthenticate: true,
      message: "Senha alterada. Entre novamente com a nova senha.",
    });
  }
  return reply({
    ok: true,
    message: "Senha alterada. As outras sessões e os links de acesso anteriores foram encerrados.",
  });
}
