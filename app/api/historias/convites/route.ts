import { env } from "../../../../lib/env";
import { requirePracaUser } from "../../../../lib/praca-auth";
import { tickStories } from "../../../../lib/stories-store";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  const { user, error } = await requirePracaUser();
  if (error) return error;

  const raw = await request.text();
  if (raw.length > 500) return fail("Convite inválido.");
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail("Convite inválido.");
  }
  const username =
    typeof input?.username === "string" ? input.username.trim().replace(/^@/, "") : "";
  if (!username || username.length > 60) return fail("Informe o @ da pessoa.");

  const { state } = await tickStories(env.DB);
  if (state.phase !== "enrollment" || state.id !== input.campaign)
    return fail("As inscrições desta turma foram encerradas.", 409);

  const recipient = await env.DB.prepare(
    `
    SELECT id FROM users
    WHERE lower(username) = lower(?) AND deleted_at IS NULL AND profile_complete = 1
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks
      WHERE (user_id = ? AND blocked_id = users.id) OR (user_id = users.id AND blocked_id = ?)
    )
  `,
  )
    .bind(username, user.id, user.id)
    .first<{ id: string }>();
  if (!recipient || recipient.id === user.id)
    return fail("Essa pessoa não está disponível para receber o convite.", 404);
  if (
    state.members.some((m) => m.id === recipient.id && !m.left) ||
    state.waiting.some((m) => m.id === recipient.id)
  )
    return fail("Essa pessoa já se inscreveu ou está na lista de espera.", 409);

  const type = "story_invite";
  const key = `story-invite:${state.id}:${user.id}:${recipient.id}`;
  const saved = await env.DB.prepare(
    `
    INSERT INTO notifications (recipient_id, actor_id, type, title, body, href, dedupe_key)
    SELECT ?, ?, ?, 'Convite para Histórias da Praça', ?,
      '/jogar/historias?campanha=' || ?, ?
    WHERE EXISTS (SELECT 1 FROM story_campaigns WHERE id = ? AND active = 1
      AND (state_json::jsonb ->> 'phase') = 'enrollment'
      AND (state_json::jsonb ->> 'enrollEnd')::numeric > ?)
    AND (SELECT COUNT(*) FROM notifications WHERE actor_id = ? AND type = ?
      AND created_at >= to_char(timezone('utc', now()) - interval '1 day', 'YYYY-MM-DD HH24:MI:SS')) < 8
    ON CONFLICT DO NOTHING RETURNING id
  `,
  )
    .bind(
      recipient.id,
      user.id,
      type,
      user.displayName + " convidou você para a campanha A feira vai acontecer?",
      state.id,
      key,
      state.id,
      Date.now(),
      user.id,
      type,
    )
    .first();

  if (saved) return Response.json({ message: "Convite enviado pelo sino da Praça." });
  if (await env.DB.prepare("SELECT 1 FROM notifications WHERE dedupe_key = ?").bind(key).first())
    return Response.json({ message: "Essa pessoa já recebeu seu convite para esta turma." });
  return fail(
    "O limite de oito convites em 24 horas foi atingido ou as inscrições terminaram.",
    409,
  );
}
