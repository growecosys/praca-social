import { sql } from "drizzle-orm";
import { getDb } from "../db";

// Bounded recovery of the inspected legacy records. New interactions use connect().
export const legacyPairsSql = `
 SELECT min(p.sender_id,p.recipient_id) AS a, max(p.sender_id,p.recipient_id) AS b,
 min(max(p.created_at,q.created_at)) AS established
 FROM pokes p JOIN pokes q ON q.sender_id=p.recipient_id AND q.recipient_id=p.sender_id
 WHERE p.id<=45 AND q.id<=45 AND p.sender_id<>p.recipient_id
 AND p.kind='mystery' AND q.kind='mystery'
 AND p.status NOT IN ('declined','cancelled') AND q.status NOT IN ('declined','cancelled')
 GROUP BY a,b`;
let recovery: Promise<unknown> | undefined;
export function recoverLegacyConnections() {
  if (!recovery)
    recovery = (async () => {
      const db = getDb();
      await db.batch([
        db.run(
          sql.raw(`INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json)
    SELECT pairs.a,'legacy_connection_recovered','user',pairs.b,'{"source":"reciprocal_pokes","throughId":45}'
    FROM (${legacyPairsSql}) pairs WHERE NOT EXISTS
    (SELECT 1 FROM connections c WHERE c.user_a=pairs.a AND c.user_b=pairs.b)`),
        ),
        db.run(
          sql.raw(
            `INSERT OR IGNORE INTO connections(user_a,user_b,created_at) SELECT a,b,established FROM (${legacyPairsSql})`,
          ),
        ),
        db.run(
          sql.raw(`UPDATE pokes SET status='archived',resolved_at=COALESCE(resolved_at,CURRENT_TIMESTAMP)
    WHERE id<=45 AND kind='mystery' AND status IN ('pending','seen','accepted')
    AND EXISTS (SELECT 1 FROM connections c WHERE c.user_a=min(pokes.sender_id,pokes.recipient_id)
    AND c.user_b=max(pokes.sender_id,pokes.recipient_id))`),
        ),
        db.run(
          sql.raw(`UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP)
    WHERE dedupe_key IN (SELECT 'connection:'||id FROM pokes WHERE id<=45 AND status='archived')`),
        ),
      ]);
    })().catch((error) => {
      recovery = undefined;
      throw error;
    });
  return recovery;
}
