import { env } from "../../../../lib/env";
import { z } from "zod";
import { reviewSignal } from "../../../../lib/common-signal-review";
import {
  signalAnalysis,
  signalSubmission,
  type PublicSignal,
} from "../../../../lib/common-signals";
import { getPracaUser, requirePracaUser } from "../../../../lib/praca-auth";

const pageSize = 12;
const retryAfter = 30_000;
const maxAttempts = 3;
const idSchema = z.string().uuid();

type SignalRow = Omit<PublicSignal, "analysis" | "status" | "canRetry"> & {
  analysis: string | null;
  attempts: number;
  startedAt: number | null;
  mine: number;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const id = query.get("id");
  const page = Number(query.get("page") ?? 1);
  if (
    (id && !idSchema.safeParse(id).success) ||
    !Number.isSafeInteger(page * pageSize) ||
    !Number.isInteger(page) ||
    page < 1
  ) {
    return Response.json({ error: "Endereço de sinal inválido." }, { status: 400 });
  }
  const user = await getPracaUser();
  const { results } = await env.DB.prepare(
    `
    SELECT s.id, s.body, s.page, s.created_at AS "createdAt", s.analysis, s.attempts,
      s.started_at AS "startedAt",
      CASE WHEN s.author_id = ? THEN 1 ELSE 0 END AS mine,
      CASE WHEN s.hide_name = 0 THEN COALESCE(NULLIF(u.display_name, ''), u.username) END AS "authorName"
    FROM common_signals s LEFT JOIN users u ON u.id = s.author_id AND u.deleted_at IS NULL
    WHERE (CAST(? AS text) IS NULL OR s.id = ?)
    ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?
  `,
  )
    .bind(user?.id ?? null, id, id, pageSize + 1, id ? 0 : (page - 1) * pageSize)
    .all<SignalRow>();

  const now = Date.now();
  const signals: PublicSignal[] = results.slice(0, pageSize).map((row: SignalRow) => {
    const analysis = row.analysis
      ? (signalAnalysis.safeParse(JSON.parse(row.analysis)).data ?? null)
      : null;
    const waiting = (row.startedAt ?? row.createdAt) > now - retryAfter;
    return {
      id: row.id,
      body: row.body,
      page: row.page,
      createdAt: row.createdAt,
      authorName: row.authorName,
      analysis,
      status: analysis ? "reviewed" : waiting ? "pending" : "failed",
      canRetry: !analysis && !waiting && row.mine === 1 && row.attempts < maxAttempts,
    };
  });
  return Response.json(
    { signals, hasMore: results.length > pageSize, canSubmit: Boolean(user?.profileComplete) },
    {
      headers: { "cache-control": "no-store" },
    },
  );
}

export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const payload = await request.json().catch(() => null);
  const now = Date.now();
  let id: string;
  if (payload?.retry === true) {
    const retryId = idSchema.safeParse(payload.id);
    if (!retryId.success) return Response.json({ error: "Sinal inválido." }, { status: 400 });
    id = retryId.data;
  } else {
    const parsed = signalSubmission.safeParse(payload);
    if (!parsed.success)
      return Response.json({ error: "Escreva um sinal de 5 a 1.200 caracteres." }, { status: 400 });
    const { body, page, hideName } = parsed.data;
    id = parsed.data.id;
    const saved = await env.DB.prepare(
      `
      INSERT INTO common_signals (id, author_id, body, page, hide_name, created_at)
      SELECT CAST(? AS text), CAST(? AS text), CAST(? AS text), CAST(? AS text), CAST(? AS integer), CAST(? AS bigint)
      WHERE EXISTS (SELECT 1 FROM common_signals WHERE id = ? AND author_id = ?)
        OR (SELECT count(*) FROM common_signals WHERE author_id = ? AND created_at > ?) < 5
      ON CONFLICT(id) DO UPDATE SET id = excluded.id
      WHERE common_signals.author_id = excluded.author_id AND common_signals.body = excluded.body
        AND common_signals.page = excluded.page AND common_signals.hide_name = excluded.hide_name
      RETURNING id
    `,
    )
      .bind(
        id,
        auth.user.id,
        body,
        page,
        Number(hideName),
        now,
        id,
        auth.user.id,
        auth.user.id,
        now - 86_400_000,
      )
      .first();
    if (!saved)
      return Response.json(
        {
          error:
            "Não foi possível publicar. Cada conta pode publicar até cinco sinais em 24 horas.",
        },
        { status: 429 },
      );
  }

  const signal = await env.DB.prepare(
    `
    UPDATE common_signals SET started_at = ?, attempts = attempts + 1
    WHERE id = ? AND author_id = ? AND analysis IS NULL AND attempts < ?
      AND (started_at IS NULL OR started_at <= ?)
    RETURNING body, page
  `,
  )
    .bind(now, id, auth.user.id, maxAttempts, now - retryAfter)
    .first<{ body: string; page: string }>();

  if (signal) {
    try {
      const { results: candidates } = await env.DB.prepare(
        `
        SELECT id, body, page FROM common_signals
        WHERE id <> ? AND analysis IS NOT NULL AND related_id IS NULL AND created_at <= ?
        ORDER BY (page = ?) DESC, created_at DESC, id DESC LIMIT 24
      `,
      )
        .bind(id, now, signal.page)
        .all<{ id: string; body: string; page: string }>();
      const result = await reviewSignal(signal, candidates);
      await env.DB.prepare(
        "UPDATE common_signals SET analysis = ?, related_id = ? WHERE id = ? AND started_at = ?",
      )
        .bind(JSON.stringify(result), result.relatedId, id, now)
        .run();
    } catch {
      console.warn("Signal analysis failed", id);
      await env.DB.prepare(
        "UPDATE common_signals SET started_at = ? WHERE id = ? AND started_at = ?",
      )
        .bind(now - retryAfter + 5000, id, now)
        .run();
    }
  }
  return Response.json({ ok: true, id });
}
