import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
const { code } = await transformWithEsbuild(
  await readFile("lib/circle-work.ts", "utf8"),
  "work.ts",
  { loader: "ts", target: "esnext" },
);
const work = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
function setup() {
  const d = new DatabaseSync(":memory:");
  d.exec(
    `PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,deleted_at TEXT);INSERT INTO users VALUES('a',NULL),('b',NULL),('c',NULL),('x',NULL);CREATE TABLE circles(id INTEGER PRIMARY KEY,owner_id TEXT,name TEXT,status TEXT);INSERT INTO circles VALUES(1,'a','Um','active'),(2,'x','Dois','active');CREATE TABLE circle_members(circle_id INTEGER,user_id TEXT,status TEXT);INSERT INTO circle_members VALUES(1,'a','active'),(1,'b','active'),(1,'c','invited'),(2,'x','active');CREATE TABLE activity_events(user_id TEXT,action TEXT,entity_type TEXT,entity_id TEXT,metadata_json TEXT);`,
  );
  d.exec(requireSQL);
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
  return { d, db, act: (uid, p) => work.mutateCircleWork(db, 1, uid, p) };
}
const requireSQL = await readFile("drizzle/0030_first_polaris.sql", "utf8");
const cycle = {
  action: "cycle",
  name: "Ciclo um",
  goal: "Missão",
  start: "2026-11-01",
  end: "2026-11-30",
};
const proposal = {
  action: "proposal",
  cycleId: 1,
  title: "Entrega",
  role: "Criação",
  scope: "Uma página",
  criteria: "Página publicada",
  terms: "Após aceite",
  amount: "100,01",
  due: "2026-11-20",
  assigneeId: "b",
  reviewerId: "a",
};
const fund = {
  action: "fund",
  cycleId: 1,
  name: "Doação",
  note: "Autorizada para o ciclo",
  amount: "200",
};
const payment = (amount = "50") => ({
  action: "payment",
  agreementId: 1,
  fundId: 1,
  amount,
  clientId: crypto.randomUUID(),
  date: "2026-11-06",
  note: "Referência de teste",
});
async function accepted(act) {
  await act("a", cycle);
  await act("b", proposal);
  await act("a", { action: "approve", id: 1 });
  await act("b", { action: "agree", id: 1 });
  await act("b", { action: "deliver", id: 1, evidence: "https://example.org/entrega" });
  await act("a", { action: "accept", id: 1 });
}
test("money stays in integer cents and rejects negative, precision loss and malformed values", () => {
  assert.equal(work.money("100,01"), 10001);
  assert.equal(work.money("0"), 0);
  for (const s of ["-1", "1.001", "NaN", "1e5", "", "1.000,00"]) assert.throws(() => work.money(s));
});
test("circle work is private to active members and cannot leak another circle", async () => {
  const { d, db, act } = setup();
  for (const u of ["c", "x"]) {
    await assert.rejects(work.readCircleWork(db, 1, u), (e) => e.status === 403);
    await assert.rejects(act(u, cycle), (e) => e.status === 403);
  }
  await assert.rejects(act("b", cycle), (e) => e.status === 403);
  await act("a", cycle);
  await assert.rejects(act("b", { ...proposal, cycleId: 2 }), (e) => e.status === 404);
  d.close();
});
test("separate approval, responsible consent, evidence and reviewer acceptance; approved scope is immutable", async () => {
  const { d, act } = setup();
  await act("a", cycle);
  await act("b", proposal);
  await assert.rejects(act("b", { action: "approve", id: 1 }), (e) => e.status === 403);
  await act("a", { action: "approve", id: 1 });
  await assert.rejects(
    act("b", { ...proposal, action: "edit_proposal", id: 1 }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    act("b", { action: "deliver", id: 1, evidence: "ok" }),
    (e) => e.status === 403,
  );
  await act("b", { action: "agree", id: 1 });
  await assert.rejects(act("b", { action: "deliver", id: 1, evidence: " " }));
  await act("b", { action: "deliver", id: 1, evidence: "prova" });
  await assert.rejects(act("b", { action: "accept", id: 1 }), (e) => e.status === 403);
  await act("a", { action: "accept", id: 1 });
  await assert.rejects(act("a", { action: "cancel", id: 1 }), (e) => e.status === 409);
  assert.equal(d.prepare("SELECT status FROM circle_agreements").get().status, "accepted");
  d.close();
});
test("payments require accepted delivery and confirmed source, prevent overspending and are idempotent", async () => {
  const { d, act } = setup();
  await accepted(act);
  await act("a", fund);
  await assert.rejects(act("a", payment()), (e) => e.status === 409);
  await act("a", { action: "confirm_fund", id: 1 });
  const p = payment();
  await Promise.all([act("a", p), act("a", p)]);
  assert.equal(d.prepare("SELECT count(*) n FROM circle_payments").get().n, 1);
  await assert.rejects(act("a", { ...p, amount: "51" }), (e) => e.status === 409);
  await assert.rejects(act("b", payment()), (e) => e.status === 403);
  await assert.rejects(act("a", payment("50.02")), (e) => e.status === 409);
  await act("a", payment("50.01"));
  assert.equal(d.prepare("SELECT sum(amount) n FROM circle_payments").get().n, 10001);
  d.close();
});
test("the source balance is checked across agreements and across concurrent requests", async () => {
  const { d, act } = setup();
  await accepted(act);
  await act("b", { ...proposal, amount: "150" });
  await act("a", { action: "approve", id: 2 });
  await act("b", { action: "agree", id: 2 });
  await act("b", { action: "deliver", id: 2, evidence: "prova" });
  await act("a", { action: "accept", id: 2 });
  await act("a", { ...fund, amount: "100" });
  await act("a", { action: "confirm_fund", id: 1 });
  const results = await Promise.allSettled([
    act("a", payment("80")),
    act("a", { ...payment("80"), agreementId: 2 }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(d.prepare("SELECT sum(amount) n FROM circle_payments").get().n, 8000);
  d.close();
});
test("voids preserve history, restore balances, and deleted or archived circles reject changes", async () => {
  const { d, db, act } = setup();
  await accepted(act);
  await act("a", fund);
  await act("a", { action: "confirm_fund", id: 1 });
  const p = payment();
  await act("a", p);
  await assert.rejects(act("a", { action: "void_payment", id: p.clientId, reason: "" }));
  await act("a", { action: "void_payment", id: p.clientId, reason: "Lançamento incorreto" });
  assert.ok(d.prepare("SELECT voided_at FROM circle_payments").get().voided_at);
  await act("a", payment("100.01"));
  d.exec("UPDATE circles SET status='archived' WHERE id=1");
  await assert.rejects(act("a", cycle), (e) => e.status === 409);
  d.exec("UPDATE circles SET status='active',deleted_at=CURRENT_TIMESTAMP WHERE id=1");
  await assert.rejects(work.readCircleWork(db, 1, "a"), (e) => e.status === 403);
  await assert.rejects(act("a", cycle), (e) => e.status === 403);
  d.close();
});
test("closed cycles cannot receive proposals or payments and cannot close with outstanding commitments", async () => {
  const { d, act } = setup();
  await accepted(act);
  await assert.rejects(act("a", { action: "cycle_status", cycleId: 1, status: "closed" }));
  await act("a", fund);
  await act("a", { action: "confirm_fund", id: 1 });
  await act("a", payment("100.01"));
  await act("a", { action: "cycle_status", cycleId: 1, status: "closed" });
  await assert.rejects(act("b", proposal), (e) => e.status === 409);
  await assert.rejects(act("a", payment("0.01")), (e) => e.status === 409);
  d.close();
});
test("reassignment preserves scope and amount but requires fresh consent; fund corrections cannot undercut existing payments", async () => {
  const { d, act } = setup();
  await act("a", cycle);
  await act("b", proposal);
  await act("a", { action: "approve", id: 1 });
  await act("b", { action: "agree", id: 1 });
  await act("a", { action: "reassign", id: 1, assigneeId: "a", reviewerId: "b" });
  const a = d.prepare("SELECT * FROM circle_agreements").get();
  assert.equal(a.agreed_at, null);
  assert.equal(a.amount, 10001);
  assert.equal(a.scope, "Uma página");
  await assert.rejects(
    act("a", { action: "deliver", id: 1, evidence: "prova" }),
    (e) => e.status === 403,
  );
  await act("a", { action: "agree", id: 1 });
  await act("a", { action: "deliver", id: 1, evidence: "prova" });
  await act("b", { action: "accept", id: 1 });
  await act("a", fund);
  await act("a", { action: "confirm_fund", id: 1 });
  await act("a", payment("50"));
  await assert.rejects(
    act("a", { action: "edit_fund", id: 1, name: "Corrigida", amount: "49.99", note: "Correção" }),
    (e) => e.status === 409,
  );
  await act("a", {
    action: "edit_fund",
    id: 1,
    name: "Corrigida",
    amount: "75",
    note: "Correção do total",
  });
  assert.equal(d.prepare("SELECT amount FROM circle_funds").get().amount, 7500);
  d.close();
});
