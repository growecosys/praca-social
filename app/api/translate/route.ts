function outputText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  return (data?.output || [])
    .flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text)
    .join("");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { texts?: unknown };
    if (
      !Array.isArray(payload.texts) ||
      !payload.texts.length ||
      payload.texts.length > 30 ||
      payload.texts.some((text) => typeof text !== "string" || text.length > 1200) ||
      payload.texts.reduce((sum, text) => sum + String(text).length, 0) > 12000
    )
      return Response.json({ error: "Lote de tradução inválido." }, { status: 400 });
    const texts = payload.texts as string[];
    const { env } = await import("../../../lib/env");
    const key = (env as any).OPENAI_API_KEY;
    if (!key) return Response.json({ error: "Tradução indisponível." }, { status: 503 });
    const schema = {
      type: "object",
      properties: {
        translations: {
          type: "array",
          items: { type: "string" },
          minItems: texts.length,
          maxItems: texts.length,
        },
      },
      required: ["translations"],
      additionalProperties: false,
    };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6-luna",
        store: false,
        reasoning: { effort: "none" },
        instructions:
          "Translate each item from Brazilian Portuguese to natural English. Preserve order, names, usernames, URLs, emoji, numbers, formatting, and the Praça brand name. Preserve the original tone, including satire. If an item is already English or is a proper name, keep it unchanged. Return only the required JSON.",
        input: JSON.stringify(texts),
        text: { format: { type: "json_schema", name: "page_translation", strict: true, schema } },
      }),
    });
    const data = await response.json();
    if (!response.ok)
      return Response.json({ error: "O serviço de tradução não respondeu." }, { status: 502 });
    const parsed = JSON.parse(outputText(data));
    if (!Array.isArray(parsed.translations) || parsed.translations.length !== texts.length)
      return Response.json({ error: "Tradução incompleta." }, { status: 502 });
    return Response.json(
      { translations: parsed.translations.map((value: unknown) => String(value)) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Não foi possível traduzir esta página." }, { status: 500 });
  }
}
