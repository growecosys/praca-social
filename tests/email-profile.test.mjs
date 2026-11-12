import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
async function load(file) {
  const { code } = await transformWithEsbuild(
    await readFile(new URL("../" + file, import.meta.url), "utf8"),
    file,
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
        async run() {
          return d.prepare(sql).run(...args);
        },
      });
      return { ...bind([]), bind: (...args) => bind(args) };
    },
    async batch(stmts) {
      d.exec("BEGIN");
      try {
        const out = stmts.map((s) => d.prepare(s.sql).run(...s.args));
        d.exec("COMMIT");
        return out;
      } catch (e) {
        d.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
async function setup() {
  const d = new DatabaseSync(":memory:");
  d.exec(
    "PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT UNIQUE,display_name TEXT,profile_complete INTEGER DEFAULT 1,answers_json TEXT DEFAULT '[]',deleted_at TEXT,secret_hash TEXT,secret_salt TEXT,updated_at TEXT);CREATE TABLE sessions(user_id TEXT);CREATE TABLE posts(id INTEGER,owner_id TEXT);CREATE TABLE comments(id INTEGER,user_id TEXT);CREATE TABLE activity_events(user_id TEXT,action TEXT,entity_type TEXT,entity_id TEXT,metadata_json TEXT DEFAULT '{}');INSERT INTO users(id,username,display_name) VALUES ('a','ana','Ana'),('b','beto','Beto');",
  );
  d.exec(
    await readFile(
      new URL("../tests/fixtures/sqlite-migrations/0024_worthless_wasp.sql", import.meta.url),
      "utf8",
    ),
  );
  d.exec(
    await readFile(
      new URL("../tests/fixtures/sqlite-migrations/0025_blue_blockbuster.sql", import.meta.url),
      "utf8",
    ),
  );
  d.exec(
    await readFile(
      new URL(
        "../tests/fixtures/sqlite-migrations/0026_curvy_captain_midlands.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  return { d, db: adapter(d) };
}
test("profile edit validates input, reserves old handles, forbids conflicts and keeps edits atomic", async () => {
  const { d, db } = await setup(),
    { saveProfileEdit, validateProfileEdit } = await load("lib/profile-edit.ts");
  const user = { id: "a", username: "ana", displayName: "Ana", bio: "" };
  const edited = await saveProfileEdit(db, user, {
    displayName: "  Ana   Maria ",
    username: "@ana_nova",
    bio: "Olá",
  });
  assert.equal(edited.displayName, "Ana Maria");
  assert.equal(
    d.prepare("SELECT user_id FROM profile_aliases WHERE username='ana'").get().user_id,
    "a",
  );
  await assert.rejects(
    saveProfileEdit(
      db,
      { id: "b", username: "beto", displayName: "Beto", bio: "" },
      { displayName: "Beto", username: "ana", bio: "" },
    ),
    /reservado/,
  );
  assert.equal(d.prepare("SELECT username FROM users WHERE id='b'").get().username, "beto");
  assert.equal(
    d.prepare("SELECT count(*) n FROM profile_aliases WHERE username='beto'").get().n,
    0,
  );
  assert.throws(() => validateProfileEdit({ displayName: "A", username: "ana", bio: "" }));
  assert.throws(() => validateProfileEdit({ displayName: "Ana", username: "bad name", bio: "" }));
  assert.equal(
    JSON.parse(
      d.prepare("SELECT metadata_json FROM activity_events").get().metadata_json,
    ).fields.includes("bio"),
    true,
  );
  d.close();
});
test("email links: hash-only tokens, expiry, browser binding, account linking, single consumption and rate limiting", async () => {
  const { d, db } = await setup(),
    m = await load("lib/email-access.ts"),
    env = { RESEND_API_KEY: "fake-test-key", AUTH_EMAIL_FROM: "test@example.test" };
  const messages = [];
  const send = async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    messages.push(JSON.parse(init.body));
    return new Response("{}", { status: 200 });
  };
  const nonce = m.randomEmailToken();
  assert.equal(m.normalizeEmail(" ANA@EXAMPLE.TEST "), "ana@example.test");
  await assert.rejects(
    m.requestEmailAccess(db, {}, "a@example.test", "link", "a", nonce, "1", send),
    /não está disponível/,
  );
  const response = await m.requestEmailAccess(
    db,
    env,
    "ana@example.test",
    "link",
    "a",
    nonce,
    "1",
    send,
  );
  assert.deepEqual(response, { sent: true });
  const token = messages.at(-1).text.match(/token=([a-f0-9]{64})/)[1];
  assert.notEqual(d.prepare("SELECT token_hash FROM email_auth_tokens").get().token_hash, token);
  assert.equal(d.prepare("SELECT consumed_at FROM email_auth_tokens").get().consumed_at, null);
  const create = async () => assert.fail("link must not create an account");
  await assert.rejects(m.redeemEmailAccess(db, token, m.randomEmailToken(), "a", create));
  await assert.rejects(m.redeemEmailAccess(db, token, nonce, "b", create));
  const linked = await m.redeemEmailAccess(db, token, nonce, "a", create);
  assert.equal(linked.userId, "a");
  assert.equal(linked.linked, true);
  await assert.rejects(m.redeemEmailAccess(db, token, nonce, "a", create));
  await m.requestEmailAccess(db, env, "ana@example.test", "login", null, nonce, "2", send);
  const login = messages.at(-1).text.match(/token=([a-f0-9]{64})/)[1];
  const results = await Promise.allSettled([
    m.redeemEmailAccess(db, login, nonce, null, create),
    m.redeemEmailAccess(db, login, nonce, null, create),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  await m.requestEmailAccess(db, env, "exp@example.test", "login", null, nonce, "3", send);
  const expired = messages.at(-1).text.match(/token=([a-f0-9]{64})/)[1];
  d.prepare("UPDATE email_auth_tokens SET expires_at='2000-01-01' WHERE token_hash=?").run(
    await m.emailDigest(expired),
  );
  await assert.rejects(m.redeemEmailAccess(db, expired, nonce, null, create));
  await m.requestEmailAccess(db, env, "new@example.test", "login", null, nonce, "4", send);
  const fresh = messages.at(-1).text.match(/token=([a-f0-9]{64})/)[1];
  let created = 0;
  await assert.rejects(
    m.redeemEmailAccess(db, fresh, nonce, null, async () => {
      created++;
    }),
    /não está vinculado/,
  );
  assert.equal(created, 0);
  assert.equal(d.prepare("SELECT count(*) n FROM users").get().n, 2);

  assert.equal(await m.takeEmailLimit(db, "limit", 1, 1000), true);
  assert.equal(await m.takeEmailLimit(db, "limit", 1, 1000), false);
  const before = d.prepare("SELECT count(*) n FROM email_auth_tokens").get().n;
  await assert.rejects(
    m.requestEmailAccess(
      db,
      env,
      "fail@example.test",
      "login",
      null,
      nonce,
      "5",
      async () => new Response("{}", { status: 500 }),
    ),
  );
  assert.equal(d.prepare("SELECT count(*) n FROM email_auth_tokens").get().n, before);
  assert.equal(
    messages.some((v) => v.to[0] === "new@example.test"),
    true,
  );
  d.close();
});

test("email code stays browser-bound, shares one-use state with link and stops after five guesses", async () => {
  const { d, db } = await setup(),
    m = await load("lib/email-access.ts"),
    env = { RESEND_API_KEY: "test", AUTH_EMAIL_FROM: "test@example.test" },
    nonce = m.randomEmailToken();
  let message;
  const send = async (url, init) => {
    message = JSON.parse(init.body);
    return new Response("{}");
  };
  await m.requestEmailAccess(db, env, "code@example.test", "link", "a", nonce, "code-ip", send);
  const code = message.text.match(/código: ([0-9]{8})/)[1],
    token = message.text.match(/token=([a-f0-9]{64})/)[1];
  assert.notEqual(d.prepare("SELECT code_hash FROM email_auth_tokens").get().code_hash, code);
  await assert.rejects(m.redeemEmailAccess(db, code, m.randomEmailToken(), "a", async () => {}));
  await assert.rejects(m.redeemEmailAccess(db, code, nonce, "b", async () => {}));
  const result = await m.redeemEmailAccess(db, code, nonce, "a", async () => {});
  assert.equal(result.linked, true);
  await assert.rejects(m.redeemEmailAccess(db, token, nonce, "a", async () => {}));
  const other = m.randomEmailToken();
  await m.requestEmailAccess(db, env, "guess@example.test", "link", "a", other, "guess-ip", send);
  const actual = message.text.match(/código: ([0-9]{8})/)[1],
    wrong = actual === "00000000" ? "11111111" : "00000000";
  for (let i = 0; i < 5; i++)
    await assert.rejects(m.redeemEmailAccess(db, wrong, other, "a", async () => {}));
  await assert.rejects(
    m.redeemEmailAccess(db, actual, other, "a", async () => {}),
    /Muitas tentativas/,
  );
  d.close();
});

test("legacy empty email account can be linked to the original account after proving both ownerships; active accounts cannot be transferred", async () => {
  const { d, db } = await setup(),
    m = await load("lib/email-access.ts"),
    env = { RESEND_API_KEY: "fake", AUTH_EMAIL_FROM: "test@example.test" },
    nonce = m.randomEmailToken();
  let message;
  const send = async (url, init) => {
    message = JSON.parse(init.body);
    return new Response("{}");
  };
  d.prepare(
    "INSERT INTO users(id,username,display_name,profile_complete,answers_json) VALUES ('empty','pessoa_123456abcdef','Nova pessoa',0,'[]')",
  ).run();
  d.prepare("INSERT INTO account_emails VALUES ('empty','legacy@example.test','now')").run();
  d.prepare("INSERT INTO sessions VALUES ('empty')").run();
  await m.requestEmailAccess(
    db,
    env,
    "legacy@example.test",
    "login",
    null,
    nonce,
    "login-empty",
    send,
  );
  const old = message.text.match(/token=([a-f0-9]{64})/)[1];
  await assert.rejects(
    m.redeemEmailAccess(db, old, nonce, null, async () => assert.fail()),
    /conta vazia/,
  );
  const delivered = await m.requestEmailAccess(
    db,
    env,
    "legacy@example.test",
    "link",
    "a",
    nonce,
    "link-empty",
    send,
  );
  assert.equal(delivered.sent, true);
  const token = message.text.match(/token=([a-f0-9]{64})/)[1];
  await assert.rejects(m.redeemEmailAccess(db, token, nonce, "b", async () => assert.fail()));
  await m.redeemEmailAccess(db, token, nonce, "a", async () => assert.fail());
  assert.equal(
    d.prepare("SELECT user_id FROM account_emails WHERE email='legacy@example.test'").get().user_id,
    "a",
  );
  assert.equal(d.prepare("SELECT count(*) n FROM sessions WHERE user_id='empty'").get().n, 0);
  assert.ok(d.prepare("SELECT deleted_at FROM users WHERE id='empty'").get().deleted_at);
  d.prepare("INSERT INTO account_emails VALUES ('b','active@example.test','now')").run();
  const blocked = await m.requestEmailAccess(
    db,
    env,
    "active@example.test",
    "link",
    "a",
    nonce,
    "active",
    send,
  );
  assert.equal(blocked.sent, false);
  d.close();
});
