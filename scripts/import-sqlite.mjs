// Imports a restored D1/SQLite export into the PostgreSQL schema created by `npm run db:migrate`.
//
//   sqlite3 praca.sqlite < praca-d1.sql
//   node scripts/import-sqlite.mjs praca.sqlite            validate in a transaction, then roll back
//   node scripts/import-sqlite.mjs praca.sqlite --apply    import and commit
//
// IDs, UUIDs, hashes, salts, JSON payloads and timestamps are copied verbatim. Identity
// sequences are advanced past the imported maximum. The target must be empty. Exits non-zero
// when any table count differs. Never commit the export: it contains credential hashes.
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const quote = (name) => `"${name.replace(/"/g, '""')}"`;
const IGNORED = /^(sqlite_|_cf_|d1_migrations$|_migrations$)/;

async function dependencyOrder(target) {
  const tables = (
    await target.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    )
  ).rows
    .map((row) => row.table_name)
    .filter((name) => !IGNORED.test(name));
  const edges = (
    await target.query(
      "SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent FROM pg_constraint WHERE contype = 'f'",
    )
  ).rows;
  const parents = new Map(tables.map((table) => [table, new Set()]));
  for (const { child, parent } of edges) {
    if (child !== parent && parents.has(child)) parents.get(child).add(parent);
  }
  const ordered = [];
  const remaining = new Set(tables);
  while (remaining.size) {
    const ready = [...remaining].filter((table) =>
      [...parents.get(table)].every((parent) => !remaining.has(parent)),
    );
    if (!ready.length) throw new Error(`Foreign-key cycle among: ${[...remaining].join(", ")}`);
    for (const table of ready.sort()) {
      ordered.push(table);
      remaining.delete(table);
    }
  }
  return ordered;
}

export async function importSqlite({ sqlite, target, log = () => {} }) {
  const order = await dependencyOrder(target);
  const sqliteTables = new Set(
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name)
      .filter((name) => !IGNORED.test(name)),
  );

  for (const table of order) {
    const { n } = (await target.query(`SELECT count(*)::int AS n FROM ${quote(table)}`)).rows[0];
    if (n) throw new Error(`Target table ${table} is not empty (${n} rows); refusing to import.`);
  }

  const report = [];
  for (const table of order) {
    if (!sqliteTables.has(table)) {
      report.push({ table, sqlite: 0, postgres: 0, ok: true, note: "absent from export" });
      continue;
    }
    const sqliteColumns = sqlite
      .prepare(`PRAGMA table_info(${quote(table)})`)
      .all()
      .map((c) => c.name);
    const targetColumns = (
      await target.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
        [table],
      )
    ).rows.map((row) => row.column_name);
    const columns = sqliteColumns.filter((name) => targetColumns.includes(name));
    const dropped = sqliteColumns.filter((name) => !targetColumns.includes(name));
    const rows = sqlite
      .prepare(`SELECT ${columns.map(quote).join(", ")} FROM ${quote(table)}`)
      .all();

    const perInsert = Math.max(1, Math.floor(30000 / Math.max(columns.length, 1)));
    for (let start = 0; start < rows.length; start += perInsert) {
      const chunk = rows.slice(start, start + perInsert);
      const params = [];
      const tuples = chunk.map((row) => {
        const placeholders = columns.map((column) => {
          params.push(row[column] === undefined ? null : row[column]);
          return `$${params.length}`;
        });
        return `(${placeholders.join(", ")})`;
      });
      await target.query(
        `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES ${tuples.join(", ")}`,
        params,
      );
    }

    const postgres = (await target.query(`SELECT count(*)::int AS n FROM ${quote(table)}`)).rows[0]
      .n;
    report.push({
      table,
      sqlite: rows.length,
      postgres,
      ok: rows.length === postgres,
      note: dropped.length ? `columns not in destination: ${dropped.join(", ")}` : "",
    });
    log(`${table}: ${rows.length} -> ${postgres}`);
  }

  const sequences = (
    await target.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_default LIKE 'nextval%'",
    )
  ).rows;
  for (const { table_name: table, column_name: column } of sequences) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${quote(column)}), 0) + 1, false) FROM ${quote(table)}`,
      [quote(table), column],
    );
  }

  const ignored = [...sqliteTables].filter((name) => !order.includes(name));
  return { report, ignoredSqliteTables: ignored, sequencesReset: sequences.length };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const apply = process.argv.includes("--apply");
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!file) throw new Error("Usage: node scripts/import-sqlite.mjs <restored.sqlite> [--apply]");
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const client = new pg.Client({ connectionString });
  await client.connect();
  const sqlite = new DatabaseSync(file, { readOnly: true });
  try {
    await client.query("BEGIN");
    const result = await importSqlite({ sqlite, target: client, log: console.log });
    console.table(result.report);
    console.log("Tables in the export that have no destination:", result.ignoredSqliteTables);
    const bad = result.report.filter((row) => !row.ok);
    if (bad.length)
      throw new Error(`Row-count mismatch in: ${bad.map((row) => row.table).join(", ")}`);
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(
      apply ? "[import] committed." : "[import] validated and rolled back; pass --apply to commit.",
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    sqlite.close();
    await client.end();
  }
}
