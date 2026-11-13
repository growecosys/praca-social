import { env } from "../../../../lib/env";
import { requirePracaUser } from "../../../../lib/praca-auth";
import { saveProfileEdit } from "../../../../lib/profile-edit";
export async function POST(request: Request) {
  const auth = await requirePracaUser({ profile: false });
  if (auth.error) return auth.error;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const text = await request.text();
  if (text.length > 4096) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  try {
    const profile = await saveProfileEdit(env.DB, auth.user, JSON.parse(text));
    return Response.json(
      { ok: true, profile, next: auth.user!.profileComplete ? "/perfil" : "/perfil/concluir" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Não foi possível salvar." },
      { status: 400 },
    );
  }
}
