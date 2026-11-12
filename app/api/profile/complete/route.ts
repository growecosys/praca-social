import { sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activityEvents, referrals, roleGenerations, users, nowText } from "../../../../db/schema";
import { requirePracaUser } from "../../../../lib/praca-auth";
import { generateProfileIdentity } from "../../../../lib/profile-identity";

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
  const auth = await requirePracaUser({ profile: false });
  if (auth.error) return auth.error;
  const user = auth.user!;
  if (user.profileComplete)
    return Response.json({ error: "Seu rito inicial já foi concluído." }, { status: 409 });
  const payload = (await request.json()) as { answers?: string[] };
  const answers = (payload.answers || []).map((v) => normalize(String(v)));
  if (
    answers.length !== 5 ||
    answers.some((answer) => words(answer).length !== 3 || answer.length > 80)
  )
    return Response.json(
      {
        error: "Cada uma das cinco respostas precisa ter exatamente três palavras.",
      },
      { status: 400 },
    );
  const identity = await generateProfileIdentity(answers);
  const db = getDb();
  const generationId = crypto.randomUUID();
  const avatarJson = JSON.stringify({
    symbol: identity.symbol,
    colors: identity.colors,
    symbolMeaning: identity.symbolMeaning,
    character: identity.character,
    action: identity.action,
    satiricalDetail: identity.satiricalDetail,
    roleComponents: identity.roleComponents,
  });
  await db
    .update(users)
    .set({
      answersJson: JSON.stringify(answers),
      roleTitle: identity.roleTitle,
      manifesto: identity.manifesto,
      avatarJson,
      profileComplete: true,
      generationsUsed: 1,
      updatedAt: nowText,
    })
    .where(sql`${users.id} = ${user.id}`);
  await db
    .update(referrals)
    .set({ qualifiedAt: nowText })
    .where(sql`${referrals.invitedUserId} = ${user.id} AND ${referrals.qualifiedAt} IS NULL`);
  await db.insert(roleGenerations).values({
    id: generationId,
    userId: user.id,
    answersJson: JSON.stringify(answers),
    roleTitle: identity.roleTitle,
    manifesto: identity.manifesto,
    avatarJson,
    mappingJson: JSON.stringify(identity.mapping),
    explanation: identity.explanation,
    status: "applied",
    appliedAt: nowText,
  });
  await db.insert(activityEvents).values({
    userId: user.id,
    action: "profile_completed",
    entityType: "role_generation",
    entityId: generationId,
    metadataJson: JSON.stringify({
      roleTitle: identity.roleTitle,
      mapping: identity.mapping,
      roleComponents: identity.roleComponents,
    }),
  });
  return Response.json({ ok: true, next: "/perfil" });
}
