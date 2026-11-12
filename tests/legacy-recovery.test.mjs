import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { recoverLegacyConnections } from "../scripts/recover-legacy-connections.mjs";

async function freshDatabase() {
  const db = new PGlite();
  const migration = await readFile(new URL("../drizzle/0000_init.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) await db.exec(statement);
  }
  return db;
}

test("legacy reciprocal recovery is bounded, idempotent and preserves audit history", async () => {
  const db = await freshDatabase();
  for (const id of ["a", "b", "c", "d", "e"]) {
    await db.query(
      "INSERT INTO users (id, username, display_name, secret_hash, secret_salt) VALUES ($1, $1, $1, 'h', 's')",
      [id],
    );
  }
  const rows = [
    [1, "a", "b", "seen"],
    [2, "b", "a", "archived"],
    [3, "a", "c", "seen"],
    [4, "a", "d", "seen"],
    [5, "d", "a", "declined"],
    [46, "a", "e", "seen"],
    [47, "e", "a", "seen"],
  ];
  for (const [id, sender, recipient, status] of rows) {
    await db.query(
      "INSERT INTO pokes (id, sender_id, recipient_id, kind, status, created_at) VALUES ($1, $2, $3, 'mystery', $4, '2026-10-29 10:00:00')",
      [id, sender, recipient, status],
    );
  }
  for (const key of ["connection:1", "connection:3"]) {
    await db.query(
      "INSERT INTO notifications (recipient_id, type, title, body, href, dedupe_key) VALUES ('a', 'poke', 't', 'b', '/', $1)",
      [key],
    );
  }

  await recoverLegacyConnections(db);
  await recoverLegacyConnections(db);

  const connections = await db.query("SELECT user_a, user_b FROM connections");
  assert.deepEqual(connections.rows, [{ user_a: "a", user_b: "b" }]);
  const events = await db.query("SELECT count(*)::int AS n FROM activity_events");
  assert.equal(events.rows[0].n, 1);
  const status = async (id) =>
    (await db.query("SELECT status FROM pokes WHERE id = $1", [id])).rows[0].status;
  assert.equal(await status(1), "archived");
  assert.equal(await status(3), "seen");
  assert.equal(await status(46), "seen");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pokes")).rows[0].n, 7);
  const read = async (key) =>
    (await db.query("SELECT read_at FROM notifications WHERE dedupe_key = $1", [key])).rows[0]
      .read_at;
  assert.match(await read("connection:1"), /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
  assert.equal(await read("connection:3"), null);
  await db.close();
});
