import { env } from "cloudflare:workers";
import {
  governanceCancellation,
  governanceSubmission,
  type GovernanceProposal,
} from "../../../../lib/common-governance";
import { getPracaUser, requirePracaUser } from "../../../../lib/praca-auth";

const pageSize = 12;

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(page * pageSize)) {
    return Response.json({ error: "Página inválida." }, { status: 400 });
  }

  const user = await getPracaUser();
  const { results } = await env.DB.prepare(
    `
      SELECT p.id, p.kind, p.title, p.scope, p.change, p.impact, p.rules, p.cancelled_at AS cancelledAt,
        CASE WHEN p.author_id = ? AND p.cancelled_at IS NULL THEN 1 ELSE 0 END AS canCancel,
        strftime('%Y-%m-%dT%H:%M:%SZ', p.created_at) AS createdAt,
        u.username, u.display_name AS displayName
      FROM common_governance_proposals p
      LEFT JOIN users u ON u.id = p.author_id AND u.deleted_at IS NULL
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `,
  )
    .bind(user?.id ?? null, pageSize + 1, (page - 1) * pageSize)
    .all<Omit<GovernanceProposal, "canCancel"> & { canCancel: number }>();

  return Response.json(
    {
      canSubmit: user?.profileComplete === true,
      proposals: results
        .slice(0, pageSize)
        .map((row) => ({ ...row, canCancel: row.canCancel === 1 })),
      hasMore: results.length > pageSize,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;

  const parsed = governanceSubmission.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues.find(
      (entry) => entry.code === "too_small" || entry.code === "too_big",
    );
    return Response.json(
      { error: issue?.message ?? "Confira os campos da proposta." },
      { status: 400 },
    );
  }

  const { id, kind, title, scope, change, impact, rules } = parsed.data;
  const saved = await env.DB.prepare(
    `
    INSERT INTO common_governance_proposals (id, author_id, kind, title, scope, change, impact, rules)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET id = excluded.id
    WHERE author_id = excluded.author_id AND kind = excluded.kind AND title = excluded.title
      AND scope = excluded.scope AND change = excluded.change AND impact = excluded.impact AND rules IS excluded.rules
    RETURNING id
  `,
  )
    .bind(id, auth.user.id, kind, title, scope, change, impact, rules || null)
    .first<{ id: string }>();

  if (!saved) {
    return Response.json(
      { error: "Este envio já foi usado. Revise a proposta e tente de novo." },
      { status: 409 },
    );
  }

  return Response.json({ ok: true, id: saved.id });
}

export async function DELETE(request: Request) {
  const auth = await requirePracaUser({ profile: false });
  if (auth.error) return auth.error;

  const parsed = governanceCancellation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pedido inválido." }, { status: 400 });

  const result = await env.DB.prepare(
    `
    UPDATE common_governance_proposals
    SET cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP)
    WHERE id = ? AND author_id = ?
    RETURNING id
  `,
  )
    .bind(parsed.data.id, auth.user.id)
    .first<{ id: string }>();

  if (!result)
    return Response.json({ error: "Pedido indisponível para retirada." }, { status: 404 });
  return Response.json({ ok: true, id: result.id });
}
