export const metadata = {
  title: "Entrar ou criar conta — Praça",
  robots: { index: false, follow: false },
};
import { redirect } from "next/navigation";
import { getPracaUser } from "../../lib/praca-auth";
import Entry from "./entry";
export const dynamic = "force-dynamic";
export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; trocar?: string }>;
}) {
  const query = await searchParams,
    user = await getPracaUser();
  if (user && query.trocar !== "1") redirect(user.profileComplete ? "/mural" : "/perfil/concluir");
  return <Entry initialMode={query.modo === "login" ? "login" : "register"} />;
}
