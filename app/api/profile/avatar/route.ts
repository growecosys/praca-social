import { eq, sql } from "drizzle-orm";
import { env } from "../../../../lib/env";
import { getDb } from "../../../../db";
import { activityEvents, avatarGenerations, users, nowText } from "../../../../db/schema";
import { createImage } from "../../../../lib/ai";
import { requirePracaUser } from "../../../../lib/praca-auth";

const MODEL = "gpt-image-2";
const STYLE =
  "square minimal satirical editorial avatar, bold geometric vector-like illustration, sophisticated political poster energy, symbolic creature or mask, flat shapes, high contrast";
const RULES =
  "no realistic human face, no text, no letters, no logo; respectful satire; avoid stereotypes and sensitive attributes";
function details(user: any, direction = "") {
  const answers = JSON.parse(user.answersJson || "[]") as string[];
  let avatar: any = {};
  try {
    avatar = JSON.parse(user.avatarJson || "{}");
  } catch {}
  const colors = Array.isArray(avatar.colors)
    ? avatar.colors
    : ["forest green", "warm yellow", "coral"];
  const symbol = avatar.symbol || "faísca";
  const symbolMeaning = avatar.symbolMeaning || "metáfora do papel atual";
  const character = avatar.character || "figura simbólica editorial";
  const action = avatar.action || `encena o manifesto ${user.manifesto}`;
  const satiricalDetail = avatar.satiricalDetail || "um detalhe burocrático discretamente absurdo";
  const cleanDirection = String(direction || "")
    .trim()
    .slice(0, 300);
  const visualBrief = {
    role: user.roleTitle,
    manifesto: user.manifesto,
    symbol: { type: symbol, meaning: symbolMeaning, literalness: "metaphorical" },
    character,
    action,
    satiricalDetail,
    palette: colors,
    personalSignals: answers,
  };
  const prompt = `Create a ${STYLE}. Use this validated visual brief: ${JSON.stringify(visualBrief)}. Build the composition around the character, action, and satirical detail. Treat the symbol as a conceptual metaphor, not a mandatory literal object. ${RULES}.${cleanDirection ? ` Additional art direction: ${cleanDirection}.` : ""}`;
  return {
    prompt,
    direction: cleanDirection,
    factors: {
      roleTitle: user.roleTitle,
      manifesto: user.manifesto,
      answers,
      symbol,
      symbolMeaning,
      colors,
      character,
      action,
      satiricalDetail,
      style: STYLE,
      rules: RULES,
    },
    settings: {
      model: MODEL,
      size: "1024x1024",
      quality: "low",
      outputFormat: "png",
    },
  };
}

export async function GET() {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  return Response.json(details(auth.user!));
}

export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!;
  if (user.imageGenerationsUsed >= 3)
    return Response.json(
      { error: "O limite de três imagens por perfil foi atingido." },
      { status: 429 },
    );
  let payload: { direction?: string } = {};
  try {
    payload = await request.json();
  } catch {}
  const generation = details(user, payload.direction);
  const bucket = env.BUCKET;
  if (!bucket)
    return Response.json(
      { error: "O armazenamento de imagens está indisponível." },
      { status: 503 },
    );
  const image = await createImage({
    model: MODEL,
    prompt: generation.prompt,
    format: "png",
    quality: "low",
    signal: AbortSignal.timeout(180000),
  });
  if (!image.ok) {
    const billing = /billing|credit|quota|balance|limit/i.test(image.message);
    return Response.json(
      {
        error: billing
          ? "A geração de imagem está sem créditos ou limite disponível no projeto da API."
          : image.message,
        billing,
      },
      { status: image.status },
    );
  }
  const imageKey = `avatars/${user.id}/${crypto.randomUUID()}.png`;
  await bucket.put(imageKey, image.bytes, {
    httpMetadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  const db = getDb();
  const generationId = crypto.randomUUID();
  await db
    .update(avatarGenerations)
    .set({ active: false })
    .where(eq(avatarGenerations.userId, user.id));
  await db.insert(avatarGenerations).values({
    id: generationId,
    userId: user.id,
    imageKey,
    prompt: generation.prompt,
    direction: generation.direction,
    active: true,
  });
  await db
    .update(users)
    .set({
      avatarImageKey: imageKey,
      imageGenerationsUsed: sql`${users.imageGenerationsUsed} + 1`,
      updatedAt: nowText,
    })
    .where(eq(users.id, user.id));
  await db.insert(activityEvents).values({
    userId: user.id,
    action: "avatar_generated",
    entityType: "avatar_generation",
    entityId: generationId,
    metadataJson: JSON.stringify({
      imageKey,
      prompt: generation.prompt,
      direction: generation.direction,
      factors: generation.factors,
      settings: generation.settings,
    }),
  });
  return Response.json({ ok: true, url: `/avatar/${user.id}?v=${Date.now()}` });
}

export async function PATCH(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!;
  const payload = (await request.json()) as { generationId?: string };
  if (!payload.generationId)
    return Response.json({ error: "Escolha uma imagem." }, { status: 400 });
  const db = getDb();
  const generation = (
    await db
      .select()
      .from(avatarGenerations)
      .where(eq(avatarGenerations.id, payload.generationId))
      .limit(1)
  )[0];
  if (!generation || generation.userId !== user.id)
    return Response.json({ error: "Imagem não encontrada." }, { status: 404 });
  await db
    .update(avatarGenerations)
    .set({ active: false })
    .where(eq(avatarGenerations.userId, user.id));
  await db
    .update(avatarGenerations)
    .set({ active: true })
    .where(eq(avatarGenerations.id, generation.id));
  await db
    .update(users)
    .set({
      avatarImageKey: generation.imageKey,
      updatedAt: nowText,
    })
    .where(eq(users.id, user.id));
  await db.insert(activityEvents).values({
    userId: user.id,
    action: "avatar_version_selected",
    entityType: "avatar_generation",
    entityId: generation.id,
    metadataJson: JSON.stringify({ imageKey: generation.imageKey }),
  });
  return Response.json({ ok: true });
}
