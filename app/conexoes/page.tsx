import Link from "next/link";
export const metadata = { title: "Conexões — Praça" };
import NatureSpot from "../../components/nature-spot";
import PageBack from "../../components/page-back";
import { and, desc, eq, inArray, notInArray, or, lte, sql } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { connectionNetwork } from "../../lib/connection-network";
import ConnectionMap from "../../components/connection-map";
import ConnectionsDirectory from "../../components/connections-directory";
import ConnectionsToolbar from "../../components/connections-toolbar";
import PokeInboxActions from "../../components/poke-inbox-actions";
import SentConnectionActions from "../../components/sent-connection-actions";
import SiteHeader from "../../components/site-header";
import { getDb } from "../../db";
import { pokes, posts, users, nowText } from "../../db/schema";
import { getPracaUser } from "../../lib/praca-auth";

export const dynamic = "force-dynamic";
const KIND: Record<string, { label: string; detail: string; action: string; icon: string }> = {
  opinion: {
    label: "Pedido de parecer",
    detail: "Uma opinião foi solicitada nesta publicação.",
    action: "Responder",
    icon: "💬",
  },
  thread: {
    label: "Convite para a roda",
    detail: "Uma publicação foi compartilhada diretamente com você.",
    action: "Entrar na conversa",
    icon: "🪑",
  },
  reminder: {
    label: "Lembrei de você",
    detail: "Uma publicação foi enviada como um gesto pessoal.",
    action: "Ver publicação",
    icon: "💡",
  },
  publish: {
    label: "Passagem da palavra",
    detail: "Alguém convidou você a publicar no Mural.",
    action: "Aceitar a palavra",
    icon: "✍️",
  },
  missing: {
    label: "Chamado de presença",
    detail: "Sua ausência foi notada por outro habitante.",
    action: "Reaparecer",
    icon: "👀",
  },
  mystery: {
    label: "Aproximação",
    detail: "Cutucar de volta estabelece a conexão e arquiva esta aproximação.",
    action: "Ver perfil",
    icon: "👉",
  },
};
type Item = {
  id: number;
  createdAt: string;
  status: string;
  kind: string;
  seenAt?: string | null;
  name: string;
  username: string;
  avatarId: string;
  avatarVersion: number;
  targetSlug: string | null;
  targetTitle: string | null;
  incoming: boolean;
};

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; type?: string; page?: string }>;
}) {
  const user = await getPracaUser(),
    query = await searchParams;
  if (!user)
    return (
      <main className="min-h-screen bg-[#f5f1e8] text-[#14261b]">
        <SiteHeader active="conexoes" />
        <section id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-4xl px-5 py-12">
          <PageBack />
          <NatureSpot kind="title" />
          <h1 className="font-serif text-6xl">Conexões</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#667064]">
            Seus contatos, círculos e próximos passos, juntos no mesmo lugar.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Pessoas", "Uma cutucada retribuída abre uma conexão."],
              ["Círculos", "Reúna contatos em uma missão coletiva."],
              ["Pendências", "Responda convites e pedidos sem perder o fio."],
            ].map(([title, copy]) => (
              <article key={title} className="rounded-xl border border-[#c8c0b1] bg-[#fbf8f1] p-5">
                <h2 className="font-serif text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-6">{copy}</p>
              </article>
            ))}
          </div>
          <a
            href="/entrar"
            className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-[#244e35] px-5 font-semibold text-white"
          >
            Entrar para ver minhas conexões →
          </a>
        </section>
      </main>
    );
  const db = getDb(),
    data = await connectionNetwork(user.id);
  const archived = ["archived", "history"].includes(query.view || "");
  const overview = !query.view || query.view === "overview";
  const page = Math.max(0, Math.min(10000, Math.floor(Number(query.page) || 0)));
  const openStates = ["pending", "seen", "accepted"];
  await db
    .update(pokes)
    .set({ status: "archived", resolvedAt: nowText })
    .where(
      and(
        or(eq(pokes.recipientId, user.id), eq(pokes.senderId, user.id)),
        inArray(pokes.status, ["pending", "seen"]),
        lte(pokes.expiresAt, nowText),
      ),
    );
  const stateFilter = archived
    ? notInArray(pokes.status, openStates)
    : inArray(pokes.status, openStates);
  const typeFilter = query.type && KIND[query.type] ? eq(pokes.kind, query.type) : undefined;
  const fields = {
    id: pokes.id,
    createdAt: pokes.createdAt,
    status: pokes.status,
    kind: pokes.kind,
    seenAt: pokes.seenAt,
    name: users.displayName,
    username: users.username,
    avatarId: users.id,
    avatarVersion: users.imageGenerationsUsed,
    targetSlug: posts.slug,
    targetTitle: posts.title,
  };
  const [received, sent, totals] = await Promise.all([
    db
      .select(fields)
      .from(pokes)
      .innerJoin(users, eq(pokes.senderId, users.id))
      .leftJoin(posts, eq(pokes.targetPostId, posts.id))
      .where(and(eq(pokes.recipientId, user.id), stateFilter, typeFilter))
      .orderBy(desc(pokes.createdAt), desc(pokes.id))
      .limit(30)
      .offset(page * 30),
    db
      .select(fields)
      .from(pokes)
      .innerJoin(users, eq(pokes.recipientId, users.id))
      .leftJoin(posts, eq(pokes.targetPostId, posts.id))
      .where(and(eq(pokes.senderId, user.id), stateFilter, typeFilter))
      .orderBy(desc(pokes.createdAt), desc(pokes.id))
      .limit(30)
      .offset(page * 30),
    db
      .select({
        pending: sql<number>`sum(case when recipient_id=${user.id} and status in ('pending','seen','accepted') then 1 else 0 end)`,
        sent: sql<number>`sum(case when sender_id=${user.id} and status in ('pending','seen','accepted') then 1 else 0 end)`,
        archived: sql<number>`sum(case when status not in ('pending','seen','accepted') then 1 else 0 end)`,
      })
      .from(pokes)
      .where(or(eq(pokes.senderId, user.id), eq(pokes.recipientId, user.id))),
  ]);
  const count = totals[0] || { pending: 0, sent: 0, archived: 0 };
  const all: Item[] = [
    ...received.map((i) => ({ ...i, incoming: true })),
    ...sent.map((i) => ({ ...i, incoming: false })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const visible = archived
    ? all
    : query.view === "sent"
      ? all.filter((i) => !i.incoming)
      : all.filter((i) => i.incoming);
  const shown = overview ? visible.slice(0, 5) : visible;
  const href = (page: number) =>
    `/conexoes?view=${archived ? "archived" : query.view || "pending"}${query.type ? "&type=" + encodeURIComponent(query.type) : ""}&page=${page}`;
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteHeader active="conexoes" />
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8"
      >
        <PageBack />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <NatureSpot kind="title" />
            <h1 className="font-serif text-[clamp(3.5rem,8vw,6rem)] leading-none tracking-tight">
              Conexões
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-7 text-[#667064]">
              Pessoas próximas, missões em comum e o que espera uma resposta.
            </p>
          </div>
          <Link
            href="/circulos/novo"
            className="inline-flex min-h-11 items-center rounded-lg bg-[#f0c64b] px-5 text-sm font-semibold"
          >
            + Criar círculo
          </Link>
        </div>
        <nav aria-label="Seções de Conexões" className="my-7 flex flex-wrap gap-2">
          {[
            ["overview", "Visão geral"],
            ["pending", `Para você · ${count.pending || 0}`],
            ["sent", `Enviadas · ${count.sent || 0}`],
            ["archived", `Arquivadas · ${count.archived || 0}`],
          ].map(([view, label]) => (
            <a
              key={view}
              href={view === "overview" ? "/conexoes" : `/conexoes?view=${view}`}
              aria-current={
                (overview && view === "overview") ||
                query.view === view ||
                (archived && view === "archived")
                  ? "page"
                  : undefined
              }
              className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold ${(overview && view === "overview") || query.view === view || (archived && view === "archived") ? "border-[#244e35] bg-[#244e35] text-white" : "border-[#c8c0b1]"}`}
            >
              {label}
            </a>
          ))}
        </nav>
        {overview ? (
          <>
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <ConnectionsDirectory data={data} view="circles" compact />
              <div className="space-y-5">
                <ConnectionsDirectory data={data} view="people" compact />
                <section className="rounded-xl border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-serif text-3xl">
                      Pendências{" "}
                      <span className="text-xl text-[#667064]">· {count.pending || 0}</span>
                    </h2>
                    <ConnectionsToolbar pending={Number(count.pending) || 0} />
                  </div>
                  <p className="mt-2 text-sm text-[#667064]">
                    Pedidos e aproximações que esperam você.
                  </p>
                  {shown.map((item) => (
                    <ConnectionCard key={item.id} item={item} />
                  ))}
                  {!shown.length && (
                    <p className="py-8 text-sm">Tudo em ordem. Nenhuma resposta pendente.</p>
                  )}
                  <a
                    href="/conexoes?view=pending"
                    className="mt-4 inline-flex min-h-11 items-center text-sm underline"
                  >
                    Ver todas as pendências →
                  </a>
                  {Boolean(count.sent) && (
                    <a
                      href="/conexoes?view=sent"
                      className="ml-4 inline-flex min-h-11 items-center text-sm underline"
                    >
                      Acompanhar enviadas →
                    </a>
                  )}
                </section>
              </div>
            </div>
            <div className="mt-7">
              <ConnectionMap
                self={{ id: user.id, username: user.username, displayName: user.displayName }}
                people={data.people}
                edges={data.edges}
                circles={data.ownCircles.filter((c) => c.status !== "archived")}
                members={data.members}
              />
            </div>
          </>
        ) : ["people", "circles"].includes(query.view || "") ? (
          <ConnectionsDirectory data={data} view={query.view as "people" | "circles"} />
        ) : (
          <section className="rounded-xl border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-6">
            <h2 className="font-serif text-3xl">
              {archived
                ? "Interações arquivadas"
                : query.view === "sent"
                  ? "Enviadas em aberto"
                  : "Esperam você"}
            </h2>
            <p className="mt-3 text-sm text-[#667064]">
              {archived
                ? "Concluídas, recusadas, canceladas e arquivadas. Os registros continuam disponíveis aqui."
                : "Somente interações ainda em aberto. Tudo que foi encerrado fica em Arquivadas."}
            </p>
            <details className="mt-4 border-y py-2" open={Boolean(query.type)}>
              <summary className="py-3 text-sm font-semibold">
                Filtrar por tipo{query.type ? ": " + (KIND[query.type]?.label || "Todos") : ""}
              </summary>
              <div className="flex flex-wrap gap-2 pb-3">
                <a
                  href={`/conexoes?view=${archived ? "archived" : query.view || "pending"}`}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Todos os tipos
                </a>
                {Object.entries(KIND).map(([value, copy]) => (
                  <a
                    key={value}
                    href={`/conexoes?view=${archived ? "archived" : query.view || "pending"}&type=${value}`}
                    className={`rounded-lg border px-3 py-2 text-sm ${query.type === value ? "bg-[#244e35] text-white" : ""}`}
                  >
                    {copy.icon} {copy.label}
                  </a>
                ))}
              </div>
            </details>
            {shown.map((item) => (
              <ConnectionCard key={item.id} item={item} />
            ))}
            {!shown.length && <p className="py-10 text-sm">Nenhuma interação nesta seleção.</p>}
            <nav aria-label="Paginação de interações" className="mt-5 flex flex-wrap gap-4">
              {page > 0 && (
                <a className="inline-flex min-h-11 items-center underline" href={href(page - 1)}>
                  ← Anteriores
                </a>
              )}
              {(archived
                ? received.length === 30 || sent.length === 30
                : query.view === "sent"
                  ? sent.length === 30
                  : received.length === 30) && (
                <a className="inline-flex min-h-11 items-center underline" href={href(page + 1)}>
                  Próximas →
                </a>
              )}
            </nav>
            {archived && data.ownCircles.some((c) => c.status === "archived") && (
              <details className="mt-6 border-t pt-4">
                <summary className="py-3 font-semibold">Círculos arquivados</summary>
                {data.ownCircles
                  .filter((c) => c.status === "archived")
                  .map((c) => (
                    <a key={c.id} href={`/circulos/${c.id}`} className="block py-3 underline">
                      {c.emblem} {c.name}
                    </a>
                  ))}
              </details>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
function ConnectionCard({ item }: { item: Item }) {
  const copy = KIND[item.kind] || KIND.mystery;
  const open = ["pending", "seen", "accepted"].includes(item.status);
  return (
    <article id={`connection-${item.id}`} className="border-b border-[#c8c0b1] py-6">
      <div className="flex items-start gap-4">
        <a href={`/u/${item.username}`}>
          <img
            src={`/avatar/${item.avatarId}?v=${item.avatarVersion}`}
            alt=""
            className="size-12 rounded-full border object-cover"
          />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              {copy.icon}
            </span>
            <p className="font-semibold">{copy.label}</p>
            <span className="text-[#8a8d86]">·</span>
            <a href={`/u/${item.username}`} className="text-sm hover:underline">
              {item.incoming ? "de" : "para"} {item.name}
            </a>
            {item.incoming ? (
              <ArrowDownLeft size={15} className="text-[#df5c45]" />
            ) : (
              <ArrowUpRight size={15} className="text-[#244e35]" />
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-[#667064]">{copy.detail}</p>
          {item.targetSlug && (
            <a
              href={`/p/${item.targetSlug}`}
              className="mt-2 block border-l-2 border-[#f0c64b] pl-3 text-sm font-medium hover:underline"
            >
              “{item.targetTitle}”
            </a>
          )}
          <p className="mt-2 text-xs text-[#8a8d86]">
            {formatDate(item.createdAt)} ·{" "}
            <strong>{statusLabel(item.status, item.incoming)}</strong>
          </p>
          {item.incoming && open && (
            <PokeInboxActions
              id={item.id}
              username={item.username}
              kind={item.kind}
              actionLabel={item.status === "accepted" ? "Continuar" : copy.action}
            />
          )}
          {!item.incoming && open && <SentConnectionActions id={item.id} />}
        </div>
      </div>
    </article>
  );
}
function statusLabel(status: string, incoming: boolean) {
  const labels: Record<string, string> = {
    pending: incoming ? "nova" : "enviada",
    seen: incoming ? "aguarda sua decisão" : "visualizada",
    accepted: "aceita, aguardando conclusão",
    completed: "concluída",
    attended: "atendida",
    returned: "devolvida",
    declined: "recusada",
    cancelled: "cancelada por quem enviou",
    archived: "arquivada",
    expired: "expirada",
  };
  return labels[status] || status;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}
