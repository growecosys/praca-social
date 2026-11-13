import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
const { code } = await transformWithEsbuild(
  await readFile(new URL("../lib/nature-rotation.ts", import.meta.url), "utf8"),
  "nature-rotation.ts",
  { loader: "ts", target: "esnext" },
);
const { natureCandidates, rotateNature, natureScale } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const catalog = JSON.parse(
  await readFile(new URL("../lib/common-asset-catalog.json", import.meta.url), "utf8"),
);
const pool = [
  ...catalog,
  ...[
    "ipe-amarelo",
    "jabuticaba",
    "lobo-guara",
    "mico-leao-dourado",
    "tucano-caju",
    "beija-flor-heliconia",
    "borboleta-bromelia",
    "vitoria-regia-jacana",
  ].map((id) => ({ id })),
];
test("all visual assets are eligible somewhere; grass is a separate supporting habitat", () => {
  const usable = new Set(
    ["background", "waterline", "visitor"].flatMap((role) =>
      natureCandidates(pool, role, "/mural").map((a) => a.id),
    ),
  );
  for (const a of pool) assert.equal(usable.has(a.id), a.id !== "acervo-capim", a.id);
  assert.equal(natureCandidates(pool, "visitor", "/", "title").length, 0);
  assert.equal(natureCandidates(pool, "visitor", "/perfil", "header").length, 0);
  assert.equal(natureCandidates(pool, "visitor", "/conexoes", "map").length, 0);
  assert.equal(natureCandidates(pool, "visitor", "/conexoes", "title").length, 0);
  assert.deepEqual(
    natureCandidates(pool, "background", "/conexoes")
      .map((a) => a.id)
      .sort(),
    [
      "ipe-amarelo",
      "jabuticaba",
      "acervo-vitoria-regia",
      "acervo-heliconia",
      "acervo-bromelia",
    ].sort(),
  );
  assert.equal(natureCandidates(pool, "visitor", "/placar", "title").length, 0);
  assert.equal(natureCandidates(pool, "visitor", "/escrever", "header").length, 3);
  assert.equal(natureScale("ipe-amarelo", "hero").opacity, 1);
  assert.equal(natureScale("acervo-vitoria-regia", "waterline").opacity, 1);
  assert.equal(natureCandidates(pool, "hero", "/").length, 5);
});
test("rotation avoids the previous image and duplicates but works with a single remaining asset", () => {
  const candidates = natureCandidates(pool, "background", "/perfil");
  const first = rotateNature(candidates, "", [], () => 0);
  const next = rotateNature(candidates, first.id, [], () => 0);
  assert.notEqual(first.id, next.id);
  assert.notEqual(rotateNature(candidates, "", [first.id], () => 0).id, first.id);
  assert.equal(rotateNature([first], first.id, [], () => 0).id, first.id);
  assert.equal(rotateNature([], "", []), undefined);
  assert.ok(
    natureScale("acervo-borboleta", "visitor").width < natureScale("lobo-guara", "visitor").width,
  );
  assert.ok(
    natureScale("ipe-amarelo", "background").width > natureScale("lobo-guara", "visitor").width * 3,
  );
  assert.ok(natureScale("ipe-amarelo", "background").opacity < 1);
});
