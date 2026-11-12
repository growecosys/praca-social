import assert from "node:assert/strict";
import test from "node:test";
import { transferObjects, verifyManifest } from "../scripts/transfer-r2-to-blob.mjs";

function fakes(objects) {
  const store = new Map();
  let uploads = 0;
  return {
    store,
    uploads: () => uploads,
    source: {
      async *list() {
        for (const key of Object.keys(objects)) yield { key };
      },
      async get(key) {
        return objects[key];
      },
    },
    destination: {
      async put(key, bytes) {
        uploads++;
        store.set(key, Buffer.from(bytes));
      },
      async read(key) {
        return store.get(key) ?? null;
      },
    },
  };
}

const objects = {
  "avatars/u1/a.png": {
    bytes: Buffer.from("avatar-one"),
    contentType: "image/png",
    uploaded: "2026-05-01T10:00:00.000Z",
    metadata: { ownerid: "u1" },
  },
  "b.webp": {
    bytes: Buffer.from("post-image"),
    contentType: "image/webp",
    uploaded: "2026-06-02T09:00:00.000Z",
  },
};

test("transfer keeps keys, records original timestamps and owners, and resumes without re-uploading", async () => {
  const { source, destination, store, uploads } = fakes(objects);
  const manifest = new Map();
  const written = [];
  const first = await transferObjects({
    source,
    destination,
    manifest,
    record: (e) => written.push(e),
  });
  assert.deepEqual([first.copied, first.skipped, first.failed.length], [2, 0, 0]);
  assert.deepEqual([...store.keys()].sort(), ["avatars/u1/a.png", "b.webp"]);
  assert.equal(manifest.get("avatars/u1/a.png").originalUploaded, "2026-05-01T10:00:00.000Z");
  assert.deepEqual(manifest.get("avatars/u1/a.png").ownerMetadata, { ownerid: "u1" });
  assert.equal(written.length, 2);

  const second = await transferObjects({
    source,
    destination,
    manifest,
    record: (e) => written.push(e),
  });
  assert.deepEqual([second.copied, second.skipped], [0, 2]);
  assert.equal(uploads(), 2, "a resumed run uploads nothing that already verified");
  assert.deepEqual(await verifyManifest({ destination, manifest }), []);
});

test("a corrupted or missing destination object is detected and re-copied", async () => {
  const { source, destination, store } = fakes(objects);
  const manifest = new Map();
  await transferObjects({ source, destination, manifest, record: () => {} });
  store.set("b.webp", Buffer.from("tampered"));
  store.delete("avatars/u1/a.png");
  const problems = await verifyManifest({ destination, manifest });
  assert.deepEqual(problems.map((p) => p.error).sort(), [
    "checksum differs",
    "missing in destination",
  ]);

  const repair = await transferObjects({ source, destination, manifest, record: () => {} });
  assert.deepEqual([repair.copied, repair.skipped], [2, 0]);
  assert.deepEqual(await verifyManifest({ destination, manifest }), []);
});

test("an upload that does not verify is reported, not recorded", async () => {
  const { source, store } = fakes(objects);
  const destination = {
    async put(key) {
      store.set(key, Buffer.from("wrong"));
    },
    async read(key) {
      return store.get(key) ?? null;
    },
  };
  const manifest = new Map();
  const stats = await transferObjects({ source, destination, manifest, record: () => {} });
  assert.equal(stats.failed.length, 2);
  assert.equal(manifest.size, 0);
});
