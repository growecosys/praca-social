import { env } from "cloudflare:workers";
import { readRpg } from "../lib/rpg-store";
import { SKILLS, skillKeys, publicRpg } from "../lib/rpg";
export default async function RpgProfile({ userId, owner }: { userId: string; owner: boolean }) {
  const row = await readRpg(env.DB, userId);
  const s = row ? publicRpg(row.state) : null;
  return (
    <article className="mt-5 border border-[#c8c0b1] bg-[#ebe9da] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-2xl">RPG da Praça</h3>
        {owner && (
          <a className="text-sm underline" href="/jogar/rpg">
            {s ? (s.ended ? "Rever aventura" : "Continuar aventura") : "Criar minha ficha"} →
          </a>
        )}
      </div>
      {s ? (
        <>
          <p className="mt-3 font-serif text-lg">{s.role}</p>
          <p className="mt-2 text-sm">
            {s.ended ? "Capítulo concluído" : "Em aventura"} · {s.clues} pistas · {s.xp} pontos de
            aventura
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {skillKeys.map((k) => (
              <span key={k}>
                {SKILLS[k]} +{s.skills[k] + Math.min(1, Math.floor(s.growth[k] / 2))}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-[#667064]">
            {s.turn > 0 ? "✦ Primeira decisão · 5 XP" : ""}
            {s.ended ? "　✦ O coreto e a sombra · 20 XP" : ""}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-[#667064]">Ainda sem aventuras registradas.</p>
      )}
    </article>
  );
}
