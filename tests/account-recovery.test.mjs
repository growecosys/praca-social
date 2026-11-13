import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { transformWithEsbuild } from "vite";
async function load(path, replace = (s) => s) {
  const { code } = await transformWithEsbuild(
    replace(await readFile(new URL("../" + path, import.meta.url), "utf8")),
    path,
    { loader: "ts", target: "esnext" },
  );
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}
test("recovery accepts either selected answer, hides account questions, caps concurrent attempts and revokes old sessions", async () => {
  const auth = await load("lib/praca-auth.ts", (s) => s.replace(/^import\b[^;]*;/gm, ""));
  globalThis.__recoveryAuth = auth;
  const d = new DatabaseSync(":memory:");
  d.exec(
    `CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT,secret_hash TEXT,secret_salt TEXT,updated_at TEXT);CREATE TABLE account_recovery(user_id TEXT PRIMARY KEY,question_1 TEXT,answer_1_hash TEXT,answer_1_salt TEXT,question_2 TEXT,answer_2_hash TEXT,answer_2_salt TEXT,attempts INTEGER DEFAULT 0,locked_until TEXT,updated_at TEXT);CREATE TABLE sessions(user_id TEXT,token_hash TEXT);CREATE TABLE activity_events(user_id TEXT,action TEXT,entity_type TEXT,entity_id TEXT);`,
  );
  const old = await auth.hashSecret("old-secret"),
    one = await auth.hashSecret(auth.normalizeRecoveryAnswer("São Paulo")),
    two = await auth.hashSecret(auth.normalizeRecoveryAnswer("Feijão"));
  d.prepare("INSERT INTO users VALUES (?,?,?,?,NULL)").run("a", "ana", old.hash, old.salt);
  d.prepare("INSERT INTO account_recovery VALUES (?,?,?,?,?,?,?,0,NULL,NULL)").run(
    "a",
    "place",
    one.hash,
    one.salt,
    "meal",
    two.hash,
    two.salt,
  );
  d.exec("INSERT INTO sessions VALUES ('a','old-session')");
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql,
            args,
            async first() {
              return d.prepare(sql).get(...args) || null;
            },
          };
        },
      };
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
  globalThis.__recoveryDb = db;
  const api = await load("app/api/auth/recover/route.ts", (s) =>
    s.replace(/^import\b[^;]*;/gm, (line) =>
      line.includes("lib/env")
        ? "const env={DB:globalThis.__recoveryDb};"
        : line.includes("praca-auth")
          ? "const {hashSecret,normalizeRecoveryAnswer,verifySecret}=globalThis.__recoveryAuth;const clearSession=async()=>{};"
          : line.includes("recovery-questions")
            ? "const RECOVERY_QUESTIONS={place:'Place',meal:'Meal',teacher:'Teacher'};"
            : line,
    ),
  );
  const post = (over = {}) =>
    api.POST(
      new Request("https://test/api/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://test" },
        body: JSON.stringify({
          username: "@ANA",
          question: "meal",
          answer: " feijao ",
          newSecret: "new-secret",
          confirmSecret: "new-secret",
          ...over,
        }),
      }),
    );
  assert.deepEqual(
    await (await api.GET(new Request("https://test?username=ana"))).json(),
    await (await api.GET(new Request("https://test?username=missing"))).json(),
  );
  assert.equal((await post({ answer: "wrong" })).status, 401);
  assert.equal(d.prepare("SELECT count(*) n FROM sessions").get().n, 1);
  assert.equal((await post({ confirmSecret: "different" })).status, 400);
  assert.equal((await post()).status, 200);
  assert.equal(d.prepare("SELECT count(*) n FROM sessions").get().n, 0);
  const changed = d.prepare("SELECT * FROM users").get();
  assert.equal(
    await auth.verifySecret("new-secret", changed.secret_salt, changed.secret_hash),
    true,
  );
  assert.equal(
    await auth.verifySecret("old-secret", changed.secret_salt, changed.secret_hash),
    false,
  );
  assert.equal(d.prepare("SELECT count(*) n FROM activity_events").get().n, 1);
  assert.equal(
    (
      await post({
        question: "place",
        answer: "Sao Paulo",
        newSecret: "another-key",
        confirmSecret: "another-key",
      })
    ).status,
    200,
  );
  const failures = await Promise.all(Array.from({ length: 8 }, () => post({ answer: "wrong" })));
  assert.ok(failures.every((r) => r.status === 401));
  assert.equal(d.prepare("SELECT attempts FROM account_recovery").get().attempts, 5);
  assert.equal((await post()).status, 401);
  d.exec("UPDATE account_recovery SET locked_until='2000-01-01T00:00:00.000Z'");
  assert.equal((await post()).status, 200);
  const response = await api.POST(
    new Request("https://test/api/auth/recover", {
      method: "POST",
      headers: { origin: "https://evil.test" },
      body: "{}",
    }),
  );
  assert.equal(response.status, 403);
  assert.equal((await post({ username: "missing" })).status, 401);
  delete globalThis.__recoveryAuth;
  delete globalThis.__recoveryDb;
  d.close();
});
