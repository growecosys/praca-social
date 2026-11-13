import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { transform } from "esbuild";
import { extractPreparedStatements } from "./helpers/extract-sql.mjs";

const { code } = await transform(
  await readFile(new URL("../lib/sql-dialect.ts", import.meta.url), "utf8"),
  {
    loader: "ts",
  },
);
const { toPostgres } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

let db;
before(async () => {
  db = new PGlite();
  const migration = await readFile(new URL("../drizzle/0000_init.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) await db.exec(statement);
  }
});
after(async () => db?.close());

test("placeholders are rewritten outside string literals only", () => {
  assert.equal(toPostgres("SELECT '?' , ? , \"a?\" , ?"), "SELECT '?' , $1 , \"a?\" , $2");
});

test("every static prepared statement is valid Postgres against the real schema", async () => {
  const failures = [];
  let checked = 0;
  for (const { file, line, sql } of extractPreparedStatements()) {
    if (sql === null || sql.includes("\u0000")) continue;
    checked++;
    try {
      await db.exec("DEALLOCATE ALL");
    } catch {}
    try {
      await db.query(`PREPARE s AS ${toPostgres(sql)}`);
    } catch (error) {
      failures.push(
        `${file}:${line}  ${error.message}\n    ${sql.replace(/\s+/g, " ").slice(0, 160)}`,
      );
    }
  }
  assert.ok(checked > 150, `expected to check the whole catalogue, checked ${checked}`);
  assert.deepEqual(failures, [], `\n${failures.join("\n")}\n`);
});
