import NatureSpot from "../../../components/nature-spot";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "../../../components/site-header";
import { getDb } from "../../../db";
import { posts, users } from "../../../db/schema";
import { ArticleBlocks, parseBlocks } from "../../../lib/content";
import { firstPostImage } from "../../../lib/post-media";
import { getPracaUser } from "../../../lib/praca-auth";
import Interactions from "./interactions";

async function getPost(slug: string) {
  const rows = await getDb().select().from(posts).where(eq(posts.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Texto não encontrado — Praça", robots: { index: false } };
  const description = post.content.replace(/\s+/g, " ").slice(0, 155);
  const image = firstPostImage(post.contentJson) || "/og.png";
  return {
    metadataBase: new URL("https://praca-fs.greenpillbr.chatgpt.site"),
    title: `${post.title} — Praça`,
    description,
    alternates: { canonical: `/p/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `/p/${post.slug}`,
      siteName: "Praça",
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title: post.title, description, images: [image] },
  };
}

export default async function PublishedPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f1e8] p-6">
        <div>
          <h1 className="font-serif text-4xl">Este texto não está na praça.</h1>
          <a href="/mural" className="mt-6 inline-block underline">
            Voltar ao Mural
          </a>
        </div>
      </main>
    );
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${post.createdAt}Z`),
  );
  const user = await getPracaUser();
  const ownsPost = user?.id === post.ownerId;
  const authorProfile = post.ownerId
    ? (
        await getDb()
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            roleTitle: users.roleTitle,
            imageGenerationsUsed: users.imageGenerationsUsed,
          })
          .from(users)
          .where(eq(users.id, post.ownerId))
          .limit(1)
      )[0]
    : null;
  const people = user?.profileComplete
    ? (
        await getDb()
          .select({ username: users.username, displayName: users.displayName })
          .from(users)
          .where(eq(users.profileComplete, true))
      ).filter((person) => person.username !== user.username)
    : [];
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteHeader active="mural" />
      <nav
        aria-label="Ações da publicação"
        className="mx-auto flex max-w-[860px] flex-wrap items-center gap-3 px-6 py-5 text-sm sm:px-10"
      >
        <a href="/mural" className="flex items-center gap-2 text-[#667064] hover:text-[#244e35]">
          <ArrowLeft size={15} /> Voltar ao Mural
        </a>
        <a href={`/p/${slug}/historico`} className="ml-auto text-[#667064] hover:text-[#244e35]">
          Histórico
        </a>
        {ownsPost && (
          <a href={`/editar/${slug}`} className="font-medium text-[#244e35] hover:underline">
            Editar
          </a>
        )}
      </nav>
      <article
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-[760px] px-6 pb-28 pt-14 sm:px-10 md:pt-24"
      >
        <p className="mb-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#667064]">
          publicado na praça
        </p>
        <h1 className="font-serif text-[clamp(2.8rem,7vw,5.5rem)] font-medium leading-[0.98] tracking-[-0.045em]">
          {post.title}
        </h1>
        <div className="post-byline mt-8 flex items-center gap-4 border-b border-[#d8d0c1] pb-6 text-sm text-[#667064]">
          {authorProfile && (
            <a href={`/u/${authorProfile.username}`}>
              <img
                src={`/avatar/${authorProfile.id}?v=${authorProfile.imageGenerationsUsed}`}
                alt=""
                className="size-12 rounded-full border border-[#c8c0b1] object-cover"
              />
            </a>
          )}
          <p>
            por{" "}
            {authorProfile ? (
              <a
                href={`/u/${authorProfile.username}`}
                className="font-medium text-[#1f241d] hover:underline"
              >
                {authorProfile.displayName} · {authorProfile.roleTitle}
              </a>
            ) : (
              <span className="text-[#1f241d]">{post.author}</span>
            )}
            <br />
            {date}
          </p>
          <NatureSpot kind="title" className="post-animal-ledge" />
        </div>
        <ArticleBlocks blocks={parseBlocks(post.contentJson, post.content)} />
        <Interactions
          slug={post.slug}
          title={post.title}
          signedIn={Boolean(user)}
          people={people}
        />
      </article>
    </main>
  );
}
