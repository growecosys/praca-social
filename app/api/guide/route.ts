import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityEvents, assistantUsage, posts, referrals, nowText } from "../../../db/schema";
import { GUIDE_ACTIONS, GUIDE_INSTRUCTIONS, type GuideAction } from "../../../lib/guide-knowledge";
import { getPracaUser } from "../../../lib/praca-auth";
import { jsonWithVisitor, visitorFromRequest } from "../../../lib/visitor";
import { createResponse } from "../../../lib/ai";

type ChatMessage = { role: "user" | "assistant"; content: string };

const actionIds = Object.keys(GUIDE_ACTIONS) as GuideAction[];
const responseSchema = {
  type: "object",
  properties: {
    message: { type: "string", description: "Resposta curta e útil em português brasileiro." },
    actions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: actionIds },
          label: { type: "string", description: "Rótulo curto para o botão." },
        },
        required: ["id", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["message", "actions"],
  additionalProperties: false,
};

function outputText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  return (data?.output || [])
    .flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text)
    .join("");
}

function dayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  const visitor = visitorFromRequest(request);
  const user = await getPracaUser();
  const limit = user ? 40 : 12;
  const dayKey = dayInSaoPaulo();
  const db = getDb();

  try {
    const payload = (await request.json()) as {
      messages?: ChatMessage[];
      currentPath?: string;
      language?: "pt" | "en";
    };
    const language = payload.language === "en" ? "English" : "Brazilian Portuguese";
    const messages = (Array.isArray(payload.messages) ? payload.messages : [])
      .filter(
        (message): message is ChatMessage =>
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message.content === "string",
      )
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 1_200) }))
      .filter((message) => message.content);
    if (!messages.length || messages[messages.length - 1].role !== "user")
      return jsonWithVisitor({ error: "Escreva uma pergunta para o assistente." }, visitor, {
        status: 400,
      });

    let usage = (
      await db
        .select()
        .from(assistantUsage)
        .where(and(eq(assistantUsage.visitorId, visitor.id), eq(assistantUsage.dayKey, dayKey)))
        .limit(1)
    )[0];
    if ((usage?.messages || 0) >= limit)
      return jsonWithVisitor(
        {
          error: "O limite diário deste assistente foi alcançado. Ele volta amanhã.",
          remaining: 0,
        },
        visitor,
        { status: 429 },
      );

    const [publicationRows, invited] = user
      ? await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(posts)
            .where(eq(posts.ownerId, user.id)),
          db.select().from(referrals).where(eq(referrals.inviterId, user.id)),
        ])
      : [[{ count: 0 }], []];
    const publicationCount = publicationRows[0]?.count ?? 0;
    const currentPath =
      typeof payload.currentPath === "string" && /^\/[a-z0-9_\-/]*$/i.test(payload.currentPath)
        ? payload.currentPath.slice(0, 180)
        : "/";
    const accountContext = {
      signedIn: Boolean(user),
      currentPath,
      user: user
        ? {
            displayName: user.displayName,
            username: user.username,
            profileComplete: user.profileComplete,
            roleTitle: user.roleTitle,
            hasAvatar: Boolean(user.avatarImageKey),
            publicationCount: Number(publicationCount),
            qualifiedInvites: invited.filter((item) => Boolean(item.qualifiedAt)).length,
            remainingRoleGenerations: Math.max(0, 3 - user.generationsUsed),
            remainingAvatarGenerations: Math.max(0, 3 - user.imageGenerationsUsed),
          }
        : null,
    };

    const response = await createResponse({
      model: "gpt-6-luna",
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 420,
      instructions: `${GUIDE_INSTRUCTIONS}\n\nLANGUAGE: Answer entirely in ${language}, including button labels. Keep Praça as the product name.\n\nCONTEXTO ATUAL DA CONTA (dados confiáveis do servidor):\n${JSON.stringify(accountContext)}`,
      input: messages,
      text: {
        format: {
          type: "json_schema",
          name: "praca_guide",
          strict: true,
          schema: responseSchema,
        },
      },
    });
    const data = (await response.json()) as any;
    if (!response.ok) throw new Error(data?.error?.message || "A IA não conseguiu responder.");
    const text = outputText(data);
    if (!text) throw new Error("A IA não retornou uma resposta utilizável.");
    const result = JSON.parse(text) as {
      message: string;
      actions: Array<{ id: GuideAction; label: string }>;
    };
    const safeActions = result.actions
      .filter((action) => actionIds.includes(action.id))
      .slice(0, 3)
      .map((action) => ({
        id: action.id,
        label: action.label.slice(0, 50),
        href: GUIDE_ACTIONS[action.id].href,
      }));
    const inputTokens = Number(data?.usage?.input_tokens || 0);
    const outputTokens = Number(data?.usage?.output_tokens || 0);

    if (usage) {
      await db
        .update(assistantUsage)
        .set({
          messages: sql`${assistantUsage.messages} + 1`,
          inputTokens: sql`${assistantUsage.inputTokens} + ${inputTokens}`,
          outputTokens: sql`${assistantUsage.outputTokens} + ${outputTokens}`,
          updatedAt: nowText,
        })
        .where(eq(assistantUsage.id, usage.id));
    } else {
      await db.insert(assistantUsage).values({
        visitorId: visitor.id,
        userId: user?.id,
        dayKey,
        messages: 1,
        inputTokens,
        outputTokens,
      });
      usage = { messages: 0 } as typeof usage;
    }
    if (user)
      await db.insert(activityEvents).values({
        userId: user.id,
        action: "guide_assistant_used",
        entityType: "assistant",
        entityId: currentPath,
      });

    return jsonWithVisitor(
      {
        message: result.message.slice(0, 1_500),
        actions: safeActions,
        remaining: Math.max(0, limit - (usage?.messages || 0) - 1),
      },
      visitor,
    );
  } catch (error) {
    return jsonWithVisitor(
      { error: error instanceof Error ? error.message : "Falha inesperada no assistente." },
      visitor,
      { status: 500 },
    );
  }
}
