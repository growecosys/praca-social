import { and, eq } from "drizzle-orm";
import Editor from "../../editor";
import { redirect } from "next/navigation";
import { getDb } from "../../../db";
import { posts } from "../../../db/schema";
import { parseBlocks } from "../../../lib/content";
import { getPracaUser } from "../../../lib/praca-auth";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getPracaUser();
  if (!user) redirect("/entrar");
  if (!user.profileComplete) redirect("/perfil/concluir");
  const post = (await getDb().select().from(posts).where(and(eq(posts.slug, slug), eq(posts.ownerId, user.id))).limit(1))[0];
  if (!post) return <main className="grid min-h-screen place-items-center bg-[#f5f1e8] p-6"><div><h1 className="font-serif text-4xl">Sem permissão para editar.</h1><a href={`/p/${slug}`} className="mt-6 inline-block underline">Voltar</a></div></main>;
  return <Editor author={post.author} signOutPath="/perfil" avatarUrl={`/avatar/${user.id}?v=${user.imageGenerationsUsed}`} initialTitle={post.title} initialBlocks={parseBlocks(post.contentJson, post.content)} editSlug={slug} />;
}
