import {
  StoryError,
  newCampaign,
  advanceCampaign,
  mutateCampaign,
  type Campaign,
  type Member,
} from "./stories";
const URL = "/jogar/historias";
export async function storyRow(db: any, id?: string) {
  const row = await db
    .prepare(
      id
        ? "SELECT * FROM story_campaigns WHERE id=?"
        : "SELECT * FROM story_campaigns WHERE active=1",
    )
    .bind(...(id ? [id] : []))
    .first();
  return row
    ? { state: JSON.parse(row.state_json) as Campaign, revision: row.revision as number }
    : null;
}
export async function ensureStory(db: any, now = Date.now()) {
  const row = await storyRow(db);
  if (row) return row;
  const s = newCampaign(now);
  await db
    .prepare(
      "INSERT INTO story_campaigns(id,active,state_json,created_at) VALUES(?,1,?,?) ON CONFLICT DO NOTHING",
    )
    .bind(s.id, JSON.stringify(s), now)
    .run();
  return (await storyRow(db))!;
}
export async function saveStory(db: any, s: Campaign, revision: number, actor?: string) {
  const encoded = JSON.stringify(s);
  const guard = "EXISTS(SELECT 1 FROM story_campaigns WHERE id=? AND revision=? AND state_json=?)";
  const query = db
    .prepare(
      `UPDATE story_campaigns SET state_json=?,revision=revision+1 WHERE id=? AND revision=? ${actor ? "AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL)" : ""}`,
    )
    .bind(encoded, s.id, revision, ...(actor ? [actor] : []));
  const batch = [query];
  for (const m of s.members) {
    for (const [key, xp, earned] of [
      ["first-action", 5, m.acted.length > 0],
      [
        "chapter-complete",
        20,
        s.phase === "ended" && m.acted.length > 0 && s.outcome !== "interrupted",
      ],
    ] as const) {
      if (earned)
        batch.push(
          db
            .prepare(
              `INSERT INTO game_achievements(user_id,game_id,key,xp,run_id) SELECT id,'stories',?,?,? FROM users WHERE id=? AND deleted_at IS NULL AND ${guard} ON CONFLICT(user_id,game_id,key) DO NOTHING`,
            )
            .bind(key, xp, s.id, m.id, s.id, revision + 1, encoded),
        );
    }
  }
  for (const e of s.events.filter((e) => ["start", "round", "ending"].includes(e.kind))) {
    for (const m of s.members.filter((m) => !m.left))
      batch.push(
        db
          .prepare(
            `INSERT INTO notifications(recipient_id,type,title,body,href,dedupe_key) SELECT id,'story_update',?,?,?,? FROM users WHERE id=? AND deleted_at IS NULL AND ${guard} ON CONFLICT DO NOTHING`,
          )
          .bind(
            e.kind === "start"
              ? "Sua história começou"
              : e.kind === "ending"
                ? "História encerrada"
                : `Rodada ${e.round} disponível`,
            e.text.slice(0, 220),
            URL,
            `story:${s.id}:${e.id}:${m.id}`,
            m.id,
            s.id,
            revision + 1,
            encoded,
          ),
      );
  }
  const results = await db.batch(batch);
  if (!results[0].meta.changes)
    throw new StoryError(
      "A campanha foi atualizada por outra pessoa. Atualize e tente novamente.",
      409,
    );
  return { state: s, revision: revision + 1 };
}
export async function tickStories(db: any, now = Date.now()) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await ensureStory(db, now);
    let s = row.state;
    const participantIds = [...s.members, ...s.waiting].map((m) => m.id);
    const live = participantIds.length
      ? await db
          .prepare(
            "SELECT id FROM users WHERE deleted_at IS NULL AND id IN (" +
              participantIds.map(() => "?").join(",") +
              ")",
          )
          .bind(...participantIds)
          .all()
      : { results: [] };
    const ids = new Set(live.results.map((u: any) => u.id));
    const clean = structuredClone(s);
    clean.waiting = clean.waiting.filter((m) => ids.has(m.id));
    if (clean.phase === "enrollment") clean.members = clean.members.filter((m) => ids.has(m.id));
    else
      for (const m of clean.members) {
        if (!ids.has(m.id)) {
          m.left = true;
          m.name = "Conta excluída";
          m.role = "";
          m.avatar = null;
          m.pending = null;
        }
      }
    if (clean.phase === "enrollment")
      while (clean.members.length < 6 && clean.waiting.length)
        clean.members.push(clean.waiting.shift()!);
    const next = advanceCampaign(clean, now);
    try {
      if (JSON.stringify(next) !== JSON.stringify(s)) {
        const saved = await saveStory(db, next, row.revision);
        s = saved.state;
      } else s = next;
      if (
        (s.phase === "ended" || s.phase === "unformed") &&
        s.closed !== null &&
        now >= s.closed + 3600000
      ) {
        const revision = (await storyRow(db, s.id))!.revision;
        const n = newCampaign(now);
        await db.batch([
          db
            .prepare(
              "UPDATE story_campaigns SET active=NULL WHERE id=? AND active=1 AND revision=?",
            )
            .bind(s.id, revision),
          db
            .prepare(
              "INSERT INTO story_campaigns(id,active,state_json,created_at) SELECT ?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM story_campaigns WHERE active=1)",
            )
            .bind(n.id, JSON.stringify(n), now),
        ]);
        return (await storyRow(db))!;
      }
      return (await storyRow(db))!;
    } catch (e) {
      if (!(e instanceof StoryError && e.status === 409)) throw e;
    }
  }
  throw new StoryError("A campanha está recebendo atualizações. Tente novamente.", 409);
}
export async function changeStory(
  db: any,
  id: string,
  revision: number,
  user: any,
  p: any,
  now = Date.now(),
  dice?: number[],
) {
  const current = await tickStories(db, now);
  if (current.state.id !== id || current.revision !== revision)
    throw new StoryError("A campanha mudou. Atualize para continuar.", 409);
  return saveStory(db, mutateCampaign(current.state, user, p, now, dice), revision, user.id);
}
export function storyView(s: Campaign, userId: string | null) {
  const joined = !!userId && s.members.some((m) => m.id === userId && !m.left);
  const own = [...s.members, ...s.waiting].find((m) => m.id === userId);
  const visible = (m: Member) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    avatar: m.avatar,
    talent: m.talent,
    absent: m.absent,
    left: m.left,
    acted: m.acted,
    practice: m.practice,
  });
  return {
    id: s.id,
    phase: s.phase,
    enrollEnd: s.enrollEnd,
    start: s.start,
    end: s.end,
    round: s.round,
    roundEnd: s.roundEnd,
    closed: s.closed,
    ending: s.ending,
    members: s.members.map(visible),
    waitingCount: s.waiting.length,
    waitingPosition: own && !joined ? s.waiting.findIndex((m) => m.id === userId) + 1 : 0,
    me: own
      ? {
          ...visible(own),
          pending: own.pending,
          boon: own.boon,
          focus: own.focus,
          activities: own.activities,
          reflections: own.reflections || [],
        }
      : null,
    joined,
    materials: s.materials,
    funds: s.funds,
    diagnosed: s.diagnosed,
    repair: s.repair,
    water: s.water,
    layout: s.layout,
    setups: s.setups,
    proposals: joined ? s.proposals : [],
    events: joined ? s.events : [],
  };
}
export async function storyMessages(db: any, campaignId: string, userId: string) {
  const row = await storyRow(db, campaignId);
  if (!row || !row.state.members.some((m) => m.id === userId && !m.left))
    throw new StoryError("Conversa restrita aos participantes.", 403);
  const result = await db
    .prepare(
      "SELECT m.id,m.author_id,m.body,m.created_ms,u.display_name,u.deleted_at FROM story_messages m JOIN users u ON u.id=m.author_id WHERE m.campaign_id=? ORDER BY m.id DESC LIMIT 80",
    )
    .bind(campaignId)
    .all();
  return result.results.reverse().map((m: any) => ({
    id: m.id,
    author: m.author_id,
    name: m.deleted_at ? "Conta excluída" : m.display_name,
    body: m.deleted_at ? "Mensagem indisponível." : m.body,
    at: m.created_ms,
  }));
}
export async function sendStoryMessage(
  db: any,
  id: string,
  userId: string,
  clientId: string,
  body: string,
  now = Date.now(),
) {
  const row = await tickStories(db, now);
  if (
    row.state.id !== id ||
    row.state.phase !== "playing" ||
    !row.state.members.some((m) => m.id === userId && !m.left)
  )
    throw new StoryError("A conversa não está disponível.", 403);
  if (
    typeof clientId !== "string" ||
    !/^[-a-zA-Z0-9]{8,60}$/.test(clientId) ||
    typeof body !== "string" ||
    !body.trim() ||
    body.length > 1500
  )
    throw new StoryError("Escreva até 1.500 caracteres.");
  const retry = await db
    .prepare("SELECT id FROM story_messages WHERE campaign_id=? AND author_id=? AND client_id=?")
    .bind(id, userId, clientId)
    .first();
  if (retry) return;
  const saved = await db
    .prepare(
      "INSERT INTO story_messages(campaign_id,author_id,client_id,body,created_ms) SELECT ?,id,?,?,? FROM users WHERE id=? AND deleted_at IS NULL AND (SELECT count(*) FROM story_messages WHERE author_id=? AND created_ms>?)<8 ON CONFLICT DO NOTHING RETURNING id",
    )
    .bind(id, clientId, body.trim(), now, userId, userId, now - 60000)
    .first();
  if (!saved) throw new StoryError("Muitas mensagens seguidas. Aguarde um minuto.", 429);
}
export async function storyProfile(db: any, userId: string) {
  const rows = await db
    .prepare("SELECT state_json FROM story_campaigns ORDER BY created_at DESC LIMIT 100")
    .all();
  const campaigns = rows.results
    .map((r: any) => JSON.parse(r.state_json) as Campaign)
    .filter((s: Campaign) => s.members.some((m) => m.id === userId));
  return {
    campaigns: campaigns.map((s: Campaign) => {
      const m = s.members.find((m) => m.id === userId)!;
      return {
        id: s.id,
        phase: s.phase,
        rounds: m.acted.length,
        practice: m.practice,
        role: m.role,
      };
    }),
    completed: campaigns.filter(
      (s: Campaign) =>
        s.phase === "ended" &&
        s.outcome !== "interrupted" &&
        s.members.find((m) => m.id === userId)!.acted.length > 0,
    ).length,
  };
}

export async function appendMaster(
  db: any,
  userId: string,
  id: string,
  revision: number,
  text: string,
  now = Date.now(),
) {
  const row = await tickStories(db, now);
  if (row.state.id !== id || row.revision !== revision)
    throw new StoryError("A cena mudou durante a resposta. Atualize e tente novamente.", 409);
  const s = structuredClone(row.state);
  const m = s.members.find((m) => m.id === userId && !m.left && !m.absent);
  if (!m || s.phase !== "playing") throw new StoryError("Campanha indisponível.", 403);
  s.events.push({
    id: crypto.randomUUID(),
    at: now,
    round: s.round,
    actor: userId,
    kind: "master",
    text: text.slice(0, 1400),
  });
  return saveStory(db, s, revision, userId);
}
