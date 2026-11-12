import { validatePlacement } from "../../../lib/nature-placement";
import {
  CommonApiError,
  validateCommonElement,
  generateCommonImage,
} from "../../../lib/common-validation";
import { env } from "../../../lib/env";
import { requirePracaUser, getPracaUser } from "../../../lib/praca-auth";
import {
  commonCalendar,
  commonPrompt,
  seedCommonAssets,
  closeCommonProposals,
  proposeCommonRemoval,
  cancelCommonProposal,
} from "../../../lib/common-space";
export async function GET() {
  await seedCommonAssets(env.DB);
  await closeCommonProposals(env.DB);
  const assets = await env.DB.prepare(
    "SELECT a.*,u.username,u.display_name FROM common_assets a LEFT JOIN users u ON u.id=a.author_id ORDER BY a.created_at DESC",
  ).all();
  const proposals = await env.DB.prepare(
    `SELECT p.*,a.element,a.url,a.prompt,a.placement_json,u.username,u.display_name,(SELECT count(*) FROM common_votes v WHERE v.proposal_id=p.id AND value=1) AS yes_live,(SELECT count(*) FROM common_votes v WHERE v.proposal_id=p.id AND value=-1) AS no_live FROM common_proposals p JOIN common_assets a ON a.id=p.asset_id JOIN users u ON u.id=p.creator_id ORDER BY p.created_at DESC`,
  ).all();
  const votes = await env.DB.prepare(
    "SELECT v.proposal_id,v.value,u.username,u.display_name FROM common_votes v JOIN users u ON v.user_id=u.id ORDER BY v.updated_at DESC",
  ).all();
  const items = await env.DB.prepare(
    "SELECT pa.proposal_id,a.* FROM common_proposal_assets pa JOIN common_assets a ON a.id=pa.asset_id ORDER BY a.element",
  ).all();
  const user = await getPracaUser();
  const calendar = commonCalendar();
  const generation = user
    ? await env.DB.prepare(
        "SELECT id,status FROM common_generations WHERE user_id=? AND month_key=? AND status!='failed'",
      )
        .bind(user.id, calendar.monthKey)
        .first()
    : null;
  const draft = user
    ? await env.DB.prepare(
        "SELECT a.* FROM common_assets a JOIN common_generations g ON g.id=a.id WHERE g.user_id=? AND g.status='generated' AND NOT EXISTS(SELECT 1 FROM common_proposals p WHERE p.asset_id=a.id AND p.kind='addition') ORDER BY a.created_at DESC LIMIT 1",
      )
        .bind(user.id)
        .first()
    : null;
  return Response.json(
    {
      draft,
      assets: assets.results,
      proposals: proposals.results.map((p: any) => ({
        ...p,
        images: items.results.filter((i: any) => i.proposal_id === p.id),
      })),
      votes: votes.results,
      calendar,
      user: user?.profileComplete ? { username: user.username } : null,
      available: !generation,
      generation,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
export async function POST(request: Request) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const user = auth.user!,
    db = env.DB;
  await seedCommonAssets(db);
  await closeCommonProposals(db);
  const p = await request.json().catch(() => null);
  const fail = (error: string, status = 400) => Response.json({ error }, { status });
  if (!p) return fail("Pedido inválido.");
  const cal = commonCalendar();
  if (p.action === "vote") {
    if (![-1, 1].includes(p.value) || typeof p.proposalId !== "string")
      return fail("Voto inválido.");
    const result = await db
      .prepare(
        `INSERT INTO common_votes(proposal_id,user_id,value) SELECT id,?,? FROM common_proposals WHERE id=? AND status='open' AND closes_at>? ON CONFLICT(proposal_id,user_id) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`,
      )
      .bind(user.id, p.value, p.proposalId, new Date().toISOString())
      .run();
    return result.meta.changes
      ? Response.json({ ok: true })
      : fail("A votação já foi encerrada.", 409);
  }
  if (p.action === "cancel") {
    if (typeof p.proposalId !== "string") return fail("Proposta inválida.");
    return (await cancelCommonProposal(db, user.id, p.proposalId))
      ? Response.json({ ok: true })
      : fail("A proposta já fechou ou não está disponível para você retirar.", 409);
  }
  if (!cal.canSubmit)
    return fail(
      "As propostas podem ser enviadas do dia 1 ao dia 15. A votação segue até o fim do mês.",
      409,
    );
  if (p.action === "remove") {
    try {
      const id = await proposeCommonRemoval(
        db,
        user.id,
        p.assetIds || (p.assetId ? [p.assetId] : []),
        p.reason,
        cal,
      );
      return Response.json({ ok: true, id });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Não foi possível registrar a proposta.", 409);
    }
  }
  if (p.action === "submit") {
    let placement;
    try {
      placement = validatePlacement(p.placement);
    } catch (e) {
      return fail((e as Error).message);
    }
    const asset = await db
      .prepare(
        "SELECT a.id,a.author_id,g.status FROM common_assets a JOIN common_generations g ON g.id=a.id WHERE a.id=?",
      )
      .bind(typeof p.assetId === "string" ? p.assetId : "")
      .first();
    if (!asset || asset.author_id !== user.id)
      return fail("Esta imagem não está disponível para sua edição.", 403);
    const existing = await db
      .prepare("SELECT id FROM common_proposals WHERE asset_id=? AND kind='addition'")
      .bind(asset.id)
      .first();
    if (existing) return Response.json({ ok: true, id: existing.id });
    if (asset.status !== "generated") return fail("Aguarde a conclusão da imagem.", 409);
    await db.batch([
      db
        .prepare(
          "UPDATE common_assets SET placement_json=? WHERE id=? AND author_id=? AND NOT EXISTS(SELECT 1 FROM common_proposals WHERE asset_id=common_assets.id AND kind=\'addition\')",
        )
        .bind(JSON.stringify(placement), asset.id, user.id),
      db
        .prepare(
          "INSERT INTO common_proposals(id,asset_id,creator_id,kind,month_key,closes_at) VALUES (?,?,?,'addition',?,?) ON CONFLICT DO NOTHING",
        )
        .bind(asset.id, asset.id, user.id, cal.monthKey, cal.closesAt),
      db.prepare("UPDATE common_generations SET status='complete' WHERE id=?").bind(asset.id),
      db
        .prepare(
          "INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json) VALUES (?,'common_image_submitted','common_asset',?,?)",
        )
        .bind(user.id, asset.id, JSON.stringify({ placement })),
    ]);
    return Response.json({ ok: true, id: asset.id });
  }
  if (p.action !== "generate" || p.confirmed !== true)
    return fail("Confirme a geração mensal antes de continuar.");
  const element =
    typeof p.element === "string" ? p.element.normalize("NFC").trim().replace(/\s+/g, " ") : "";
  if (!/^[\p{L}\p{M}\s-]{3,60}$/u.test(element) || element.split(" ").length > 7)
    return fail("Informe somente o nome de um elemento natural, como jabuticaba ou arara-canindé.");
  const key = (env as any).OPENAI_API_KEY;
  if (!key || !env.BUCKET) return fail("A geração está temporariamente indisponível.", 503);
  const id = crypto.randomUUID();
  const reserved = await db
    .prepare(
      "INSERT INTO common_generations(id,user_id,month_key,element) VALUES (?,?,?,?) ON CONFLICT DO NOTHING",
    )
    .bind(id, user.id, cal.monthKey, element)
    .run();
  if (!reserved.meta.changes)
    return fail("Você já utilizou sua geração neste mês ou tem uma geração em andamento.", 429);
  let imageRequested = false;
  try {
    const normalized = await validateCommonElement(key, element);
    if (!normalized.valid || !/^[-\p{L}\p{M}\s]{3,80}$/u.test(normalized.element)) {
      await db.prepare("UPDATE common_generations SET status='failed' WHERE id=?").bind(id).run();
      return fail(
        "Informe apenas um elemento natural brasileiro ou tropical. Sua geração mensal continua disponível.",
      );
    }
    const prompt = commonPrompt(normalized.element);
    imageRequested = true;
    let bytes: Uint8Array;
    try {
      bytes = await generateCommonImage(key, prompt);
    } catch (e) {
      if (e instanceof CommonApiError && e.detail.stage === "image") imageRequested = false;
      throw e;
    }
    const imageKey = `${crypto.randomUUID()}.webp`;
    await env.BUCKET.put(imageKey, bytes, {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { ownerId: user.id, purpose: "common-space" },
    });
    await db.batch([
      db
        .prepare("INSERT INTO common_assets(id,element,url,prompt,author_id) VALUES (?,?,?,?,?)")
        .bind(id, normalized.element, `/media/${imageKey}`, prompt, user.id),
      db.prepare("UPDATE common_generations SET status='generated' WHERE id=?").bind(id),
    ]);
    return Response.json({ ok: true, id, generated: true });
  } catch (error) {
    const detail =
      error instanceof CommonApiError
        ? error.detail
        : {
            stage: imageRequested ? "image_or_storage" : "validation",
            code: "unexpected_error",
            message: error instanceof Error ? error.message : "unknown",
          };
    console.error("common_generation_failed", JSON.stringify({ id, ...detail }));
    await db
      .prepare(
        "INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json) VALUES (?,'common_generation_failed','common_generation',?,?)",
      )
      .bind(user.id, id, JSON.stringify(detail))
      .run();
    if (!imageRequested)
      await db.prepare("UPDATE common_generations SET status='failed' WHERE id=?").bind(id).run();
    return Response.json(
      {
        error: imageRequested
          ? "Não foi possível confirmar o resultado. A solicitação ficou registrada para evitar uma geração duplicada."
          : detail.stage.startsWith("validation")
            ? "A validação do elemento está temporariamente indisponível. Sua cota mensal continua disponível."
            : "O serviço de imagens recusou a geração. Sua cota mensal continua disponível.",
        reference: id,
        stage: detail.stage,
      },
      { status: 502 },
    );
  }
}
