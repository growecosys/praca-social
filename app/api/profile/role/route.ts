import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activityEvents, roleGenerations, users, nowText } from "../../../../db/schema";
import { requirePracaUser } from "../../../../lib/praca-auth";
import {
  generateProfileIdentity,
  mapIdentityAnswers,
  reconstructLegacyIdentity,
} from "../../../../lib/profile-identity";

const LIMIT = 3;
function normalize(value: string) {
  return value
    .trim()
    .replace(/\s*([,;])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .replace(/[,;]\s*$/g, "");
}
function words(value: string) {
  return normalize(value)
    .split(/[\s,;]+/)
    .map((part) => part.replace(/^[.!?…:]+|[.!?…:]+$/g, ""))
    .filter(Boolean);
}

export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!;
  if (user.generationsUsed >= LIMIT)
    return Response.json(
      { error: "Seus créditos para gerar um novo papel acabaram." },
      { status: 429 },
    );
  let payload: { answers?: string[] } = {};
  try {
    payload = await request.json();
  } catch {}
  const rawAnswers: unknown[] = payload.answers || JSON.parse(user.answersJson || "[]");
  const answers = rawAnswers.map((answer) => normalize(String(answer)));
  if (
    answers.length !== 5 ||
    answers.some((answer) => words(answer).length !== 3 || answer.length > 80)
  )
    return Response.json(
      { error: "Cada resposta precisa ter exatamente três palavras." },
      { status: 400 },
    );
  const db = getDb();
  const recent = await db
    .select({ avatarJson: roleGenerations.avatarJson })
    .from(roleGenerations)
    .where(eq(roleGenerations.userId, user.id))
    .orderBy(desc(roleGenerations.createdAt))
    .limit(3);
  const recentDirections = recent.flatMap((version) => {
    try {
      return [JSON.parse(version.avatarJson)];
    } catch {
      return [];
    }
  });
  const avoidSymbols = recentDirections
    .map((direction) => direction?.symbol)
    .filter(Boolean)
    .map(String);
  const avoidStructures = recentDirections
    .map((direction) => direction?.roleComponents?.structureFamily)
    .filter(Boolean)
    .map(String);
  const identity = await generateProfileIdentity(answers, {
    avoidSymbols,
    avoidStructures,
  });
  const generationId = crypto.randomUUID();
  await db.insert(roleGenerations).values({
    id: generationId,
    userId: user.id,
    answersJson: JSON.stringify(answers),
    roleTitle: identity.roleTitle,
    manifesto: identity.manifesto,
    avatarJson: JSON.stringify({
      symbol: identity.symbol,
      colors: identity.colors,
      symbolMeaning: identity.symbolMeaning,
      character: identity.character,
      action: identity.action,
      satiricalDetail: identity.satiricalDetail,
      roleComponents: identity.roleComponents,
    }),
    mappingJson: JSON.stringify(identity.mapping),
    explanation: identity.explanation,
  });
  await db
    .update(users)
    .set({
      generationsUsed: sql`${users.generationsUsed} + 1`,
      updatedAt: nowText,
    })
    .where(eq(users.id, user.id));
  await db.insert(activityEvents).values({
    userId: user.id,
    action: "role_preview_generated",
    entityType: "role_generation",
    entityId: generationId,
    metadataJson: JSON.stringify({
      previousRoleTitle: user.roleTitle,
      roleTitle: identity.roleTitle,
      answers,
      roleComponents: identity.roleComponents,
    }),
  });
  return Response.json({
    ok: true,
    generationId,
    roleTitle: identity.roleTitle,
    manifesto: identity.manifesto,
    mapping: identity.mapping,
    explanation: identity.explanation,
    roleComponents: identity.roleComponents,
    answers,
    remaining: Math.max(0, LIMIT - user.generationsUsed - 1),
  });
}

export async function PATCH(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const payload = (await request.json()) as {
    generationId?: string;
    action?: "apply" | "reject" | "select" | "restore_legacy";
    roleTitle?: string;
  };
  const db = getDb();
  if (payload.action === "restore_legacy") {
    const roleTitle = String(payload.roleTitle || "")
      .trim()
      .slice(0, 100);
    const historicalEvents = await db
      .select({
        action: activityEvents.action,
        metadataJson: activityEvents.metadataJson,
      })
      .from(activityEvents)
      .where(eq(activityEvents.userId, user.id));
    const recorded = historicalEvents.some((event) => {
      if (!["profile_completed", "role_regenerated"].includes(event.action)) return false;
      try {
        const metadata = JSON.parse(event.metadataJson) as {
          roleTitle?: string;
          previousRoleTitle?: string;
        };
        return metadata.roleTitle === roleTitle || metadata.previousRoleTitle === roleTitle;
      } catch {
        return false;
      }
    });
    if (!roleTitle || !recorded)
      return Response.json({ error: "Registro histórico não encontrado." }, { status: 404 });
    const answers = JSON.parse(user.answersJson || "[]") as string[];
    const identity = await reconstructLegacyIdentity(roleTitle, answers);
    const generationId = crypto.randomUUID();
    const avatarJson = JSON.stringify({
      symbol: identity.symbol,
      colors: identity.colors,
    });
    await db.insert(roleGenerations).values({
      id: generationId,
      userId: user.id,
      answersJson: JSON.stringify(answers),
      roleTitle,
      manifesto: identity.manifesto,
      avatarJson,
      mappingJson: JSON.stringify(mapIdentityAnswers(answers)),
      explanation:
        "Versão reconstruída a partir do título histórico e das cinco respostas preservadas.",
      status: "applied",
      appliedAt: nowText,
    });
    await db
      .update(users)
      .set({
        roleTitle,
        manifesto: identity.manifesto,
        avatarJson,
        updatedAt: nowText,
      })
      .where(eq(users.id, user.id));
    await db.insert(activityEvents).values({
      userId: user.id,
      action: "legacy_role_reconstructed",
      entityType: "role_generation",
      entityId: generationId,
      metadataJson: JSON.stringify({
        previousRoleTitle: user.roleTitle,
        roleTitle,
        reconstructed: true,
      }),
    });
    return Response.json({ ok: true, reconstructed: true });
  }
  if (!payload.generationId || !["apply", "reject", "select"].includes(payload.action || ""))
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  const condition =
    payload.action === "select"
      ? and(eq(roleGenerations.id, payload.generationId), eq(roleGenerations.userId, user.id))
      : and(
          eq(roleGenerations.id, payload.generationId),
          eq(roleGenerations.userId, user.id),
          eq(roleGenerations.status, "pending"),
        );
  const generation = (await db.select().from(roleGenerations).where(condition).limit(1))[0];
  if (!generation)
    return Response.json({ error: "Esta versão não está mais disponível." }, { status: 404 });
  if (payload.action === "apply" || payload.action === "select")
    await db
      .update(users)
      .set({
        answersJson: generation.answersJson,
        roleTitle: generation.roleTitle,
        manifesto: generation.manifesto,
        avatarJson: generation.avatarJson,
        updatedAt: nowText,
      })
      .where(eq(users.id, user.id));
  if (payload.action !== "select")
    await db
      .update(roleGenerations)
      .set({
        status: payload.action === "apply" ? "applied" : "rejected",
        appliedAt: nowText,
      })
      .where(eq(roleGenerations.id, generation.id));
  const action =
    payload.action === "select"
      ? "role_version_selected"
      : payload.action === "apply"
        ? "role_regenerated"
        : "role_preview_rejected";
  await db.insert(activityEvents).values({
    userId: user.id,
    action,
    entityType: "role_generation",
    entityId: generation.id,
    metadataJson: JSON.stringify({
      previousRoleTitle: user.roleTitle,
      roleTitle: generation.roleTitle,
    }),
  });
  return Response.json({ ok: true, applied: payload.action !== "reject" });
}
