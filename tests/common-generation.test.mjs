import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
test("common images use a transparency-capable model and preserve provider failures", async () => {
  let source = await readFile(new URL("../lib/common-validation.ts", import.meta.url), "utf8");
  source = source.replace(
    /import \{\s*commonCalendar,\s*commonPrompt\s*\} from ["']\.\/common-space["'];/,
    "",
  );
  const { code } = await transformWithEsbuild(source, "common-validation.ts", {
    loader: "ts",
    target: "esnext",
  });
  const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      assert.equal(body.model, "gpt-image-1.5");
      assert.equal(body.background, "transparent");
      assert.equal(body.output_format, "webp");
      assert.equal(body.n, 1);
      return Response.json({ data: [{ b64_json: btoa("image bytes") }] });
    };
    assert.equal(
      new TextDecoder().decode(await api.generateCommonImage("test-only", "Bicho-preguiça")),
      "image bytes",
    );
    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "invalid_value",
            param: "background",
            message: "Transparent background is not supported for this model.",
          },
        },
        { status: 400, headers: { "x-request-id": "test-request" } },
      );
    await assert.rejects(
      api.generateCommonImage("test-only", "Bicho-preguiça"),
      (e) =>
        e.detail.stage === "image" &&
        e.detail.status === 400 &&
        e.detail.param === "background" &&
        e.detail.requestId === "test-request",
    );
    globalThis.fetch = async () =>
      Response.json({
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: '{"valid":true,"element":"bicho-preguiça"}' }] },
        ],
      });
    assert.deepEqual(await api.validateCommonElement("test-only", "bicho preguiça"), {
      valid: true,
      element: "bicho-preguiça",
    });
    globalThis.fetch = async () =>
      Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } });
    await assert.rejects(
      api.validateCommonElement("test-only", "bicho preguiça"),
      (e) => e.detail.stage === "validation" && e.detail.message === "max_output_tokens",
    );
  } finally {
    globalThis.fetch = original;
  }
});
