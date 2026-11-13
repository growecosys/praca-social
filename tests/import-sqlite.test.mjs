import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { PGlite } from "@electric-sql/pglite";
import { importSqlite } from "../scripts/import-sqlite.mjs";

function legacyDatabase() {
  const directory = new URL("./fixtures/sqlite-migrations/", import.meta.url);
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  // 0023_common_space predates the ALTER in 0023_boring_blizzard, as in the original setup.
  files.splice(files.indexOf("0023_common_space.sql"), 1);
  files.splice(files.indexOf("0023_boring_blizzard.sql"), 0, "0023_common_space.sql");
  const sqlite = new DatabaseSync(":memory:");
  for (const file of files) {
    for (const statement of readFileSync(new URL(file, directory), "utf8").split(
      "--> statement-breakpoint",
    )) {
      sqlite.exec(statement);
    }
  }
  return sqlite;
}

async function emptyPostgres() {
  const db = new PGlite();
  const migration = await readFile(new URL("../drizzle/0000_init.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) await db.exec(statement);
  }
  return db;
}

test("a restored D1 export imports with IDs, big integers and sequences intact", async () => {
  const sqlite = legacyDatabase();
  const bigMillis = 1794524620150;
  sqlite.exec(`
    INSERT INTO users (id, username, display_name, secret_hash, secret_salt, profile_complete)
      VALUES ('u1', 'ana', 'Ana', 'hash1', 'salt1', 1), ('u2', 'bia', 'Bia', 'hash2', 'salt2', 0);
    INSERT INTO posts (id, slug, title, content, owner_id) VALUES (10, 'um', 'Um', 'x', 'u1'), (11, 'dois', 'Dois', 'y', 'u2');
    INSERT INTO common_signals (id, author_id, body, page, hide_name, created_at)
      VALUES ('s1', 'u1', 'corpo', 'Outra página', 1, ${bigMillis});
    INSERT INTO connections (user_a, user_b) VALUES ('u1', 'u2');
    CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO d1_migrations (name) VALUES ('0000_init');
    CREATE TABLE legacy_extra (id INTEGER PRIMARY KEY, note TEXT);
  `);

  const target = await emptyPostgres();
  const { report, ignoredSqliteTables, sequencesReset } = await importSqlite({ sqlite, target });

  const counts = Object.fromEntries(report.map((row) => [row.table, row]));
  assert.ok(
    report.every((row) => row.ok),
    JSON.stringify(report.filter((row) => !row.ok)),
  );
  assert.equal(counts.users.postgres, 2);
  assert.equal(counts.posts.postgres, 2);
  assert.equal(counts.common_signals.postgres, 1);
  assert.deepEqual(
    ignoredSqliteTables,
    ["legacy_extra"],
    "schema drift is reported; D1 bookkeeping is not",
  );
  assert.ok(sequencesReset >= 20);

  const signal = (await target.query("SELECT created_at, hide_name FROM common_signals")).rows[0];
  assert.equal(Number(signal.created_at), bigMillis);
  assert.equal(signal.hide_name, 1);
  const user = (await target.query("SELECT secret_hash, secret_salt FROM users WHERE id = 'u1'"))
    .rows[0];
  assert.deepEqual(user, { secret_hash: "hash1", secret_salt: "salt1" });

  const next = await target.query(
    "INSERT INTO posts (slug, title, content) VALUES ('tres', 'Tres', 'z') RETURNING id",
  );
  assert.equal(
    Number(next.rows[0].id),
    12,
    "identity sequence continues after the imported maximum",
  );

  await assert.rejects(
    importSqlite({ sqlite, target }),
    /is not empty/,
    "a second import into a populated database is refused",
  );
  sqlite.close();
  await target.close();
});

test("a D1 .sql export can be opened directly, including its PRAGMA and sqlite_sequence rows", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { openExport } = await import("../scripts/import-sqlite.mjs");
  const dir = await mkdtemp(join(tmpdir(), "d1-export-"));
  try {
    const file = join(dir, "praca-d1.sql");
    await writeFile(
      file,
      [
        "PRAGMA defer_foreign_keys=TRUE;",
        "CREATE TABLE IF NOT EXISTS _cf_KV (key TEXT PRIMARY KEY, value BLOB);",
        "CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL);",
        "INSERT INTO posts VALUES(1,'Olá, Praça');",
        "DELETE FROM sqlite_sequence;",
        "INSERT INTO sqlite_sequence VALUES('posts',1);",
      ].join("\n"),
    );
    const sqlite = openExport(file);
    assert.deepEqual(
      sqlite
        .prepare("SELECT id, title FROM posts")
        .all()
        .map((r) => ({ ...r })),
      [{ id: 1, title: "Olá, Praça" }],
    );
    sqlite.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a JSONL export is refused when truncated or when counts disagree, and loads verbatim when complete", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { openJsonlExport } = await import("../scripts/import-sqlite.mjs");
  const dir = await mkdtemp(join(tmpdir(), "jsonl-export-"));
  const lines = (...entries) => entries.map((entry) => JSON.stringify(entry)).join("\n");
  const header = { type: "header", format: "praca-d1-jsonl", version: 1 };
  const table = { type: "table", name: "notes", columns: [{ name: "id" }, { name: "body" }] };
  const row = (id, body) => ({ type: "row", table: "notes", data: { id, body } });
  try {
    const complete = join(dir, "complete.jsonl");
    await writeFile(
      complete,
      lines(
        header,
        table,
        row(1, "Olá"),
        row(2, null),
        { type: "table_end", name: "notes", rows: 2 },
        {
          type: "footer",
          counts: { notes: 2 },
        },
      ),
    );
    const sqlite = openJsonlExport(complete);
    assert.deepEqual(
      sqlite
        .prepare("SELECT id, body FROM notes ORDER BY id")
        .all()
        .map((r) => ({ ...r })),
      [
        { id: 1, body: "Olá" },
        { id: 2, body: null },
      ],
    );
    sqlite.close();

    const truncated = join(dir, "truncated.jsonl");
    await writeFile(truncated, lines(header, table, row(1, "a")));
    assert.throws(() => openJsonlExport(truncated), /footer/);

    const mismatch = join(dir, "mismatch.jsonl");
    await writeFile(
      mismatch,
      lines(
        header,
        table,
        row(1, "a"),
        { type: "table_end", name: "notes", rows: 2 },
        {
          type: "footer",
          counts: { notes: 2 },
        },
      ),
    );
    assert.throws(() => openJsonlExport(mismatch), /declares 2/);

    const wrongFormat = join(dir, "wrong.jsonl");
    await writeFile(wrongFormat, lines({ type: "header", format: "something-else" }));
    assert.throws(() => openJsonlExport(wrongFormat), /unsupported export format/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a media TAR source needs a finished archive, stays inside its folder and checks sizes", async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { tarSource } = await import("../scripts/transfer-r2-to-blob.mjs");
  const dir = await mkdtemp(join(tmpdir(), "tar-export-"));
  try {
    await mkdir(join(dir, "metadata"));
    await mkdir(join(dir, "objects"));
    await writeFile(join(dir, "objects", "0000000001"), "abc");
    const meta = (key, exportedPath, size) =>
      JSON.stringify({
        key,
        exportedPath,
        size,
        httpMetadata: { contentType: "image/png" },
        customMetadata: { ownerId: "u" },
      });
    await writeFile(
      join(dir, "metadata", "0000000001.json"),
      meta("a.png", "objects/0000000001", 3),
    );
    assert.throws(() => tarSource(dir), /unfinished/);
    await writeFile(join(dir, "complete.json"), "{}");
    const source = tarSource(dir);
    assert.deepEqual((await source.get("a.png")).metadata, { ownerId: "u" });
    assert.equal((await source.get("a.png")).contentType, "image/png");

    await writeFile(
      join(dir, "metadata", "0000000002.json"),
      meta("evil.png", "../../etc/passwd", 3),
    );
    await writeFile(
      join(dir, "metadata", "0000000003.json"),
      meta("short.png", "objects/0000000001", 99),
    );
    const strict = tarSource(dir);
    await assert.rejects(strict.get("evil.png"), /escapes the archive/);
    await assert.rejects(strict.get("short.png"), /recorded/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
