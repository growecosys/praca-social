import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
async function moduleUrl(file, replacements = {}) {
  let s = (
    await transformWithEsbuild(await readFile(file, "utf8"), file, {
      loader: "ts",
      target: "esnext",
    })
  ).code;
  for (const [a, b] of Object.entries(replacements))
    s = s.replaceAll(JSON.stringify(a), JSON.stringify(b));
  return "data:text/javascript;base64," + Buffer.from(s).toString("base64");
}
const rulesUrl = await moduleUrl("lib/rpg.ts"),
  r = await import(rulesUrl),
  store = await import(await moduleUrl("lib/rpg-store.ts", { "./rpg": rulesUrl }));
function setup() {
  const d = new DatabaseSync(":memory:");
  d.exec(
    "PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,deleted_at TEXT);INSERT INTO users VALUES('a',NULL),('b',NULL),('gone','2026');",
  );
  for (const file of ["0032_oval_raider.sql", "0033_soft_skreet.sql"]) d.exec(requireSql[file]);
  const db = {
    prepare(sql) {
      const make = (args = []) => ({
        sql,
        args,
        bind: (...a) => make(a),
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
      return make();
    },
    async batch(queries) {
      d.exec("BEGIN");
      try {
        const results = queries.map((q) => ({
          meta: { changes: Number(d.prepare(q.sql).run(...q.args).changes) },
        }));
        d.exec("COMMIT");
        return results;
      } catch (e) {
        d.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, d };
}
const requireSql = {};
for (const f of ["0032_oval_raider.sql", "0033_soft_skreet.sql"])
  requireSql[f] = await readFile("drizzle/" + f, "utf8");
function proposed(s, id) {
  const a = r.available(s).find((a) => a.id === id);
  assert.ok(a);
  return store.attachProposal(
    s,
    "Minha intenção",
    { id: crypto.randomUUID(), action: id, intent: "Minha intenção", text: "Teste" },
    "Teste",
  );
}
function roll(s, id, dice = [1, 1], focus = false) {
  const n = proposed(s, id);
  return r.resolve(n, n.pending.id, dice, focus);
}
test("talents have a fixed budget, reject arbitrary skills, and copy the role", () => {
  for (const k of r.skillKeys) {
    const s = r.initialRpg("Auditor de Complexidade", k);
    assert.equal(s.skills[k], 2);
    assert.equal(
      Object.values(s.skills).reduce((a, b) => a + b),
      4,
    );
    assert.equal(s.role, "Auditor de Complexidade");
  }
  assert.throws(() => r.initialRpg("x", "hacker"));
});
test("every talent and all three endings remain playable with minimum dice, without real-world activities or AI", () => {
  for (const k of r.skillKeys)
    for (const ending of ["restore", "pact", "shelter"]) {
      let s = r.initialRpg("Teste", k);
      assert.equal(
        r.available(s).some((a) => a.final),
        false,
      );
      while (s.clues.length < 2) s = roll(s, r.available(s).find((a) => !a.final).id);
      s = roll(s, ending);
      assert.equal(s.ended, true);
      assert.equal(s.ending, ending);
      assert.equal(s.xp, 30);
      assert.equal(r.available(s).length, 0);
      assert.throws(() => roll(s, "archive"));
    }
});
test("pressure removes investigations, preserves endings, and clues and growth cannot be farmed", () => {
  let s = r.initialRpg("x", "explorar");
  for (const id of ["archive", "keeper", "neighbors"]) {
    s = roll(s, id);
    assert.equal(s.clues.length, new Set(s.clues).size);
  }
  assert.equal(s.pressure, 6);
  assert.ok(r.available(s).every((a) => a.final));
  assert.throws(() => proposed(s, "archive"));
});
test("focus is optional, matches its skill and is consumed once; preparation and practice have distinct bounded effects", () => {
  let s = r.initialRpg("x", "investigar");
  s = r.recordActivity(
    s,
    "fontes",
    "inside",
    "Uma reflexão concreta sobre as duas versões desta história e o que permanece desconhecido por enquanto.",
  );
  assert.equal(s.boon, "investigar");
  assert.equal(s.growth.investigar, 1);
  const a = r.ACTIONS.find((a) => a.id === "archive");
  assert.equal(r.bonus(s, a, true), 4);
  s = roll(s, "archive", [3, 3], true);
  assert.equal(s.lastRoll.total, 10);
  assert.equal(s.focus, false);
  assert.equal(s.boon, null);
  assert.equal(s.growth.investigar, 2);
  assert.equal(r.bonus(s, a), 3);
  assert.throws(() => r.recordActivity(s, "fontes", "inside", "a".repeat(90)));
  const n = proposed(s, "follow");
  assert.throws(() => r.resolve(n, n.pending.id, [2, 2], true));
  assert.throws(() => r.resolve(n, n.pending.id, [0, 8]));
});
test("real and fictional activities grant equal effects and do not grant general XP or unbounded preparation", () => {
  const s = r.initialRpg("x", "cuidar"),
    note =
      "Um relato específico de observação e cuidado, com uma ação concreta para ampliar o acesso à feira.";
  const a = r.recordActivity(s, "cuidado", "inside", note),
    b = r.recordActivity(s, "cuidado", "real", note);
  assert.deepEqual(a.growth, b.growth);
  assert.equal(a.boon, b.boon);
  assert.equal(a.xp, 0);
  assert.throws(() => r.recordActivity(a, "entorno", "real", note));
  assert.throws(() => r.recordActivity(s, "cuidado", "real", "curto"));
  assert.throws(() => r.recordActivity(proposed(s, "keeper"), "cuidado", "real", note));
});
test("private entries never appear in the public character projection", () => {
  const s = r.initialRpg("x", "explorar");
  s.journal.push({ who: "jogador", text: "PRIVATE STORY" });
  assert.ok(!JSON.stringify(r.publicRpg(s)).includes("PRIVATE"));
  assert.equal(r.publicRpg(s).journal, undefined);
});
test("state belongs to its account, start is idempotent, deleted accounts cannot mutate", async () => {
  const { db, d } = setup();
  await store.startRpg(db, "a", "Primeiro", "inventar");
  await store.startRpg(db, "a", "Outro", "cuidar");
  assert.equal((await store.readRpg(db, "a")).state.role, "Primeiro");
  assert.equal(await store.readRpg(db, "b"), null);
  await assert.rejects(store.startRpg(db, "gone", "x", "cuidar"), (e) => e.status === 401);
  await assert.rejects(
    store.mutateRpg(db, "b", { op: "suggestion", revision: 0, action: "archive" }),
    (e) => e.status === 404,
  );
  d.close();
});
test("optimistic updates reject duplicate and concurrent rolls; profile milestones grant XP once", async () => {
  const { db, d } = setup();
  await store.startRpg(db, "a", "x", "inventar");
  let row = await store.mutateRpg(db, "a", { op: "suggestion", revision: 0, action: "archive" });
  const p = { op: "roll", revision: row.revision, id: row.state.pending.id };
  const results = await Promise.allSettled([
    store.mutateRpg(db, "a", p, [1, 1]),
    store.mutateRpg(db, "a", p, [6, 6]),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  row = await store.readRpg(db, "a");
  assert.equal(row.state.turn, 1);
  assert.equal(d.prepare("SELECT sum(xp) n FROM game_achievements WHERE user_id='a'").get().n, 5);
  for (const action of ["follow", "restore"]) {
    row = await store.mutateRpg(db, "a", { op: "suggestion", action, revision: row.revision });
    row = await store.mutateRpg(
      db,
      "a",
      { op: "roll", revision: row.revision, id: row.state.pending.id },
      [2, 3],
    );
  }
  assert.equal(row.state.ended, true);
  assert.equal(d.prepare("SELECT sum(xp) n FROM game_achievements WHERE user_id='a'").get().n, 25);
  await assert.rejects(
    store.mutateRpg(db, "a", { op: "roll", revision: row.revision, id: p.id }, [6, 6]),
  );
  assert.equal(d.prepare("SELECT count(*) n FROM game_achievements").get().n, 2);
  d.close();
});
test("daily AI reservations are atomic and capped at 30 even under concurrent requests", async () => {
  const { db, d } = setup();
  const result = await Promise.allSettled(
    Array.from({ length: 35 }, () => store.reserveRpgCall(db, "a", "2026-11-06")),
  );
  assert.equal(result.filter((x) => x.status === "fulfilled").length, 30);
  assert.equal(result.filter((x) => x.status === "rejected" && x.reason.status === 429).length, 5);
  assert.equal(await store.reserveRpgCall(db, "a", "2026-11-07"), 29);
  assert.equal(await store.reserveRpgCall(db, "b", "2026-11-06"), 29);
  d.close();
});
test("AI proposals cannot select absent actions, resolve outcomes or overwrite a newer scene", async () => {
  const { db, d } = setup();
  const row = await store.startRpg(db, "a", "x", "cuidar");
  assert.throws(() => proposed(row.state, "restore"));
  assert.throws(() =>
    store.attachProposal(
      row.state,
      "x",
      { id: "x", action: "grant-xp", intent: "x", text: "x" },
      "x",
    ),
  );
  const s = store.attachProposal(row.state, "Pergunta", null, "Uma fala sem resultado mecânico.");
  assert.equal(s.xp, 0);
  assert.equal(s.clues.length, 0);
  await store.saveRpg(db, "a", 0, s);
  await assert.rejects(store.saveRpg(db, "a", 0, s), (e) => e.status === 409);
  assert.equal(d.prepare("SELECT count(*) n FROM game_achievements").get().n, 0);
  d.close();
});
test("an unusable preparation can be discarded without repeating the activity reward", async () => {
  const { db, d } = setup();
  let row = await store.startRpg(db, "a", "x", "investigar");
  row = await store.mutateRpg(db, "a", {
    op: "activity",
    activity: "fontes",
    mode: "inside",
    note: "Uma reflexão suficientemente detalhada sobre as versões da história e as evidências que ainda estão faltando.",
    revision: row.revision,
  });
  assert.equal(row.state.boon, "investigar");
  row = await store.mutateRpg(db, "a", { op: "discard", revision: row.revision });
  assert.equal(row.state.boon, null);
  assert.equal(row.state.growth.investigar, 1);
  await assert.rejects(
    store.mutateRpg(db, "a", {
      op: "activity",
      activity: "fontes",
      mode: "inside",
      note: "a".repeat(90),
      revision: row.revision,
    }),
    (e) => e.status === 409,
  );
  d.close();
});
