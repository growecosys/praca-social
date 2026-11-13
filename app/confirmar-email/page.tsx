import OnboardingProgress from "../../components/onboarding-progress";
import { redirect } from "next/navigation";
import { env } from "../../lib/env";
import { emailReady } from "../../lib/email-access";
import { getPracaUser } from "../../lib/praca-auth";
import SiteNavigation from "../../components/site-navigation";
import EmailAccessForm from "../../components/email-access-form";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page() {
  const user = await getPracaUser();
  if (!user) redirect("/entrar");
  const pending = await env.DB.prepare("SELECT email FROM pending_account_emails WHERE user_id=?")
    .bind(user.id)
    .first();
  const verified = await env.DB.prepare("SELECT email FROM account_emails WHERE user_id=?")
    .bind(user.id)
    .first();
  const emailAvailable = emailReady(env);
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteNavigation />
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="relative z-10 mx-auto max-w-xl px-4 py-12 sm:px-5"
      >
        <div className="bg-[#f5f1e8]/95 p-4">
          <p className="text-sm text-[#667064]">Sua conta está pronta</p>
          <OnboardingProgress account email={Boolean(verified)} identity={user.profileComplete} />
          <h1 className="my-4 font-serif text-4xl">
            {emailAvailable ? "Agora confirme seu e-mail" : "Sua conta está criada"}
          </h1>
          <p className="mb-6 text-[#667064]">
            {emailAvailable
              ? "Use o link ou digite o código do e-mail nesta página. Assim você pode entrar por e-mail e recuperar sua conta quando precisar."
              : "Você já está dentro. A confirmação por e-mail ainda não está ativa, então entre com seu usuário e senha. Quando ela for ativada, você poderá confirmar o e-mail em Editar perfil."}
          </p>
          <EmailAccessForm
            purpose="link"
            pendingEmail={(pending?.email as string) || null}
            currentEmail={(verified?.email as string) || null}
            emailAvailable={emailAvailable}
          />
          <a
            href={user.profileComplete ? "/perfil" : "/perfil/concluir"}
            className="mt-7 flex min-h-11 items-center justify-center border border-[#bdb5a7] p-3 font-semibold"
          >
            {user.profileComplete ? "Ver meu perfil" : "Continuar para as 5 perguntas"}
          </a>
          <p className="mt-3 text-xs text-[#667064]">
            Quer continuar agora? Você pode responder às perguntas e confirmar o e-mail depois.
          </p>
          <a href="/mural" className="mt-5 inline-flex min-h-11 items-center underline">
            Ver o Mural
          </a>
        </div>
      </section>
    </main>
  );
}
