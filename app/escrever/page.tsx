export const metadata = { title: "Escrever — Praça", robots: { index: false, follow: false } };
import Editor from "../editor";
import { redirect } from "next/navigation";
import { getPracaUser } from "../../lib/praca-auth";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const user = await getPracaUser();
  if (!user) redirect("/entrar");
  if (!user.profileComplete) redirect("/perfil/concluir");
  return (
    <Editor
      author={`${user.displayName} · ${user.roleTitle}`}
      signOutPath="/perfil"
      avatarUrl={`/avatar/${user.id}?v=${user.imageGenerationsUsed}`}
    />
  );
}
