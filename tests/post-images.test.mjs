import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { transformWithEsbuild } from "vite";
test("post images require confirmation, reserve quota atomically and never duplicate a paid request", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES ('tester')");
  db.exec(
    await readFile(
      new URL("../tests/fixtures/sqlite-migrations/0022_post_images.sql", import.meta.url),
      "utf8",
    ),
  );
  let calls = 0;
  const DB = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              return { results: db.prepare(sql).all(...args) };
            },
            async first() {
              return db.prepare(sql).get(...args) || null;
            },
            async run() {
              const result = db.prepare(sql).run(...args);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
  globalThis.__imageTest = {
    env: { BUCKET: { put: async () => {} }, DB },
    auth: async () => ({ user: { id: "tester" } }),
    createImage: async () => {
      calls++;
      return { ok: true, bytes: new TextEncoder().encode("test image"), mediaType: "image/webp" };
    },
  };
  try {
    let source = await readFile(
      new URL("../app/api/post-images/route.ts", import.meta.url),
      "utf8",
    );
    source = source
      .replace(
        /import \{ env \} from ["'][./]*\/lib\/env["'];/,
        "const env=globalThis.__imageTest.env;",
      )
      .replace(
        /import \{ createImage \} from ["']\.\.\/\.\.\/\.\.\/lib\/ai["'];/,
        "const createImage=globalThis.__imageTest.createImage;",
      )
      .replace(
        /import \{ requirePracaUser \} from ["']\.\.\/\.\.\/\.\.\/lib\/praca-auth["'];/,
        "const requirePracaUser=globalThis.__imageTest.auth;",
      );
    const { code } = await transformWithEsbuild(source, "route.ts", {
      loader: "ts",
      target: "esnext",
    });
    const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    const run = (payload) =>
      api.POST(
        new Request("http://test/api/post-images", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    const payload = {
      confirmed: true,
      prompt: "A symbolic tree with deep roots in a Brazilian forest",
      requestId: crypto.randomUUID(),
    };
    assert.equal((await run({ ...payload, confirmed: false })).status, 400);
    assert.equal((await run({ ...payload, prompt: " " })).status, 400);
    assert.equal(calls, 0);
    assert.equal((await run(payload)).status, 200);
    assert.equal((await run(payload)).status, 200);
    assert.equal(calls, 1);
    await Promise.all([
      run({ ...payload, requestId: crypto.randomUUID() }),
      run({ ...payload, requestId: crypto.randomUUID() }),
      run({ ...payload, requestId: crypto.randomUUID() }),
    ]);
    assert.equal(calls, 3);
    assert.equal(db.prepare("SELECT count(*) n FROM post_images").get().n, 3);
    assert.equal((await run({ ...payload, requestId: crypto.randomUUID() })).status, 429);
  } finally {
    delete globalThis.__imageTest;
    db.close();
  }
});
