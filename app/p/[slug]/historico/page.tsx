import { asc, eq } from "drizzle-orm";
import SiteHeader from "../../../../components/site-header";
import { getDb } from "../../../../db";
import { postRevisions, posts } from "../../../../db/schema";

export const dynamic = "force-dynamic";

export default async function History({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const post = (await db.select().from(posts).where(eq(posts.slug, slug)).limit(1))[0];
  if (!post) return <main className="grid min-h-screen place-items-center bg-[#f5f1e8]">Publicação não encontrada.</main>;
  const saved = await db.select().from(postRevisions).where(eq(postRevisions.postId, post.id)).orderBy(asc(postRevisions.version));
  const revisions = saved.length ? saved : [{ id: 0, postId: post.id, version: 1, title: post.title, author: post.author, content: post.content, contentJson: post.contentJson, editorId: post.ownerId, createdAt: post.createdAt }];
  return <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
    <SiteHeader active="mural" />
    <section className="mx-auto max-w-4xl px-5 py-12">
      <a href={`/p/${slug}`} className="text-sm underline">← Voltar ao texto</a>
      <p className="mt-14 text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">trilha pública e imutável</p>
      <h1 className="mt-3 font-serif text-5xl">Histórico de versões</h1>
      <p className="mt-4 max-w-2xl text-[#667064]">A publicação não pode ser apagada. Cada edição cria uma nova versão, preservando as anteriores para auditoria.</p>
      <div className="mt-10 border-t border-[#c8c0b1]">{revisions.map((revision) => <article key={revision.id} className="grid gap-4 border-b border-[#c8c0b1] py-7 sm:grid-cols-[100px_1fr_auto]"><strong className="font-mono text-2xl text-[#244e35]">v{revision.version}</strong><div><h2 className="font-serif text-2xl">{revision.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#667064]">{revision.content}</p></div><time className="text-sm text-[#667064]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(`${revision.createdAt.replace(" ", "T")}Z`))}</time></article>)}</div>
    </section>
  </main>;
}
