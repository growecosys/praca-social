import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
const { code } = await transformWithEsbuild(
  await readFile("lib/circle-chat.ts", "utf8"),
  "chat.ts",
  { loader: "ts", target: "esnext" },
);
const chat = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
function setup() {
  const d = new DatabaseSync(":memory:");
  d.exec(
    `CREATE TABLE users(id TEXT PRIMARY KEY,display_name TEXT,username TEXT,deleted_at TEXT);INSERT INTO users VALUES ('a','Ana','ana',NULL),('b','Beto','beto',NULL),('c','Convidada','convidada',NULL),('x','Ex-membro','ex',NULL);CREATE TABLE circles(id INTEGER PRIMARY KEY,name TEXT,status TEXT,chat_enabled INTEGER DEFAULT 1,deleted_at TEXT);INSERT INTO circles(id,name,status) VALUES (1,'Círculo um','active'),(2,'Círculo dois','active'),(3,'Círculo antigo','archived');CREATE TABLE circle_members(circle_id INTEGER,user_id TEXT,status TEXT);INSERT INTO circle_members VALUES (1,'a','active'),(1,'b','active'),(1,'c','invited'),(1,'x','left'),(2,'a','active'),(3,'a','active');CREATE TABLE circle_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,circle_id INTEGER,author_id TEXT,client_id TEXT,body TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE UNIQUE INDEX chat_retry ON circle_messages(circle_id,author_id,client_id);CREATE TABLE notifications(recipient_id TEXT,actor_id TEXT,type TEXT,title TEXT,body TEXT,href TEXT,dedupe_key TEXT UNIQUE,read_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`,
  );
  const db = {
    prepare(sql) {
      const bind = (args) => ({
        async first() {
          return d.prepare(sql).get(...args) || null;
        },
        async all() {
          return { results: d.prepare(sql).all(...args) };
        },
        async run() {
          return { meta: { changes: Number(d.prepare(sql).run(...args).changes) } };
        },
      });
      return { ...bind([]), bind: (...args) => bind(args) };
    },
  };
  return { d, db };
}
const msg = (body = "Olá, círculo!") => ({ body, clientId: crypto.randomUUID() });
test("only active circle members can read and send; invitation, former membership and another circle do not grant access", async () => {
  const { d, db } = setup();
  for (const id of ["c", "x", "stranger"]) {
    await assert.rejects(chat.readCircleChat(db, 1, id), (e) => e.status === 403);
    await assert.rejects(chat.sendCircleMessage(db, 1, id, msg()), (e) => e.status === 403);
  }
  await assert.rejects(chat.readCircleChat(db, 2, "b"), (e) => e.status === 403);
  const result = await chat.sendCircleMessage(db, 1, "a", msg());
  assert.equal(result.message.author.username, "ana");
  assert.equal((await chat.readCircleChat(db, 1, "b")).messages.length, 1);
  d.prepare("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE id='a'").run();
  await assert.rejects(chat.readCircleChat(db, 1, "a"), (e) => e.status === 403);
  d.close();
});
test("retry and concurrent duplicate requests create one message; reused identifiers cannot replace the text", async () => {
  const { d, db } = setup(),
    p = msg();
  const [r1, r2] = await Promise.all([
    chat.sendCircleMessage(db, 1, "a", p),
    chat.sendCircleMessage(db, 1, "a", p),
  ]);
  assert.equal(r1.message.id, r2.message.id);
  assert.equal(d.prepare("SELECT count(*) n FROM circle_messages").get().n, 1);
  assert.equal((await chat.sendCircleMessage(db, 1, "a", p)).replayed, true);
  await assert.rejects(
    chat.sendCircleMessage(db, 1, "a", { ...p, body: "Outra mensagem" }),
    (e) => e.status === 409,
  );
  assert.equal(d.prepare("SELECT body FROM circle_messages").get().body, p.body);
  d.close();
});
test("archived circles keep member history read-only; rate limit bounds bursts and invalid messages never enter history", async () => {
  const { d, db } = setup();
  assert.equal((await chat.readCircleChat(db, 3, "a")).readOnly, true);
  await assert.rejects(chat.sendCircleMessage(db, 3, "a", msg()), (e) => e.status === 409);
  for (const payload of [msg(" "), msg("x".repeat(2001)), { body: "ok", clientId: "invalid" }])
    await assert.rejects(chat.sendCircleMessage(db, 1, "a", payload), (e) => e.status === 400);
  for (let i = 0; i < 20; i++) await chat.sendCircleMessage(db, 1, "a", msg("Mensagem " + i));
  await assert.rejects(chat.sendCircleMessage(db, 1, "a", msg()), (e) => e.status === 429);
  assert.equal(d.prepare("SELECT count(*) n FROM circle_messages").get().n, 20);
  d.close();
});
test("pagination stays chronological without duplicates or cross-circle disclosure; long gaps can be fetched in batches", async () => {
  const { d, db } = setup();
  const insert = d.prepare(
    "INSERT INTO circle_messages(circle_id,author_id,client_id,body) VALUES (?,'a',?,?)",
  );
  for (let i = 0; i < 125; i++) insert.run(1, crypto.randomUUID(), "Mensagem " + i);
  insert.run(2, crypto.randomUUID(), "Privada em outro círculo");
  const recent = await chat.readCircleChat(db, 1, "b");
  assert.equal(recent.messages.length, 50);
  assert.equal(recent.hasEarlier, true);
  assert.equal(recent.messages[0].id, 76);
  const older = await chat.readCircleChat(db, 1, "b", { before: 76 });
  assert.equal(older.messages.at(-1).id, 75);
  assert.equal(older.messages[0].id, 26);
  const after = await chat.readCircleChat(db, 1, "b", { after: 1 });
  assert.equal(after.hasMore, true);
  assert.equal(after.messages[0].id, 2);
  assert.equal(after.messages.at(-1).id, 51);
  assert.ok(
    ![...recent.messages, ...older.messages, ...after.messages].some(
      (m) => m.body === "Privada em outro círculo",
    ),
  );
  await assert.rejects(
    chat.readCircleChat(db, 1, "a", { after: 1, before: 2 }),
    (e) => e.status === 400,
  );
  d.close();
});
test("notifications are collapsed per circle, exclude the sender, and reading older messages cannot clear a newer notification", async () => {
  const { d, db } = setup();
  const first = await chat.sendCircleMessage(db, 1, "a", msg("Primeira"));
  const second = await chat.sendCircleMessage(db, 1, "a", msg("Segunda"));
  assert.equal(d.prepare("SELECT count(*) n FROM notifications").get().n, 1);
  assert.equal(d.prepare("SELECT recipient_id FROM notifications").get().recipient_id, "b");
  await chat.markCircleChatRead(db, 1, "b", first.message.id);
  assert.equal(d.prepare("SELECT read_at FROM notifications").get().read_at, null);
  await chat.markCircleChatRead(db, 1, "b", second.message.id);
  assert.ok(d.prepare("SELECT read_at FROM notifications").get().read_at);
  await chat.sendCircleMessage(db, 1, "a", msg("Terceira"));
  assert.equal(d.prepare("SELECT read_at FROM notifications").get().read_at, null);
  await assert.rejects(
    chat.markCircleChatRead(db, 1, "c", second.message.id),
    (e) => e.status === 403,
  );
  d.close();
});
test("membership is enforced again by the insert if access changes between authorization and persistence", async () => {
  const { d, db } = setup();
  const original = db.prepare.bind(db);
  db.prepare = (sql) => {
    if (sql.startsWith("INSERT INTO circle_messages"))
      d.exec("UPDATE circle_members SET status='left' WHERE circle_id=1 AND user_id='a'");
    return original(sql);
  };
  await assert.rejects(chat.sendCircleMessage(db, 1, "a", msg()), (e) => e.status === 403);
  assert.equal(d.prepare("SELECT count(*) n FROM circle_messages").get().n, 0);
  d.close();
});

test("owner-paused and deleted circles reject writes and deleted circles hide history", async () => {
  const { d, db } = setup();
  await chat.sendCircleMessage(db, 1, "a", msg());
  d.exec("UPDATE circles SET chat_enabled=0 WHERE id=1");
  assert.equal((await chat.readCircleChat(db, 1, "b")).readOnly, true);
  await assert.rejects(chat.sendCircleMessage(db, 1, "a", msg()), (e) => e.status === 409);
  d.exec("UPDATE circles SET deleted_at=CURRENT_TIMESTAMP WHERE id=1");
  await assert.rejects(chat.readCircleChat(db, 1, "a"), (e) => e.status === 403);
  d.close();
});
