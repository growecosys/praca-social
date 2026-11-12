import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
const { code } = await transformWithEsbuild(
  await readFile("lib/block-order.ts", "utf8"),
  "order.ts",
  { loader: "ts", target: "esnext" },
);
const { reorderBlock, blockDropIndex } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
test("reordering works in both directions and at boundaries without losing identities, text, media or mentions", () => {
  const a = { id: "a", text: "[@ana](/u/ana)", inlineFormat: "markdown" },
    b = { id: "b", url: "/media/photo" },
    c = { id: "c", text: "Fim" },
    items = [a, b, c];
  const down = reorderBlock(items, "a", 2);
  assert.deepEqual(down, [b, c, a]);
  assert.equal(down[2], a);
  assert.deepEqual(items, [a, b, c]);
  assert.deepEqual(reorderBlock(items, "c", 0), [c, a, b]);
  assert.deepEqual(reorderBlock(items, "a", 1), [b, a, c]);
  assert.deepEqual(reorderBlock(items, "b", 999), [a, c, b]);
  assert.equal(reorderBlock(items, "missing", 1), items);
  assert.equal(reorderBlock(items, "a", -4), items);
  assert.equal(reorderBlock(items, "a", NaN), items);
  assert.deepEqual(JSON.parse(JSON.stringify(down)), [b, c, a]);
});
test("pointer drop positions cover first, middle and last slots, including long blocks", () => {
  const rects = [
    { top: 100, bottom: 300 },
    { top: 320, bottom: 1200 },
  ];
  assert.equal(blockDropIndex(rects, 0), 0);
  assert.equal(blockDropIndex(rects, 210), 1);
  assert.equal(blockDropIndex(rects, 700), 1);
  assert.equal(blockDropIndex(rects, 1300), 2);
  assert.equal(blockDropIndex([], 200), 0);
});
