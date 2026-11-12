import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const directory = join(fileURLToPath(new URL("../", import.meta.url)), "drizzle");
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.log("[migrate] DATABASE_URL is not set; skipping migrations.");
  process.exit(0);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  // Serialize concurrent builds/deploys so the same migration never runs twice.
  await client.query("SELECT pg_advisory_lock(727274)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const applied = new Set(
    (await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name),
  );
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const name of files) {
    if (applied.has(name)) continue;
    const statements = readFileSync(join(directory, name), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    await client.query("BEGIN");
    try {
      for (const statement of statements) await client.query(statement);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${name} failed: ${error.message}`);
    }
    console.log(`[migrate] applied ${name}`);
    count++;
  }
  console.log(
    count ? `[migrate] ${count} migration(s) applied.` : "[migrate] database is up to date.",
  );
} finally {
  await client.query("SELECT pg_advisory_unlock(727274)").catch(() => undefined);
  await client.end();
}
