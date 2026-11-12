import { env } from "cloudflare:workers";
import { createSession, clearSession, verifySecret } from "../../../../lib/praca-auth";
import { findPasswordAccount } from "../../../../lib/password-access";
import { takeEmailLimit } from "../../../../lib/email-access";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2048) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  let p: any;
  try {
    p = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await takeEmailLimit(env.DB, "password-ip:" + ip, 30)))
    return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const user = await findPasswordAccount(env.DB, p?.identifier || p?.username),
    secret = typeof p?.secret === "string" ? p.secret : "";
  const valid = await verifySecret(
    secret.length <= 1024 ? secret : "",
    user?.secret_salt || "password-dummy-salt",
    user?.secret_hash || "0".repeat(64),
  );
  if (!user || !valid)
    return Response.json(
      {
        error:
          "Usuário/e-mail ou senha incorretos. Para usar e-mail, confirme o endereço primeiro.",
      },
      { status: 401 },
    );
  await clearSession();
  await createSession(user.id);
  await env.DB.prepare(
    "INSERT INTO activity_events(user_id,action,entity_type,entity_id) VALUES (?,'signed_in','user',?)",
  )
    .bind(user.id, user.id)
    .run();
  return Response.json(
    { ok: true, next: user.profile_complete ? "/mural" : "/perfil/concluir" },
    { headers: { "cache-control": "no-store" } },
  );
}
