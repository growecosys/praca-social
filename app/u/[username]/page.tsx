import ProfileGames from "../../../components/profile-games";
import PageBack from "../../../components/page-back";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { CalendarDays, Eye, Heart, MessageCircle, PenLine, Share2, Sparkles } from "lucide-react";
import ProfileCircles from "../../../components/profile-circles";
import PokeButton from "../../../components/poke-button";
import SiteHeader from "../../../components/site-header";
import { getDb } from "../../../db";
import { users, profileAliases } from "../../../db/schema";
import { firstPostImage } from "../../../lib/post-media";
import { getPracaUser } from "../../../lib/praca-auth";
import { getProfileSocial } from "../../../lib/profile-social";

export const dynamic = "force-dynamic";

async function findUser(username: string) {
  const handle = decodeURIComponent(username).toLowerCase(),
    db = getDb();
  const direct = (await db.select().from(users).where(eq(users.username, handle)).limit(1))[0];
  if (direct) return direct.deletedAt ? null : direct;
  const alias = (
    await db.select().from(profileAliases).where(eq(profileAliases.username, handle)).limit(1)
  )[0];
  const found = alias
    ? (await db.select().from(users).where(eq(users.id, alias.userId)).limit(1))[0] || null
    : null;
  return found?.deletedAt ? null : found;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const profile = await findUser((await params).username);
  return profile
    ? {
        title: `${profile.displayName} (@${profile.username}) — Praça`,
        description: profile.bio || profile.manifesto,
      }
    : { title: "Perfil não encontrado — Praça" };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const profile = await findUser((await params).username);
  if (!profile?.profileComplete)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f1e8] p-6 text-[#1f241d]">
        <div>
          <h1 className="font-serif text-5xl">Essa pessoa ainda não chegou.</h1>
          <a href="/mural" className="mt-6 inline-block underline">
            Voltar ao Mural
          </a>
        </div>
      </main>
    );
  const viewer = await getPracaUser();
  const { publications: theirPosts, stats, badges } = await getProfileSocial(profile);
  const firstPost = [...theirPosts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const memberSince = formatDate(profile.createdAt);

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteHeader active={viewer?.id === profile.id ? "perfil" : "mural"} />
      <section className="mx-auto max-w-[1160px] px-5 pb-28 pt-12 sm:px-8 md:pt-20">
        <PageBack />
        <div className="grid gap-10 border-b border-[#c8c0b1] pb-14 lg:grid-cols-[320px_1fr]">
          <div>
            <img
              src={`/avatar/${profile.id}?v=${profile.imageGenerationsUsed}`}
              alt={`Avatar de ${profile.displayName}`}
              className="aspect-square w-full border border-[#c8c0b1] object-cover shadow-[10px_10px_0_#f0c64b]"
            />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#667064]">
              habitante da praça · @{profile.username}
            </p>
            <h1 className="mt-4 font-serif text-[clamp(4rem,9vw,8rem)] leading-[.82] tracking-[-.06em]">
              {profile.displayName}
            </h1>
            <p className="mt-6 font-serif text-3xl text-[#244e35]">{profile.roleTitle}</p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#667064]">{profile.manifesto}</p>
            {profile.bio && (
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-7 text-[#667064]">
                {profile.bio}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-start gap-5">
              {viewer?.id === profile.id ? (
                <a
                  href="/perfil"
                  className="border border-[#244e35] px-5 py-3 text-sm font-semibold"
                >
                  Painel privado
                </a>
              ) : viewer?.profileComplete ? (
                <PokeButton username={profile.username} />
              ) : (
                <a
                  href="/entrar"
                  className="bg-[#244e35] px-5 py-3 text-sm font-semibold text-white"
                >
                  Entre para cutucar
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-12 py-14 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">
              <CalendarDays size={15} /> marcos públicos
            </p>
            <div className="mt-5 border-t border-[#c8c0b1]">
              <Milestone label="Chegou à Praça" value={memberSince} />
              {firstPost && (
                <Milestone label="Quebrou o silêncio" value={formatDate(firstPost.createdAt)} />
              )}
              {stats.posts >= 3 && (
                <Milestone label="Terceira publicação" value="A reincidência foi confirmada" />
              )}
              {stats.pokesReceived > 0 && (
                <Milestone label="Primeira cutucada" value="Alguém exigiu sua presença" />
              )}
            </div>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">
              <Sparkles size={15} /> distinções descobertas
            </p>
            {badges.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {badges.map((badge) => (
                  <article
                    key={badge.key}
                    className="rotate-[-.5deg] border-2 border-[#244e35] bg-[#fbf8f1] p-5 shadow-[5px_5px_0_#df5c45]"
                  >
                    <span className="text-4xl" aria-hidden="true">
                      {badge.emoji}
                    </span>
                    <h2 className="mt-3 font-serif text-2xl">{badge.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#667064]">{badge.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 border border-dashed border-[#9fa49b] p-6">
                <p className="font-serif text-2xl">Nenhuma distinção se revelou ainda.</p>
                <p className="mt-2 text-sm text-[#667064]">
                  A Praça não publica a lista. As badges aparecem quando decidem aparecer.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#c8c0b1] md:grid-cols-4">
          <Stat icon={<PenLine size={17} />} value={stats.posts} label="publicações" />
          <Stat icon={<Heart size={17} />} value={stats.likesReceived} label="curtidas" />
          <Stat
            icon={<MessageCircle size={17} />}
            value={stats.commentsReceived}
            label="comentários"
          />
          <Stat
            icon={<Share2 size={17} />}
            value={stats.sharesReceived}
            label="compartilhamentos recebidos"
          />
          <Stat icon={<Eye size={17} />} value={stats.uniqueViews} label="visualizações únicas" />
          <Stat
            icon={<Sparkles size={17} />}
            value={stats.linkVisitors}
            label="visitantes trazidos"
          />
          <Stat icon={<span>🪑</span>} value={stats.peopleAttracted} label="pessoas atraídas" />
          <Stat icon={<span>👉</span>} value={stats.pokesReceived} label="cutucadas" />
        </div>

        <ProfileGames userId={profile.id} owner={viewer?.id === profile.id} />
        <ProfileCircles userId={profile.id} />
        <h2 className="mt-16 font-serif text-5xl">Publicações</h2>
        <div className="mt-7 grid gap-px bg-[#c8c0b1] md:grid-cols-2">
          {theirPosts.length ? (
            theirPosts.map((post) => (
              <a key={post.id} href={`/p/${post.slug}`} className="group bg-[#f5f1e8] p-6">
                <div className="flex gap-5">
                  {firstPostImage(post.contentJson) && (
                    <img
                      src={firstPostImage(post.contentJson)!}
                      alt=""
                      className="size-24 shrink-0 object-cover"
                    />
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[.14em] text-[#667064]">
                      {formatDate(post.createdAt)}
                    </p>
                    <h3 className="mt-3 font-serif text-3xl leading-tight group-hover:underline">
                      {post.title}
                    </h3>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <p className="bg-[#f5f1e8] p-8 text-[#667064]">Nenhuma publicação ainda.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Milestone({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#c8c0b1] py-4">
      <strong className="block font-serif text-xl">{label}</strong>
      <span className="mt-1 block text-sm text-[#667064]">{value}</span>
    </div>
  );
}
function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-[#f5f1e8] p-5">
      {icon}
      <strong className="mt-4 block font-serif text-4xl">{value}</strong>
      <span className="text-sm text-[#667064]">{label}</span>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}
