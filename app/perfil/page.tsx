import ProfileGames from "../../components/profile-games";
export const metadata={title:'Meu perfil — Praça',robots:{index:false,follow:false}};
import DeleteAccountForm from "../../components/delete-account-form";
import {env} from "cloudflare:workers";
import NatureSpot from "../../components/nature-spot";
import PageBack from "../../components/page-back";
import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Eye,
  Hand,
  Heart,
  MessageCircle,
  PenLine,
  Share2,
  Sparkles,
} from "lucide-react";
import SiteHeader from "../../components/site-header";
import { getDb } from "../../db";
import {
  activityEvents,
  avatarGenerations,
  roleGenerations,
} from "../../db/schema";
import { getPracaUser } from "../../lib/praca-auth";
import ProfileCircles from "../../components/profile-circles";
import { getProfileSocial } from "../../lib/profile-social";
import { recoverAvatarHistory } from "../../lib/avatar-history";
import AvatarGenerator from "./avatar-generator";
import RoleGenerator from "./role-generator";
import { AvatarGallery, RoleHistory } from "./identity-history";
import ActivityTrail from "./activity-trail";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const user = await getPracaUser();
  if (!user) redirect("/entrar");
  if (!user.profileComplete) redirect("/perfil/concluir");
  const verifiedEmail=await env.DB.prepare("SELECT user_id FROM account_emails WHERE user_id=?").bind(user.id).first();
  const db = getDb();
  await recoverAvatarHistory(user.id, user.avatarImageKey);
  const [
    { publications: myPosts, stats: social, badges, invitedPeople },
    events,
    roleVersions,
    avatarVersions,
    oldRoleEvents,
  ] = await Promise.all([
    getProfileSocial(user),
    db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.userId, user.id))
      .orderBy(desc(activityEvents.createdAt))
      .limit(100),
    db
      .select()
      .from(roleGenerations)
      .where(eq(roleGenerations.userId, user.id))
      .orderBy(desc(roleGenerations.createdAt)),
    db
      .select()
      .from(avatarGenerations)
      .where(eq(avatarGenerations.userId, user.id))
      .orderBy(desc(avatarGenerations.createdAt)),
    db
      .select({
        metadataJson: activityEvents.metadataJson,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.userId, user.id),
          inArray(activityEvents.action, [
            "profile_completed",
            "role_regenerated",
          ]),
        ),
      )
      .orderBy(desc(activityEvents.createdAt)),
  ]);
  const completeTitles = new Set(
    roleVersions.map((version) => version.roleTitle),
  );
  const partialRoleRecords = oldRoleEvents
    .flatMap((event) => {
      try {
        const data = JSON.parse(event.metadataJson) as {
          roleTitle?: string;
          previousRoleTitle?: string;
        };
        return [data.roleTitle, data.previousRoleTitle]
          .filter((title): title is string => Boolean(title))
          .map((roleTitle) => ({ roleTitle, createdAt: event.createdAt }));
      } catch {
        return [];
      }
    })
    .filter(
      (record, index, all) =>
        !completeTitles.has(record.roleTitle) &&
        all.findIndex((item) => item.roleTitle === record.roleTitle) === index,
    );
  const stats = [
    [social.posts, "publicações", PenLine],
    [social.likesReceived, "curtidas", Heart],
    [social.commentsReceived, "comentários", MessageCircle],
    [social.sharesReceived, "compartilhamentos recebidos", Share2],
    [social.uniqueViews, "visualizações únicas", Eye],
    [social.linkVisitors, "visitantes trazidos", Sparkles],
    [social.peopleAttracted, "pessoas atraídas", Sparkles],
    [social.pokesReceived, "cutucadas", Hand],
  ] as const;
  const answers = JSON.parse(user.answersJson || "[]") as string[];
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteHeader active="perfil" />
      <section id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><PageBack/><a href="/perfil/editar" className="inline-flex min-h-11 items-center border border-[#244e35] px-4 py-2 text-sm font-semibold">Editar perfil</a></div><div className="nature-profile-ledge"><NatureSpot kind="title"/></div><nav aria-label="Seções do perfil" className="mb-10 flex flex-wrap gap-2 border-y border-[#c8c0b1] py-3 text-sm font-semibold text-[#667064]"><a href="#identidade" className="whitespace-nowrap px-3 py-2 hover:text-[#244e35]">Identidade</a><a href="#atividade" className="whitespace-nowrap px-3 py-2 hover:text-[#244e35]">Atividade</a><a href="#jogos" className="whitespace-nowrap px-3 py-2 hover:text-[#244e35]">Jogos</a><a href="#convites" className="whitespace-nowrap px-3 py-2 hover:text-[#244e35]">Convites</a><a href="#publicacoes" className="whitespace-nowrap px-3 py-2 hover:text-[#244e35]">Publicações</a><a href="#historico" className="whitespace-nowrap px-3 py-2 hover:text-[#244e35]">Histórico</a></nav>
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <aside id="identidade" className="scroll-mt-24">
            <img
              src={`/avatar/${user.id}?v=${user.updatedAt || user.imageGenerationsUsed}`}
              alt={`Avatar de ${user.displayName}`}
              className="aspect-square w-full border object-cover"
            />
            <details className="mt-5 border-b pb-4"><summary className="py-3 font-semibold">Escolher outro avatar</summary><AvatarGallery
              userId={user.id}
              versions={avatarVersions.map(({ id, active, createdAt }) => ({
                id,
                active,
                createdAt,
              }))}
            />
            </details><AvatarGenerator
              hasImage={Boolean(user.avatarImageKey)}
              remaining={Math.max(0, 3 - user.imageGenerationsUsed)}
              roleTitle={user.roleTitle}
              answers={answers}
              avatarJson={user.avatarJson}
            />
            <h1 className="mt-6 font-serif text-5xl">{user.displayName}</h1>
            <p className="mt-2 text-sm text-[#667064]">@{user.username}</p>{user.bio&&<p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#667064]">{user.bio}</p>}
            <div className="mt-5 flex items-start justify-between gap-3">
              <p className="font-serif text-2xl text-[#244e35]">
                {user.roleTitle}
              </p>
              <RoleGenerator
                remaining={Math.max(0, 3 - user.generationsUsed)}
                answers={answers}
                currentRole={user.roleTitle}
                currentManifesto={user.manifesto}
              />
            </div>
            <p className="mt-3 leading-7 text-[#667064]">{user.manifesto}</p>
            <details className="mt-5 border-y py-3"><summary className="py-3 font-semibold">Versões do papel</summary><RoleHistory
              versions={roleVersions.map(
                ({
                  id,
                  roleTitle,
                  manifesto,
                  createdAt,
                  mappingJson,
                  explanation,
                }) => ({
                  id,
                  roleTitle,
                  manifesto,
                  createdAt,
                  mapping: (() => {
                    try {
                      return JSON.parse(mappingJson || "{}");
                    } catch {
                      return {};
                    }
                  })(),
                  explanation,
                }),
              )}
              partialRecords={partialRoleRecords}
              currentRole={user.roleTitle}
              currentManifesto={user.manifesto}
            /></details>
            <div className="mt-6 flex flex-wrap gap-2">
              {answers.map((answer, index) => (
                <span key={index} className="border px-2 py-1 text-xs">
                  {answer}
                </span>
              ))}
            </div>
            <section className="mt-7 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#667064]">
                ordem recomendada
              </p>
              <ol className="mt-3 space-y-2 text-sm">
                {[
                  [true, "Criar conta"],
                  [Boolean(verifiedEmail), "Confirmar e-mail"],
                  [true, "Responder perguntas"],
                  [true, "Receber papel"],
                  [Boolean(user.avatarImageKey), "Gerar avatar"],
                  [myPosts.length > 0, "Publicar no mural"],
                ].map(([done, label], index) => (
                  <li
                    key={String(label)}
                    className={done ? "text-[#244e35]" : "text-[#667064]"}
                  >
                    <span
                      className={`mr-2 inline-grid size-5 place-items-center border text-[10px] ${done ? "border-[#244e35] bg-[#244e35] text-white" : "border-[#c8c0b1]"}`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    {label === "Confirmar e-mail" && !done ? <a href="/confirmar-email" className="underline">Confirmar e-mail</a> : label}
                  </li>
                ))}
              </ol>
            </section>
            <form action="/api/auth/logout" method="post" className="mt-7">
              <button className="text-sm underline underline-offset-4">
                Retirar-se da Praça
              </button>
            </form>
          </aside>
          <div id="atividade" className="scroll-mt-24">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">
              <BarChart3 size={15} />
              atividade na praça
            </p>
            <div className="mt-5 grid grid-cols-2 gap-px bg-[#c8c0b1] md:grid-cols-4">
              {stats.map(([value, label, Icon]) => (
                <div key={label} className="bg-[#f5f1e8] p-5">
                  <Icon size={18} />
                  <strong className="mt-5 block font-serif text-5xl">
                    {value}
                  </strong>
                  <span className="text-sm text-[#667064]">{label}</span>
                </div>
              ))}
            </div>
            <details id="convites" className="mt-8 scroll-mt-24 border border-[#c8c0b1] bg-[#fbf8f1]">
              <summary className="cursor-pointer list-none px-5 py-4 font-serif text-2xl marker:hidden">
                Pessoas que chegaram pelo seu convite
                <span className="ml-3 font-sans text-xs text-[#667064]">
                  {invitedPeople.length} {invitedPeople.length === 1 ? "registro" : "registros"}
                </span>
              </summary>
              <div className="border-t border-[#c8c0b1] px-5 py-2">
                {invitedPeople.length ? (
                  invitedPeople.map((person) => (
                    <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ded8cc] py-4 last:border-0">
                      <div>
                        <a href={`/u/${person.username}`} className="font-serif text-xl underline-offset-4 hover:underline">
                          {person.displayName}
                        </a>
                        <p className="mt-1 text-xs text-[#667064]">
                          @{person.username} · conta criada em {formatInviteDate(person.createdAt)}
                        </p>
                      </div>
                      <span className={`border px-2 py-1 text-xs ${person.qualifiedAt ? "border-[#244e35] text-[#244e35]" : "border-[#c8c0b1] text-[#667064]"}`}>
                        {person.qualifiedAt ? "perfil concluído" : "cadastro iniciado"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-5 text-sm text-[#667064]">Nenhuma conta foi vinculada aos seus links ainda.</p>
                )}
                <p className="border-t border-[#ded8cc] py-4 text-xs leading-5 text-[#667064]">
                  O placar considera apenas quem concluiu o perfil. Este histórico mantém também os cadastros iniciados para auditoria.
                </p>
              </div>
            </details>
            <div className="mt-12 flex items-center justify-between gap-4">
              <h2 className="font-serif text-4xl">Distinções descobertas</h2>
              <a
                href={`/u/${user.username}`}
                className="text-sm underline underline-offset-4"
              >
                Ver como os outros veem
              </a>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {badges.length ? (
                badges.map((badge) => (
                  <article
                    key={badge.key}
                    className="border-2 border-[#244e35] bg-[#fbf8f1] p-4 shadow-[4px_4px_0_#df5c45]"
                  >
                    <span className="text-3xl">{badge.emoji}</span>
                    <h3 className="mt-2 font-serif text-xl">{badge.title}</h3>
                    <p className="mt-1 text-sm text-[#667064]">
                      {badge.description}
                    </p>
                  </article>
                ))
              ) : (
                <p className="col-span-2 flex items-center gap-2 border border-dashed p-5 text-[#667064]">
                  <Sparkles size={16} /> Nenhuma distinção se revelou ainda.
                </p>
              )}
            </div>
            <ProfileGames userId={user.id} owner/><ProfileCircles userId={user.id}/><h2 id="publicacoes" className="mt-12 scroll-mt-24 font-serif text-4xl">Suas publicações</h2>
            <div className="mt-5 border-t">
              {myPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/p/${post.slug}`}
                  className="flex justify-between border-b py-5"
                >
                  <span className="font-serif text-2xl">{post.title}</span>
                  <span className="text-sm underline">Abrir</span>
                </a>
              ))}
            </div>
            <div id="historico" className="scroll-mt-24"><ActivityTrail
              events={events.map(({ id, action, entityType, createdAt }) => ({ id, action, entityType, createdAt }))}
            /></div>
          </div>
        </div>
      </section>
      <DeleteAccountForm/>
    </main>
  );
}

function formatInviteDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}
