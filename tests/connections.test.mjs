import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
async function module(file, replace = (s) => s, suffix = "") {
  const source = replace(await readFile(new URL("../" + file, import.meta.url), "utf8"));
  const { code } = await transformWithEsbuild(source, file, { loader: "ts", target: "esnext" });
  return import(
    "data:text/javascript;base64," + Buffer.from(code + "\n//" + suffix).toString("base64")
  );
}
test("connection strength counts attended days, never repeated pokes or manual archives", async () => {
  const { connectionEdges } = await module("lib/connection-strength.ts");
  const pair = [{ userA: "a", userB: "b" }];
  const interaction = (id, status, day, kind = "thread") => ({
    id,
    senderId: "a",
    recipientId: "b",
    status,
    kind,
    createdAt: `2026-10-${day} 10:00:00`,
  });
  const items = [
    interaction(1, "completed", "01"),
    interaction(2, "completed", "01"),
    interaction(3, "archived", "02"),
    interaction(4, "pending", "03"),
    interaction(5, "attended", "04", "mystery"),
  ];
  assert.equal(connectionEdges(pair, items, [])[0].level, 1);
  const response = [{ entityId: "3", metadataJson: '{"userAction":"attend"}' }];
  assert.deepEqual(connectionEdges(pair, items, response)[0], {
    a: "a",
    b: "b",
    days: 2,
    level: 2,
  });
  assert.equal(
    connectionEdges(
      pair,
      [...items, ...["05", "06", "07"].map((day, i) => interaction(6 + i, "completed", day))],
      response,
    )[0].level,
    3,
  );
  assert.equal(connectionEdges(pair, [], [])[0].level, 1);
});
