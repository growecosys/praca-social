import { env } from "cloudflare:workers";
import { Plane, Gamepad2, Trophy } from "lucide-react";
import { gameProfile } from "../lib/arcade-store";
import RpgProfile from "./rpg-profile";
import StoriesProfile from "./stories-profile";
import { AIRMAIL_ACHIEVEMENTS } from "../lib/airmail";
export default async function ProfileGames({
  userId,
  owner = false,
}: {
  userId: string;
  owner?: boolean;
}) {
  const p = await gameProfile(env.DB, userId);
  if (!p) return null;
  const air = p.games.find((g: any) => g.id === "airmail");
  return (
    <section
      id="jogos"
      className="mt-12 scroll-mt-24 border-y border-[#c8c0b1] py-8"
      data-no-translate
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#667064]">
            <Gamepad2 size={16} />
            Jogos da Praça
          </p>
          <h2 className="mt-3 font-serif text-3xl">
            Nível {p.level} <span className="text-lg text-[#667064]">· {p.xp} XP</span>
          </h2>
        </div>
        <a
          href="/jogar"
          className="inline-flex min-h-11 items-center gap-2 border border-[#244e35] px-4 text-sm font-semibold"
        >
          <Plane size={16} />
          Jogar
        </a>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden bg-[#dfe1d2]"
        role="progressbar"
        aria-label="Progresso de nível nos jogos"
        aria-valuenow={p.progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-[#5b7e4d]" style={{ width: p.progress + "%" }} />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#667064]">
        {p.next ? `${p.next - p.xp} XP para o nível ${p.level + 1}. ` : ""}Cada conquista concede XP
        uma única vez. Os pontos das partidas ficam registrados por jogo.
      </p>
      <StoriesProfile userId={userId} owner={owner} />
      <article className="mt-6 border border-[#c8c0b1] bg-[#fbf8f1] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-serif text-2xl">
            <Plane size={21} />
            Correio Aéreo
          </h3>
          {air && (
            <span className="inline-flex items-center gap-2 text-sm">
              <Trophy size={16} />
              {air.best.toLocaleString("pt-BR")} · recorde
            </span>
          )}
        </div>
        {air ? (
          <dl className="mt-5 grid grid-cols-3 gap-3">
            {[
              [air.points, "pontos acumulados"],
              [air.deliveries, "entregas"],
              [air.plays, "partidas"],
            ].map(([n, label]) => (
              <div key={String(label)}>
                <dd className="font-serif text-2xl">{Number(n).toLocaleString("pt-BR")}</dd>
                <dt className="mt-1 text-xs leading-5 text-[#667064]">{label}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[#667064]">
            {owner
              ? "Seu primeiro voo vai inaugurar este histórico. Entre no Correio Aéreo para registrar pontos e conquistas."
              : "Ainda sem voos registrados."}
          </p>
        )}
      </article>
      <RpgProfile userId={userId} owner={owner} />
      <h3 className="mt-7 font-serif text-2xl">
        Conquistas do Correio Aéreo{" "}
        <span className="text-base text-[#667064]">
          · {p.achievements.filter((a: any) => a.gameId === "airmail").length}/
          {AIRMAIL_ACHIEVEMENTS.length}
        </span>
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AIRMAIL_ACHIEVEMENTS.map((a) => {
          const earned = p.achievements.find((e: any) => e.gameId === "airmail" && e.key === a.key);
          return (
            <article
              key={a.key}
              className={`border p-4 ${earned ? "border-[#a2b18a] bg-[#f3eedb]" : "border-dashed border-[#c8c0b1]"}`}
            >
              <span
                className={`text-2xl ${earned ? "" : "grayscale opacity-40"}`}
                aria-hidden="true"
              >
                {a.icon}
              </span>
              <h4 className="mt-2 text-sm font-semibold">{a.title}</h4>
              <p className="mt-1 text-xs leading-5 text-[#667064]">{a.description}</p>
              <p className="mt-3 text-xs font-semibold text-[#526b44]">
                {earned ? "Conquistado" : "A conquistar"} · {a.xp} XP
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
