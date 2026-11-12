import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
test("upload optimizes a 2.75 MB photo and handles non-JSON errors", async () => {
  const { code } = await transformWithEsbuild(
    await readFile(new URL("../lib/image-upload.ts", import.meta.url), "utf8"),
    "image-upload.ts",
    { loader: "ts", target: "esnext" },
  );
  const { prepareImage, readImageResponse, MAX_UPLOAD_BYTES } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
  await assert.rejects(
    readImageResponse(new Response("Payload Too Large", { status: 413 })),
    /limite de envio/,
  );
  await assert.rejects(readImageResponse(new Response("Bad Gateway", { status: 502 })), /servidor/);
  await assert.rejects(prepareImage(new File(["text"], "file.txt", { type: "text/plain" })), /JPG/);
  const small = new File(["image"], "small.png", { type: "image/png" });
  assert.equal(await prepareImage(small), small);
  const oldImage = globalThis.Image,
    oldDocument = globalThis.document;
  globalThis.Image = class {
    naturalWidth = 4000;
    naturalHeight = 3000;
    async decode() {}
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return { drawImage() {} };
    },
    toBlob(cb) {
      cb(new Blob([new Uint8Array(200000)], { type: "image/webp" }));
    },
  };
  globalThis.document = {
    createElement() {
      return canvas;
    },
  };
  try {
    const optimized = await prepareImage(
      new File([new Uint8Array(2746503)], "photo.jpg", { type: "image/jpeg" }),
    );
    assert.ok(optimized.size <= MAX_UPLOAD_BYTES);
    assert.equal(optimized.type, "image/webp");
    assert.equal(canvas.width, 2048);
    assert.equal(canvas.height, 1536);
  } finally {
    globalThis.Image = oldImage;
    globalThis.document = oldDocument;
  }
});
