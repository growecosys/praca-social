import {
  APICallError,
  NoObjectGeneratedError,
  Output,
  generateImage,
  generateText,
  jsonSchema,
} from "ai";

/**
 * Every AI feature goes through the Vercel AI Gateway with plain `provider/model` ids, so no
 * provider key is needed: the runtime authenticates the Gateway automatically. Models keep the
 * OpenAI ids the app already used, prefixed with `openai/`.
 */
const gatewayModel = (model: string) => (model.includes("/") ? model : `openai/${model}`);

type ChatMessage = { role: "user" | "assistant"; content: string };

export type StructuredRequest = {
  model: string;
  instructions: string;
  input: string | ChatMessage[];
  store?: boolean;
  max_output_tokens?: number;
  reasoning?: { effort: "none" | "minimal" | "low" | "medium" | "high" };
  text: {
    format: {
      type?: "json_schema";
      strict?: boolean;
      name: string;
      schema: Record<string, unknown>;
    };
  };
};

function describeFailure(error: unknown) {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 502;
    return { status, message: error.message };
  }
  const timedOut = error instanceof Error && /abort|timeout/i.test(error.name);
  return {
    status: timedOut ? 504 : 502,
    message: error instanceof Error ? error.message : "A IA não conseguiu responder.",
  };
}

/**
 * Structured generation shaped like an OpenAI Responses reply (`output_text`, `usage`, or
 * `error`), so each route keeps its own parsing, quota and error handling untouched.
 */
export async function createResponse(request: StructuredRequest, signal?: AbortSignal) {
  const settings = {
    model: gatewayModel(request.model),
    system: request.instructions,
    output: Output.object({
      schema: jsonSchema(request.text.format.schema),
      name: request.text.format.name,
    }),
    maxOutputTokens: request.max_output_tokens,
    abortSignal: signal,
    providerOptions: {
      openai: {
        store: false,
        strictJsonSchema: true,
        ...(request.reasoning ? { reasoningEffort: request.reasoning.effort } : {}),
      },
    },
  };
  try {
    const result =
      typeof request.input === "string"
        ? await generateText({ ...settings, prompt: request.input })
        : await generateText({
            ...settings,
            messages: request.input.map(({ role, content }) => ({ role, content })),
          });
    return Response.json({
      output_text: result.text,
      usage: {
        input_tokens: result.usage.inputTokens ?? 0,
        output_tokens: result.usage.outputTokens ?? 0,
      },
    });
  } catch (error) {
    // An unparseable reply is returned as text so the caller's own "incomplete answer" path runs.
    if (NoObjectGeneratedError.isInstance(error) && error.text)
      return Response.json({ output_text: error.text });
    const { status, message } = describeFailure(error);
    return Response.json({ error: { code: "ai_gateway_error", message } }, { status });
  }
}

export type ImageRequest = {
  model: string;
  prompt: string;
  format: "png" | "webp";
  quality?: "low" | "medium" | "high";
  background?: "transparent" | "opaque" | "auto";
  signal?: AbortSignal;
};

export type ImageResult =
  | { ok: true; bytes: Uint8Array; mediaType: string }
  | { ok: false; status: number; message: string };

export async function createImage(request: ImageRequest): Promise<ImageResult> {
  try {
    const { image } = await generateImage({
      model: gatewayModel(request.model),
      prompt: request.prompt,
      size: "1024x1024",
      abortSignal: request.signal,
      providerOptions: {
        openai: {
          quality: request.quality ?? "low",
          outputFormat: request.format,
          ...(request.background ? { background: request.background } : {}),
        },
      },
    });
    return { ok: true, bytes: image.uint8Array, mediaType: image.mediaType };
  } catch (error) {
    return { ok: false, ...describeFailure(error) };
  }
}
