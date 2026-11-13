// One-off data operation for imported production data (the old Worker ran this on every request).
// Reciprocal "mystery" pokes among the first 45 records become connections; their pokes are
// archived and the related notifications marked read. Idempotent and bounded to ids <= 45.
//
//   node scripts/recover-legacy-connections.mjs          dry run (rolled back, prints counts)
//   node scripts/recover-legacy-connections.mjs --apply  commit
import pg from "pg";

const NOW = "to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS')";

const pairs = `
  SELECT LEAST(p.sender_id, p.recipient_id) AS a, GREATEST(p.sender_id, p.recipient_id) AS b,
    MIN(GREATEST(p.created_at, q.created_at)) AS established
  FROM pokes p JOIN pokes q ON q.sender_id = p.recipient_id AND q.recipient_id = p.sender_id
  WHERE p.id <= 45 AND q.id <= 45 AND p.sender_id <> p.recipient_id
    AND p.kind = 'mystery' AND q.kind = 'mystery'
    AND p.status NOT IN ('declined', 'cancelled') AND q.status NOT IN ('declined', 'cancelled')
  GROUP BY 1, 2`;

export const legacyRecoveryStatements = [
  `INSERT INTO activity_events (user_id, action, entity_type, entity_id, metadata_json)
   SELECT pairs.a, 'legacy_connection_recovered', 'user', pairs.b,
     '{"source":"reciprocal_pokes","throughId":45}'
   FROM (${pairs}) pairs
   WHERE NOT EXISTS (SELECT 1 FROM connections c WHERE c.user_a = pairs.a AND c.user_b = pairs.b)`,
  `INSERT INTO connections (user_a, user_b, created_at)
   SELECT a, b, established FROM (${pairs}) pairs
   ON CONFLICT DO NOTHING`,
  `UPDATE pokes SET status = 'archived', resolved_at = COALESCE(resolved_at, ${NOW})
   WHERE id <= 45 AND kind = 'mystery' AND status IN ('pending', 'seen', 'accepted')
     AND EXISTS (
       SELECT 1 FROM connections c
       WHERE c.user_a = LEAST(pokes.sender_id, pokes.recipient_id)
         AND c.user_b = GREATEST(pokes.sender_id, pokes.recipient_id))`,
  `UPDATE notifications SET read_at = COALESCE(read_at, ${NOW})
   WHERE dedupe_key IN (SELECT 'connection:' || id FROM pokes WHERE id <= 45 AND status = 'archived')`,
];

/** Runs the recovery inside the caller's transaction on any client exposing `query`. */
export async function recoverLegacyConnections(client) {
  for (const statement of legacyRecoveryStatements) await client.query(statement);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const apply = process.argv.includes("--apply");
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    const before = (await client.query("SELECT count(*)::int AS n FROM connections")).rows[0].n;
    await recoverLegacyConnections(client);
    const after = (await client.query("SELECT count(*)::int AS n FROM connections")).rows[0].n;
    console.log(`[legacy] connections ${before} -> ${after}`);
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(
      apply ? "[legacy] committed." : "[legacy] dry run rolled back; pass --apply to commit.",
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}
