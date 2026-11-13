import {
  AIRMAIL_ACHIEVEMENTS,
  FLIGHT_VERSION,
  FlightError,
  replayFlight,
  playerLevel,
} from "./airmail";
const GAME = "airmail";
async function active(db: any, userId: string) {
  if (
    !(await db
      .prepare("SELECT id FROM users WHERE id=? AND deleted_at IS NULL")
      .bind(userId)
      .first())
  )
    throw new FlightError("Entre novamente para registrar seus voos.", 401);
}
export async function gameProfile(db: any, userId: string) {
  const user = await db
    .prepare("SELECT id FROM users WHERE id=? AND deleted_at IS NULL")
    .bind(userId)
    .first();
  if (!user) return null;
  const [stats, earned] = await Promise.all([
    db
      .prepare(
        `SELECT game_id,count(*) AS plays,COALESCE(sum(score),0) AS points,COALESCE(max(score),0) AS best,COALESCE(sum(deliveries),0) AS deliveries FROM arcade_runs WHERE user_id=? AND status='finished' GROUP BY game_id`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        "SELECT game_id,key,xp,earned_at FROM game_achievements WHERE user_id=? ORDER BY earned_at DESC,key",
      )
      .bind(userId)
      .all(),
  ]);
  const xp = earned.results.reduce((n: number, a: any) => n + a.xp, 0);
  return {
    xp,
    ...playerLevel(xp),
    games: stats.results.map((r: any) => ({
      id: r.game_id,
      name: r.game_id === GAME ? "Correio Aéreo" : r.game_id,
      plays: r.plays,
      points: r.points,
      best: r.best,
      deliveries: r.deliveries,
    })),
    achievements: earned.results.map((a: any) => {
      const info = a.game_id === GAME ? AIRMAIL_ACHIEVEMENTS.find((t) => t.key === a.key) : null;
      return {
        gameId: a.game_id,
        key: a.key,
        xp: a.xp,
        earnedAt: a.earned_at,
        title:
          info?.title ||
          (a.game_id === "rpg"
            ? a.key === "first-test"
              ? "Primeira decisão"
              : "O coreto e a sombra"
            : a.game_id === "stories"
              ? a.key === "first-action"
                ? "Primeiro passo em grupo"
                : "Uma história vivida"
              : "Conquista"),
        description: info?.description || "",
        icon: info?.icon || "🏅",
      };
    }),
  };
}
const validId = (v: unknown) =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export async function startFlight(db: any, userId: string, id: string, now = Date.now()) {
  await active(db, userId);
  if (!validId(id)) throw new FlightError("Identificador inválido.");
  const previous = await db.prepare("SELECT * FROM arcade_runs WHERE id=?").bind(id).first();
  if (previous) {
    if (
      previous.user_id !== userId ||
      previous.game_id !== GAME ||
      previous.status !== "playing" ||
      previous.version !== FLIGHT_VERSION ||
      now - previous.started_ms > 900000
    )
      throw new FlightError("Essa partida não está disponível.", 409);
    return { id: previous.id, seed: previous.seed, version: previous.version };
  }
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const row = await db
    .prepare(
      `INSERT INTO arcade_runs(id,user_id,game_id,version,seed,started_ms) SELECT ?,id,?,?,?,? FROM users WHERE id=? AND deleted_at IS NULL AND (SELECT count(*) FROM arcade_runs WHERE user_id=? AND started_ms>?)<12 ON CONFLICT(id) DO NOTHING RETURNING id,seed,version`,
    )
    .bind(id, GAME, FLIGHT_VERSION, seed, now, userId, userId, now - 60000)
    .first();
  if (!row) {
    const retry = await db
      .prepare(
        "SELECT id,seed,version FROM arcade_runs WHERE id=? AND user_id=? AND status='playing'",
      )
      .bind(id, userId)
      .first();
    if (retry) return retry;
    throw new FlightError("Muitas largadas seguidas. Aguarde um minuto.", 429);
  }
  return row;
}
export async function finishFlight(db: any, userId: string, p: any, now = Date.now()) {
  await active(db, userId);
  if (!validId(p?.id)) throw new FlightError("Partida inválida.");
  const row = await db
    .prepare("SELECT * FROM arcade_runs WHERE id=? AND user_id=? AND game_id=?")
    .bind(p.id, userId, GAME)
    .first();
  if (!row) throw new FlightError("Partida não encontrada.", 404);
  if (row.version !== FLIGHT_VERSION)
    throw new FlightError("Esta versão do voo mudou. Comece uma nova partida.", 409);
  const replay = JSON.stringify({ frames: p.frames, events: p.events });
  if (replay.length > 50000) throw new FlightError("Comandos demais para esta partida.");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(replay)),
    hash = Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("");
  if (row.status === "finished") {
    if (row.input_hash !== hash)
      throw new FlightError("Essa partida já tem um resultado registrado.", 409);
    return {
      result: JSON.parse(row.result_json),
      profile: await gameProfile(db, userId),
      replayed: true,
      unlocked: [],
    };
  }
  if (now - row.started_ms > 900000)
    throw new FlightError("O prazo de registro desta partida terminou. Comece outro voo.", 410);
  const result = replayFlight(row.seed, p.events, p.frames);
  if (now - row.started_ms < (result.frames / 30) * 1000 - 1500)
    throw new FlightError("O tempo da partida não corresponde ao voo.", 409);
  const earned = AIRMAIL_ACHIEVEMENTS.filter((a) => a.test(result));
  const queries = [
    db
      .prepare(
        `UPDATE arcade_runs SET status='finished',finished_ms=?,score=?,deliveries=?,result_json=?,replay_json=?,input_hash=? WHERE id=? AND user_id=? AND status='playing' AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL)`,
      )
      .bind(
        now,
        result.score,
        result.deliveries,
        JSON.stringify(result),
        replay,
        hash,
        p.id,
        userId,
        userId,
      ),
    ...earned.map((a) =>
      db
        .prepare(
          `INSERT INTO game_achievements(user_id,game_id,key,xp,run_id) SELECT user_id,game_id,?,?,id FROM arcade_runs WHERE id=? AND user_id=? AND status='finished' AND input_hash=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND deleted_at IS NULL) ON CONFLICT(user_id,game_id,key) DO NOTHING`,
        )
        .bind(a.key, a.xp, p.id, userId, hash, userId),
    ),
  ];
  const results = await db.batch(queries);
  const saved = await db
    .prepare("SELECT * FROM arcade_runs WHERE id=? AND user_id=?")
    .bind(p.id, userId)
    .first();
  if (saved?.status !== "finished" || saved.input_hash !== hash)
    throw new FlightError("Outro resultado já foi registrado para este voo.", 409);
  return {
    result: JSON.parse(saved.result_json),
    profile: await gameProfile(db, userId),
    replayed: !results[0]?.meta?.changes,
    unlocked: earned
      .filter((_, i) => (results[i + 1]?.meta?.changes || 0) > 0)
      .map((a) => ({ key: a.key, title: a.title, xp: a.xp, icon: a.icon })),
  };
}
