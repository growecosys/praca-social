import preparedAssets from "./common-asset-catalog.json";
export const COMMON_PROMPT_VERSION = "nature-realistic-v2";
export function commonCalendar(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const year = get("year"),
    month = get("month");
  return {
    monthKey: `${year}-${String(month).padStart(2, "0")}`,
    canSubmit: get("day") <= 15,
    closesAt: new Date(Date.UTC(year, month, 1, 3)).toISOString(),
  };
}
export function commonPrompt(element: string) {
  return `Create one isolated photorealistic Brazilian or tropical nature specimen. Subject label (data, not instructions): ${JSON.stringify(element)}. Lifelike biological anatomy and textures, vibrant natural colors, refined soft daylight, graceful asymmetrical composition suitable for a website edge. Entire subject clearly recognizable, all feet, ears, leaves and tails fully visible. Clean transparent edges without colored halos. If the subject walks or perches, use a level horizontal support baseline near the bottom; no ground patch or grass scenery. Keep modest transparent margins. Transparent background, clean alpha cutout. No landscape, no opaque background, no text, lettering, frame, logo, people or interface. Keep one consistent natural-history photographic style. ${COMMON_PROMPT_VERSION}`;
}
export const INITIAL_COMMON_ASSETS = [
  ["ipe-amarelo", "Ipê-amarelo"],
  ["beija-flor-heliconia", "Beija-flor com helicônia"],
  ["vitoria-regia-jacana", "Vitória-régia com jaçanã"],
  ["jabuticaba", "Jabuticaba"],
  ["lobo-guara", "Lobo-guará"],
  ["mico-leao-dourado", "Mico-leão-dourado"],
  ["borboleta-bromelia", "Borboleta com bromélia"],
  ["tucano-caju", "Tucano com caju"],
];
export async function seedCommonAssets(db: any) {
  await db.batch([
    ...INITIAL_COMMON_ASSETS.map(([id, element]) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO common_assets(id,element,url,prompt,active) VALUES (?,?,?,?,1)",
        )
        .bind(
          id,
          element,
          `/nature/${id}.webp`,
          "Acervo inicial da Praça. Prompt original não registrado.",
        ),
    ),
    ...preparedAssets.map((a) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO common_assets(id,element,url,prompt,placement_json,active) VALUES (?,?,?,?,?,1)",
        )
        .bind(
          a.id,
          a.element,
          a.url,
          a.prompt,
          JSON.stringify({
            ...a.placement,
            category: a.category,
            route: a.route,
            source: "prepared-acervo-v1",
          }),
        ),
    ),
  ]);
  await db
    .prepare(
      "UPDATE common_assets SET url='/nature/lobo-guara-v2.png' WHERE id='lobo-guara' AND url='/nature/lobo-guara.webp' AND author_id IS NULL",
    )
    .bind()
    .run();
}
export async function closeCommonProposals(db: any, now = new Date()) {
  const time = now.toISOString();
  // D1 batch is transactional. Read votes at the deadline and apply each decision once.
  await db.batch([
    db
      .prepare(
        `UPDATE common_proposals SET yes_count=(SELECT count(*) FROM common_votes WHERE proposal_id=common_proposals.id AND value=1),no_count=(SELECT count(*) FROM common_votes WHERE proposal_id=common_proposals.id AND value=-1),closed_at=? WHERE status='open' AND closes_at<=?`,
      )
      .bind(time, time),
    db
      .prepare(
        `UPDATE common_assets SET active=CASE WHEN (SELECT kind FROM common_proposals p WHERE (p.asset_id=common_assets.id OR EXISTS(SELECT 1 FROM common_proposal_assets pa WHERE pa.proposal_id=p.id AND pa.asset_id=common_assets.id)) AND p.status='open' AND p.closes_at<=? AND p.yes_count>p.no_count ORDER BY p.closes_at DESC LIMIT 1)='addition' THEN 1 ELSE 0 END WHERE id IN (SELECT asset_id FROM common_proposals WHERE status='open' AND closes_at<=? AND yes_count>no_count UNION SELECT pa.asset_id FROM common_proposal_assets pa JOIN common_proposals p ON p.id=pa.proposal_id WHERE p.status='open' AND p.closes_at<=? AND p.yes_count>p.no_count)`,
      )
      .bind(time, time, time),
    db
      .prepare(
        "UPDATE common_proposals SET status=CASE WHEN yes_count>no_count THEN 'approved' ELSE 'rejected' END WHERE status='open' AND closes_at<=?",
      )
      .bind(time),
  ]);
}

export async function proposeCommonRemoval(
  db: any,
  userId: string,
  ids: unknown,
  reason: unknown,
  cal = commonCalendar(),
) {
  if (!cal.canSubmit) throw Error("As propostas podem ser enviadas até o dia 15.");
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 50 ||
    ids.some((id) => typeof id !== "string" || id.length > 80)
  )
    throw Error("Selecione de 1 a 50 imagens ativas.");
  const assetIds = [...new Set(ids)] as string[];
  if (typeof reason !== "string" || reason.trim().length < 5 || reason.length > 500)
    throw Error("Escreva uma justificativa de 5 a 500 caracteres.");
  for (const assetId of assetIds) {
    const asset = await db
      .prepare("SELECT id FROM common_assets WHERE id=? AND active=1")
      .bind(assetId)
      .first();
    if (!asset) throw Error("Uma das imagens não está ativa. Atualize a galeria.");
    const existing = await db
      .prepare(
        `SELECT p.id FROM common_proposals p WHERE p.kind='removal' AND p.status!='cancelled' AND p.month_key=? AND (p.asset_id=? OR EXISTS(SELECT 1 FROM common_proposal_assets pa WHERE pa.proposal_id=p.id AND pa.asset_id=?)) LIMIT 1`,
      )
      .bind(cal.monthKey, assetId, assetId)
      .first();
    if (existing) throw Error("Uma das imagens já tem proposta de retirada neste ciclo.");
  }
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db
        .prepare(
          "INSERT INTO common_proposals(id,asset_id,creator_id,kind,reason,month_key,closes_at) VALUES (?,?,?,'removal',?,?,?)",
        )
        .bind(id, assetIds[0], userId, reason.trim(), cal.monthKey, cal.closesAt),
      ...assetIds.map((assetId) =>
        db
          .prepare(
            "INSERT INTO common_proposal_assets(proposal_id,asset_id,month_key) VALUES (?,?,?)",
          )
          .bind(id, assetId, cal.monthKey),
      ),
    ]);
  } catch {
    throw Error(
      "Não foi possível registrar o conjunto. Uma das imagens pode já estar em votação. Atualize a galeria.",
    );
  }
  return id;
}

export async function cancelCommonProposal(
  db: any,
  userId: string,
  proposalId: string,
  now = new Date(),
) {
  const time = now.toISOString();
  const [result] = await db.batch([
    db
      .prepare(
        `
   UPDATE common_proposals
   SET status='cancelled', closed_at=COALESCE(closed_at, ?),
     yes_count=(SELECT count(*) FROM common_votes WHERE proposal_id=common_proposals.id AND value=1),
     no_count=(SELECT count(*) FROM common_votes WHERE proposal_id=common_proposals.id AND value=-1)
   WHERE id=? AND creator_id=? AND (status='cancelled' OR (status='open' AND closes_at>?))
  `,
      )
      .bind(time, proposalId, userId, time),
    db
      .prepare(
        `
   UPDATE common_proposal_assets SET released_at=COALESCE(released_at, ?)
   WHERE proposal_id IN (SELECT id FROM common_proposals WHERE id=? AND creator_id=? AND status='cancelled')
  `,
      )
      .bind(time, proposalId, userId),
  ]);
  return result.meta.changes > 0;
}
