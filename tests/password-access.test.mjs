import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
async function load() {
  const { code } = await transformWithEsbuild(
    await readFile("lib/password-access.ts", "utf8"),
    "password.ts",
    { loader: "ts", target: "esnext" },
  );
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}
function adapter(d) {
  return {
    prepare(sql) {
      const bind = (args) => ({
        sql,
        args,
        async first() {
          return d.prepare(sql).get(...args) || null;
        },
      });
      return { ...bind([]), bind: (...args) => bind(args) };
    },
    async batch(stmts) {
      d.exec("BEGIN");
      try {
        for (const s of stmts) d.prepare(s.sql).run(...s.args);
        d.exec("COMMIT");
      } catch (e) {
        d.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
test("password registration stores pending email privately; only verified addresses sign in; alias conflicts and failed writes are atomic", async () => {
  const m = await load(),
    d = new DatabaseSync(":memory:");
  d.exec(
    `CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT UNIQUE,display_name TEXT,secret_hash TEXT,secret_salt TEXT,deleted_at TEXT);CREATE TABLE profile_aliases(username TEXT PRIMARY KEY,user_id TEXT);CREATE TABLE account_emails(user_id TEXT PRIMARY KEY,email TEXT UNIQUE,verified_at TEXT);CREATE TABLE activity_events(user_id TEXT,action TEXT,entity_type TEXT,entity_id TEXT);`,
  );
  d.exec(await readFile("drizzle/0025_blue_blockbuster.sql", "utf8"));
  const db = adapter(d),
    hash = async () => ({ hash: "hashed-password", salt: "unique-salt" }),
    normalize = (s) => s.trim();
  const fields = {
    displayName: "  Ana  Maria ",
    username: "@ANA",
    email: " ANA@example.test ",
    secret: "password-123",
  };
  const account = await m.createPasswordAccount(db, fields, hash, normalize);
  assert.equal(account.email, "ana@example.test");
  assert.equal(d.prepare("SELECT display_name FROM users").get().display_name, "Ana Maria");
  assert.equal((await m.findPasswordAccount(db, "@ANA")).id, account.id);
  assert.equal(await m.findPasswordAccount(db, "ana@example.test"), null);
  d.prepare("INSERT INTO account_emails VALUES (?,?,?)").run(account.id, account.email, "now");
  assert.equal((await m.findPasswordAccount(db, "ANA@example.test")).id, account.id);
  await assert.rejects(
    m.createPasswordAccount(db, { ...fields, username: "outro" }, hash, normalize),
  );
  d.prepare("INSERT INTO profile_aliases VALUES (?,?)").run("antigo", account.id);
  await assert.rejects(
    m.createPasswordAccount(
      db,
      { ...fields, username: "antigo", email: "other@example.test" },
      hash,
      normalize,
    ),
  );
  assert.throws(() => m.registrationFields({ ...fields, email: "wrong" }));
  assert.throws(() => m.registrationFields({ ...fields, secret: "short" }));
  d.exec(
    "CREATE TRIGGER fail_activity BEFORE INSERT ON activity_events BEGIN SELECT RAISE(ABORT,'failed'); END",
  );
  await assert.rejects(
    m.createPasswordAccount(
      db,
      { ...fields, username: "novo", email: "new@example.test" },
      hash,
      normalize,
    ),
  );
  assert.equal(d.prepare("SELECT count(*) n FROM users WHERE username='novo'").get().n, 0);
  assert.equal(
    d.prepare("SELECT count(*) n FROM pending_account_emails WHERE email='new@example.test'").get()
      .n,
    0,
  );
  d.close();
});
