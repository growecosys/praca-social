import Link from "next/link";
import NatureSpot from "./nature-spot";
import type { connectionNetwork } from "../lib/connection-network";
type Data = Awaited<ReturnType<typeof connectionNetwork>>;
const labels: Record<string, string> = {
  gathering: "Reunindo gente",
  active: "Em ação",
  completed: "Missão cumprida",
  interrupted: "Interrompido",
  archived: "Arquivado",
  help: "Ajudar alguém",
  solve: "Resolver um problema",
  make: "Fazer algo acontecer",
};
export default function ConnectionsDirectory({
  data,
  view,
  compact = false,
}: {
  data: Data;
  view: "people" | "circles";
  compact?: boolean;
}) {
  if (view === "people")
    return (
      <section id="pessoas" className="rounded-xl border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-6">
        <h2 className="font-serif text-3xl">
          Seus contatos <span className="text-xl text-[#667064]">· {data.people.length}</span>
        </h2>
        <p className="mt-2 text-sm text-[#667064]">
          Pessoas com quem você já estabeleceu uma conexão.
        </p>
        <div className="mt-4 space-y-3">
          {(compact ? data.people.slice(0, 6) : data.people).map((p) => (
            <article
              key={p.id}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-[#d8d0c1] p-3"
            >
              <img src={`/avatar/${p.id}`} alt="" className="size-11 rounded-full object-cover" />
              <a
                href={`/u/${p.username}`}
                className="min-w-0 flex-1 break-words text-sm font-semibold"
              >
                {p.displayName}
              </a>
              <details className="relative shrink-0">
                <summary
                  aria-label={`Ações com ${p.displayName}`}
                  className="grid size-11 cursor-pointer list-none place-items-center rounded-lg border text-xl"
                >
                  ⋯
                </summary>
                <div className="absolute right-0 top-full z-20 min-w-52 rounded-lg border border-[#c8c0b1] bg-[#f5f1e8] p-2 shadow-lg">
                  <a href={`/u/${p.username}`} className="flex min-h-11 items-center px-3 text-sm">
                    Visitar perfil
                  </a>
                  <a
                    href={`/circulos/novo?invite=${p.id}`}
                    className="flex min-h-11 items-center px-3 text-sm"
                  >
                    Criar círculo com esta pessoa
                  </a>
                </div>
              </details>
            </article>
          ))}
        </div>
        {!data.people.length && (
          <p className="mt-5 text-sm">
            Uma cutucada retribuída cria um contato. Explore os perfis no Mural.
          </p>
        )}
        {compact && data.people.length > 6 && (
          <a
            href="/conexoes?view=people"
            className="mt-4 inline-flex min-h-11 items-center text-sm underline"
          >
            Ver todos os contatos →
          </a>
        )}
      </section>
    );
  const own = data.ownCircles.filter((c) => c.status !== "archived");
  const explore = data.circles.filter(
    (c) => !data.ownCircles.some((o) => o.id === c.id) && c.status !== "archived",
  );
  function cards(list: Data["circles"]) {
    return (
      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        {list.map((c) => (
          <article key={c.id} className="rounded-lg border border-[#d8d0c1] p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{c.emblem}</span>
              <div className="min-w-0 flex-1">
                <a href={`/circulos/${c.id}`} className="break-words font-serif text-2xl">
                  {c.name}
                </a>
                <p className="mt-1 text-xs text-[#667064]">
                  {labels[c.status]} · {data.members.filter((m) => m.circleId === c.id).length}{" "}
                  participantes
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-[#667064]">{c.mission}</p>
            <a
              href={`/circulos/${c.id}`}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline"
            >
              {data.mine.find((m) => m.circleId === c.id)?.status === "invited"
                ? "Responder convite"
                : "Abrir círculo"}{" "}
              →
            </a>
          </article>
        ))}
      </div>
    );
  }
  return (
    <section id="circulos" className="rounded-xl border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-6">
      <NatureSpot kind="card" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl">
          Seus círculos <span className="text-xl text-[#667064]">· {own.length}</span>
        </h2>
        <Link
          href="/circulos/novo"
          className="inline-flex min-h-11 items-center rounded-lg bg-[#f0c64b] px-4 text-sm font-semibold"
        >
          + Criar círculo
        </Link>
      </div>
      {cards(compact ? own.slice(0, 3) : own)}
      {!own.length && (
        <p className="mt-5 text-sm text-[#667064]">
          Reúna seus contatos em uma missão: ajudar alguém, resolver um problema ou fazer algo
          acontecer.
        </p>
      )}
      {!compact && data.deletedCircles.length > 0 && (
        <details className="mt-6 border-t pt-3">
          <summary className="py-3 font-semibold">
            Círculos excluídos · {data.deletedCircles.length}
          </summary>
          {data.deletedCircles.map((c) => (
            <a key={c.id} href={`/circulos/${c.id}`} className="block py-3 underline">
              {c.emblem} {c.name} · Restaurar
            </a>
          ))}
        </details>
      )}
      {compact ? (
        <a
          href="/conexoes?view=circles"
          className="mt-4 inline-flex min-h-11 items-center text-sm underline"
        >
          Explorar círculos →
        </a>
      ) : (
        <details className="mt-6 border-t pt-3">
          <summary className="py-3 font-semibold">
            Conheça outros círculos · {explore.length}
          </summary>
          {cards(explore)}
          {!explore.length && (
            <p className="py-4 text-sm">Nenhum outro círculo público por enquanto.</p>
          )}
        </details>
      )}
    </section>
  );
}
