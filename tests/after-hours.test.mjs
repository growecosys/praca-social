import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
async function moduleCode(file) {
  return (
    await transformWithEsbuild(await readFile(file, "utf8"), file, {
      loader: "ts",
      target: "esnext",
    })
  ).code;
}
const ruleURL =
  "data:text/javascript;base64," +
  Buffer.from(await moduleCode("lib/after-hours.ts")).toString("base64");
const game = await import(ruleURL);
const storage = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      (await moduleCode("lib/after-hours-store.ts")).replaceAll(
        '"./after-hours"',
        JSON.stringify(ruleURL),
      ),
    ).toString("base64")
);
const boat = { hull: "bottles", drive: "sail", cells: 0, trim: 2 };
const craft = { action: "craft", name: "Teste de campo", design: boat };
const step = (s, p) => game.applyGameAction(s, p, 1000000);
function setup() {
  const d = new DatabaseSync(":memory:");
  d.exec(
    "PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,deleted_at TEXT);INSERT INTO users VALUES ('a',NULL),('b',NULL),('gone','2026-01-01');",
  );
  d.exec(migration);
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
const migration = await readFile("drizzle/0031_absent_sebastian_shaw.sql", "utf8");
test("projects have valid discrete parts, consume materials once, and dismantling recovers the same pieces", () => {
  const original = game.initialGame(),
    s = step(original, craft);
  assert.equal(original.crafts.length, 0);
  assert.equal(s.crafts.length, 1);
  assert.equal(s.materials.bottles, 1);
  assert.equal(s.materials.cloth, 0);
  assert.equal(s.equippedId, s.crafts[0].id);
  assert.deepEqual(
    step(s, { action: "dismantle", id: s.crafts[0].id }).materials,
    original.materials,
  );
  for (const d of [
    { ...boat, cells: -1 },
    { ...boat, trim: 2.2 },
    { ...boat, drive: "jet" },
    { ...boat, drive: "propeller", cells: 0 },
  ])
    assert.throws(() => step(original, { ...craft, design: d }), game.GameError);
  assert.throws(
    () => step(original, { ...craft, design: { ...boat, cells: 3 } }),
    /Faltam materiais/,
  );
});
test("free prototype results react to wind, balance and battery weight", () => {
  assert.equal(game.boatStats(boat, 0).success, true);
  assert.equal(game.boatStats(boat, 2).success, false);
  assert.equal(game.boatStats({ ...boat, drive: "propeller", cells: 1 }, 2).success, true);
  assert.equal(game.boatStats({ ...boat, trim: 0 }, 1).success, false);
  assert.ok(game.boatStats({ ...boat, cells: 3 }).capacity < game.boatStats(boat).capacity);
});
test("routes cannot teleport and both island approaches enforce the equipment gate", () => {
  let s = step(game.initialGame(), { action: "start" });
  assert.throws(() => step(s, { action: "move", to: "station" }), /caminho/);
  s = step(s, { action: "move", to: "grove" });
  s = step(s, { action: "move", to: "greenhouse" });
  s = step(s, { action: "move", to: "wheel" });
  assert.throws(() => step(s, { action: "move", to: "island" }), /embarcação/);
  assert.throws(() => step(s, craft), /Encerre/);
});
test("backpacks are bounded, gathering is once per location per trip, and camp deposits full contents", () => {
  let s = step(game.initialGame(), { action: "start" });
  s = step(s, { action: "move", to: "scrap" });
  s = step(s, { action: "gather" });
  assert.equal(game.stockCount(s.run.bag), 6);
  assert.throws(() => step(s, { action: "gather" }), /já recolheu/);
  s = step(s, { action: "move", to: "camp" });
  const before = s.materials.bottles;
  s = step(s, { action: "return" });
  assert.equal(s.run, null);
  assert.equal(s.materials.bottles, before + 3);
  s = step(s, { action: "start" });
  s = step(s, { action: "move", to: "grove" });
  s = step(s, { action: "gather" });
  s = step(s, { action: "move", to: "jetty" });
  s = step(s, { action: "gather" });
  s = step(s, { action: "move", to: "scrap" });
  s = step(s, { action: "gather" });
  assert.ok(game.stockCount(s.run.bag) <= 10);
});
test("wrong mechanisms cost effort; rescue never loses discoveries and confirms the reduced material recovery", () => {
  let s = step(game.initialGame(), { action: "start" });
  s = step(s, { action: "move", to: "grove" });
  s = step(s, { action: "gather" });
  s = step(s, { action: "move", to: "greenhouse" });
  const moves = s.run.moves;
  s = step(s, { action: "puzzle", answer: [0, 0, 0] });
  assert.equal(s.run.moves, moves - 1);
  s = step(s, { action: "puzzle", answer: [2, 2, 0] });
  assert.ok(s.discoveries.includes("lens"));
  assert.throws(() => step(s, { action: "return" }), /Confirme/);
  const before = s.materials.wood;
  s = step(s, { action: "return", confirm: true });
  assert.ok(s.discoveries.includes("lens"));
  assert.equal(s.materials.wood, before + 1);
  assert.equal(s.run, null);
});
test("the first adventure can be completed and returned from using only the initial kit", () => {
  let s = step(game.initialGame(), craft);
  s = step(s, { action: "start" });
  const move = (id) => {
      s = step(s, { action: "move", to: id });
    },
    puzzle = (answer) => {
      s = step(s, { action: "puzzle", answer });
    };
  move("grove");
  move("greenhouse");
  puzzle([2, 2, 0]);
  move("wheel");
  puzzle("slow-fast-slow");
  move("station");
  assert.throws(
    () => step(s, { action: "puzzle", answer: ["lens", "dial", "coil"] }),
    /faltam peças/,
  );
  move("wheel");
  move("island");
  puzzle(["leaf", "wave", "sun"]);
  move("wheel");
  move("station");
  puzzle(["lens", "dial", "coil"]);
  assert.equal(s.completed, true);
  move("wheel");
  move("greenhouse");
  move("grove");
  move("camp");
  s = step(s, { action: "return" });
  assert.equal(s.run, null);
  assert.deepEqual(new Set(s.discoveries), new Set(["lens", "coil", "dial", "station"]));
});
test("saved progress is user-specific; deleted accounts and unknown accounts have no access", async () => {
  const { d, db } = setup();
  await storage.readGame(db, "a");
  const b = await storage.readGame(db, "b");
  assert.equal(b.state.expeditions, 0);
  await storage.mutateGame(db, "a", {
    revision: 0,
    clientId: crypto.randomUUID(),
    command: { action: "start" },
  });
  assert.equal((await storage.readGame(db, "b")).state.expeditions, 0);
  for (const user of ["gone", "unknown"])
    await assert.rejects(storage.readGame(db, user), (e) => e.status === 401);
  d.close();
});
test("concurrent actions and retries cannot duplicate fabrication or spend the same material twice", async () => {
  const { d, db } = setup();
  await storage.readGame(db, "a");
  const p = { revision: 0, clientId: crypto.randomUUID(), command: craft };
  const [a, b] = await Promise.all([
    storage.mutateGame(db, "a", p),
    storage.mutateGame(db, "a", p),
  ]);
  assert.equal(a.state.crafts.length, 1);
  assert.equal(b.state.crafts.length, 1);
  assert.equal((await storage.readGame(db, "a")).revision, 1);
  await assert.rejects(
    storage.mutateGame(db, "a", { ...p, command: { action: "start" } }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    storage.mutateGame(db, "a", { ...p, clientId: crypto.randomUUID() }),
    (e) => e.status === 409,
  );
  d.close();
});
test("invalid actions leave stored progress unchanged and request identifiers are validated", async () => {
  const { d, db } = setup();
  await storage.readGame(db, "a");
  await assert.rejects(
    storage.mutateGame(db, "a", {
      revision: 0,
      clientId: crypto.randomUUID(),
      command: { action: "move", to: "station" },
    }),
  );
  await assert.rejects(
    storage.mutateGame(db, "a", { revision: 0, clientId: "bad", command: { action: "start" } }),
  );
  const result = await storage.readGame(db, "a");
  assert.equal(result.revision, 0);
  assert.equal(result.state.run, null);
  assert.ok(!("receipts" in result.state));
  d.close();
});
test("different simultaneous commands cannot overwrite each other; rate limits expire without losing progress", async () => {
  const { d, db } = setup();
  await storage.readGame(db, "a");
  const results = await Promise.allSettled([
    storage.mutateGame(
      db,
      "a",
      { revision: 0, clientId: crypto.randomUUID(), command: { action: "start" } },
      1000000,
    ),
    storage.mutateGame(
      db,
      "a",
      { revision: 0, clientId: crypto.randomUUID(), command: craft },
      1000000,
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  await storage.readGame(db, "b");
  let rev = 0;
  for (let i = 0; i < 60; i++) {
    await storage.mutateGame(
      db,
      "b",
      {
        revision: rev++,
        clientId: crypto.randomUUID(),
        command: { action: i % 2 === 0 ? "start" : "return" },
      },
      1000000,
    );
  }
  await assert.rejects(
    storage.mutateGame(
      db,
      "b",
      { revision: rev, clientId: crypto.randomUUID(), command: { action: "start" } },
      1000000,
    ),
    (e) => e.status === 429,
  );
  const later = await storage.mutateGame(
    db,
    "b",
    { revision: rev, clientId: crypto.randomUUID(), command: { action: "start" } },
    1061000,
  );
  assert.equal(later.state.expeditions, 31);
  d.close();
});
test("crossings enforce actual backpack weight and discarding restores access without losing discoveries", () => {
  let s = step(game.initialGame(), craft);
  s = step(s, { action: "start" });
  s = step(s, { action: "move", to: "scrap" });
  s = step(s, { action: "gather" });
  s = step(s, { action: "move", to: "jetty" });
  assert.throws(() => step(s, { action: "move", to: "island" }), /mochila/);
  s = step(s, { action: "drop", material: "bottles", amount: 1 });
  s = step(s, { action: "move", to: "island" });
  assert.equal(s.run.position, "island");
  assert.equal(game.stockCount(s.run.bag), 5);
});
