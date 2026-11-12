export const metadata = { title: "Mural — Praça" };
import MuralNotices from "../../components/mural-notices";
import NatureSpot from "../../components/nature-spot";
import PageBack from "../../components/page-back";
import { desc } from "drizzle-orm";
import { Feather, PenLine } from "lucide-react";
import SiteHeader from "../../components/site-header";
import { getDb } from "../../db";
import { posts, users } from "../../db/schema";
import { firstPostImage } from "../../lib/post-media";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value}Z`))
    .replace(".", "");
}

function excerpt(value: string) {
  const clean = value
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\/?media\/[^\s)]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 220 ? `${clean.slice(0, 217).trimEnd()}…` : clean;
}

export default async function Mural() {
  const db = getDb();
  const [published, people] = await Promise.all([
    db.select().from(posts).orderBy(desc(posts.createdAt)).limit(60),
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        imageGenerationsUsed: users.imageGenerationsUsed,
      })
      .from(users),
  ]);
  const personById = new Map(people.map((person) => [person.id, person]));
  const [latest, ...rest] = published;
  const latestPerson = latest ? personById.get(latest.ownerId) : null;

  return (
    <main className="nature-mural-page min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteHeader active="mural" />

      <div className="nature-mural-background nature-mural-canopy">
        <NatureSpot kind="card" showcase scene="branch" />
      </div>
      <div className="nature-mural-background nature-mural-water">
        <NatureSpot kind="margin" showcase scene="waterline" />
      </div>
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="nature-mural-content relative mx-auto max-w-[1160px] px-5 pb-28 pt-14 sm:px-8 md:pt-20"
      >
        <PageBack href="/" label="Voltar ao início" />
        <div className="nature-mural-heading border-b border-[#c8c0b1] pb-9">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#667064]">
              publicações abertas
            </p>
            <NatureSpot kind="title" className="nature-mural-visitor" />
            <h1 className="mt-4 font-serif text-[clamp(3.8rem,10vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.065em]">
              Mural
            </h1>
          </div>
          <p className="nature-mural-description max-w-sm text-base leading-7 text-[#667064]">
            Textos, protocolos, imagens e rastros de trabalho publicados na Praça.
          </p>
        </div>

        <MuralNotices />

        {!latest ? (
          <div className="grid min-h-[48vh] place-items-center text-center">
            <div>
              <Feather className="mx-auto text-[#667064]" size={28} />
              <h2 className="mt-5 font-serif text-4xl">O mural está vazio.</h2>
              <p className="mt-3 text-[#667064]">A primeira publicação pode começar agora.</p>
              <a
                href="/escrever"
                className="mt-7 inline-flex items-center gap-2 border border-[#244e35] px-4 py-3 text-sm font-medium text-[#244e35]"
              >
                <PenLine size={15} /> Escrever o primeiro texto
              </a>
            </div>
          </div>
        ) : (
          <>
            <article className="group grid gap-8 border-b border-[#c8c0b1] py-10 md:grid-cols-[0.7fr_1.3fr] md:py-14">
              <div className="flex flex-col justify-between gap-8">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#667064]">
                  mais recente
                </span>
                <Author person={latestPerson} fallback={latest.author} date={latest.createdAt} />
              </div>
              <div>
                {firstPostImage(latest.contentJson) && (
                  <a
                    href={`/p/${latest.slug}`}
                    className="mb-7 block aspect-[16/8] overflow-hidden bg-[#ded7c9]"
                  >
                    <img
                      src={firstPostImage(latest.contentJson)!}
                      alt=""
                      className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                  </a>
                )}
                <a href={`/p/${latest.slug}`}>
                  <h2 className="font-serif text-[clamp(2.7rem,6vw,5.3rem)] font-medium leading-[0.96] tracking-[-0.045em] decoration-1 underline-offset-8 group-hover:underline">
                    {latest.title}
                  </h2>
                </a>
                {excerpt(latest.content) && (
                  <p className="mt-6 max-w-2xl font-serif text-xl leading-8 text-[#555e53]">
                    {excerpt(latest.content)}
                  </p>
                )}
              </div>
            </article>

            <div className="grid md:grid-cols-2">
              {rest.map((post, index) => (
                <article
                  key={post.id}
                  className={`group flex min-h-72 flex-col justify-between gap-8 border-b border-[#c8c0b1] py-9 md:p-9 ${index % 2 === 0 ? "md:border-r" : ""}`}
                >
                  <div>
                    {firstPostImage(post.contentJson) && (
                      <a
                        href={`/p/${post.slug}`}
                        className="mb-6 block aspect-[16/9] overflow-hidden bg-[#ded7c9]"
                      >
                        <img
                          src={firstPostImage(post.contentJson)!}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </a>
                    )}
                    <p className="text-xs uppercase tracking-[0.16em] text-[#667064]">
                      {formatDate(post.createdAt)}
                    </p>
                    <a href={`/p/${post.slug}`}>
                      <h2 className="mt-5 font-serif text-[clamp(2rem,4vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.035em] decoration-1 underline-offset-6 group-hover:underline">
                        {post.title}
                      </h2>
                    </a>
                    {excerpt(post.content) && (
                      <p className="mt-5 line-clamp-3 font-serif text-lg leading-7 text-[#5d645a]">
                        {excerpt(post.content)}
                      </p>
                    )}
                  </div>
                  <Author person={personById.get(post.ownerId)} fallback={post.author} />
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Author({
  person,
  fallback,
  date,
}: {
  person?: {
    id: string;
    username: string;
    displayName: string;
    imageGenerationsUsed: number;
  } | null;
  fallback: string;
  date?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#667064]">
      {person ? (
        <a href={`/u/${person.username}`} className="shrink-0">
          <img
            src={`/avatar/${person.id}?v=${person.imageGenerationsUsed}`}
            alt=""
            className="size-10 rounded-full border border-[#c8c0b1] object-cover transition hover:scale-105"
          />
        </a>
      ) : null}
      <div>
        {person ? (
          <a href={`/u/${person.username}`} className="font-medium text-[#1f241d] hover:underline">
            {person.displayName}
          </a>
        ) : (
          <span className="text-[#1f241d]">{fallback}</span>
        )}
        {date && (
          <>
            <br />
            {formatDate(date)}
          </>
        )}
      </div>
    </div>
  );
}
