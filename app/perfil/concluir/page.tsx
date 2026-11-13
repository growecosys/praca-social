export const metadata = {
  title: "Criar sua identidade — Praça",
  robots: { index: false, follow: false },
};
import { env } from "../../../lib/env";
import { redirect } from "next/navigation";
import { getPracaUser } from "../../../lib/praca-auth";
import Ritual from "./ritual";
export const dynamic = "force-dynamic";
export default async function CompleteProfile() {
  const user = await getPracaUser();
  if (!user) redirect("/entrar");
  if (user.profileComplete) redirect("/perfil");
  const verified = await env.DB.prepare("SELECT user_id FROM account_emails WHERE user_id=?")
    .bind(user.id)
    .first();
  return <Ritual name={user.displayName} emailConfirmed={Boolean(verified)} />;
}
