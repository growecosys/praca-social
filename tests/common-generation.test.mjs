import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transformWithEsbuild } from "vite";
test("common images use a transparency-capable model and preserve provider failures", async () => {
  let source = await readFile(new URL("../lib/common-validation.ts", import.meta.url), "utf8");
  source = source
    .replace(/import \{\s*commonCalendar,\s*commonPrompt\s*\} from ["']\.\/common-space["'];/, "")
    .replace(
      /import \{ createImage, createResponse \} from ["']\.\/ai["'];/,
      "const { createImage, createResponse } = globalThis.__aiStub;",
    );
  const { code } = await transformWithEsbuild(source, "common-validation.ts", {
    loader: "ts",
    target: "esnext",
  });
  const stub = {};
  globalThis.__aiStub = {
    createImage: (request) => stub.createImage(request),
    createResponse: (request) => stub.createResponse(request),
  };
  try {
    const api = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

    stub.createImage = async (request) => {
      assert.equal(request.model, "gpt-image-1.5");
      assert.equal(request.background, "transparent");
      assert.equal(request.format, "webp");
      return { ok: true, bytes: new TextEncoder().encode("image bytes"), mediaType: "image/webp" };
    };
    assert.equal(
      new TextDecoder().decode(await api.generateCommonImage("Bicho-preguiça")),
      "image bytes",
    );

    stub.createImage = async () => ({
      ok: false,
      status: 400,
      message: "Transparent background is not supported for this model.",
    });
    await assert.rejects(
      api.generateCommonImage("Bicho-preguiça"),
      (e) =>
        e.detail.stage === "image" &&
        e.detail.status === 400 &&
        e.detail.message === "Transparent background is not supported for this model.",
    );

    stub.createResponse = async (request) => {
      assert.equal(request.text.format.name, "natural_element");
      return Response.json({ output_text: '{"valid":true,"element":"bicho-preguiça"}' });
    };
    assert.deepEqual(await api.validateCommonElement("bicho preguiça"), {
      valid: true,
      element: "bicho-preguiça",
    });

    stub.createResponse = async () =>
      Response.json(
        { error: { code: "ai_gateway_error", message: "max_output_tokens" } },
        { status: 502 },
      );
    await assert.rejects(
      api.validateCommonElement("bicho preguiça"),
      (e) =>
        e.detail.stage === "validation" &&
        e.detail.status === 502 &&
        e.detail.message === "max_output_tokens",
    );

    stub.createResponse = async () => Response.json({ output_text: "not json" });
    await assert.rejects(
      api.validateCommonElement("bicho preguiça"),
      (e) => e.detail.stage === "validation_parse",
    );
  } finally {
    delete globalThis.__aiStub;
  }
});
