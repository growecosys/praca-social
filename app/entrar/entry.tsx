"use client";

import OnboardingProgress from "../../components/onboarding-progress";
import EmailAccessForm from "../../components/email-access-form";
import NatureSpot from "../../components/nature-spot";
import SiteNavigation from "../../components/site-navigation";
import { useCallback, useState } from "react";
import { ArrowRight, Eye, EyeOff, Feather, KeyRound, LoaderCircle } from "lucide-react";
import { clearAutosave, useAutosave } from "../../lib/use-autosave";

export default function Entry({
  initialMode = "register",
}: {
  initialMode?: "register" | "login";
}) {
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [draft, setDraft] = useState({ displayName: "", username: "" });
  const restoreDraft = useCallback((saved: typeof draft) => {
    if (saved && typeof saved.username === "string") setDraft(saved);
  }, []);
  useAutosave("praca_entry_draft", draft, restoreDraft);
  function update(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const raw = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {}
      if (response.ok && data.next) {
        clearAutosave("praca_entry_draft");
        window.location.href = data.next;
      } else setError(data.error || "O servidor não concluiu a solicitação. Tente novamente.");
    } catch {
      setError("Não foi possível conectar à Praça.");
    } finally {
      setBusy(false);
    }
  }

  const fieldLabel = "mb-1.5 block text-xs font-semibold text-[#555e53]";
  const field =
    "w-full border border-[#bdb5a7] bg-[#fbf8f1] px-4 py-4 outline-none focus:border-[#244e35]";
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteNavigation />
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto grid max-w-6xl items-start gap-8 px-5 py-8 lg:grid-cols-[1.2fr_.8fr] lg:px-8"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#667064]">
            comece por aqui
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-[clamp(2.8rem,8vw,7rem)] leading-[.82] tracking-[-.065em]">
            Crie sua
            <br />
            identidade.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#667064]">
            Crie sua conta, confirme seu e-mail e descubra seu papel na Praça.
          </p>
          {mode === "register" && <OnboardingProgress />}
        </div>
        <div className="relative z-10 border-y border-[#bdb5a7] bg-[#f5f1e8]/95 py-8">
          <div className="grid grid-cols-2 border border-[#bdb5a7] p-1">
            <button
              type="button"
              aria-pressed={mode === "register"}
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`px-4 py-3 text-sm font-semibold ${mode === "register" ? "bg-[#244e35] text-white" : ""}`}
            >
              Criar conta
            </button>
            <button
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`px-4 py-3 text-sm font-semibold ${mode === "login" ? "bg-[#244e35] text-white" : ""}`}
            >
              Entrar
            </button>
          </div>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className={fieldLabel}>Nome público</span>
                <input
                  name="displayName"
                  value={draft.displayName}
                  onChange={(event) => update("displayName", event.target.value)}
                  required
                  maxLength={60}
                  placeholder="Como as pessoas verão você"
                  className={field}
                />
              </label>
            )}
            <label className="block">
              <span className={fieldLabel}>
                {mode === "register" ? "Nome de usuário" : "Usuário ou e-mail"}
              </span>
              <input
                autoComplete="username"
                name="username"
                value={draft.username}
                onChange={(event) => update("username", event.target.value)}
                required
                maxLength={mode === "register" ? 24 : 254}
                placeholder="@seu_usuario"
                className={field}
              />
            </label>
            {mode === "register" && (
              <label className="block">
                <span className={fieldLabel}>E-mail · privado</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="voce@exemplo.com"
                  className={field}
                />
                <span className="mt-1 block text-xs text-[#667064]">
                  Seu e-mail não aparece no perfil público.
                </span>
              </label>
            )}
            <label className="block">
              <span className={fieldLabel}>
                Senha <span className="font-normal text-[#73786f]">· mínimo de 8 caracteres</span>
              </span>
              <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-[#667064]" size={18} />
                <input
                  name="secret"
                  type={showSecret ? "text" : "password"}
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Sua senha"
                  className={`${field} pl-12 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((value) => !value)}
                  aria-label={showSecret ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-3 p-1.5 text-[#667064]"
                >
                  {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <p className="text-xs leading-5 text-[#73786f]">
              Seu nome e usuário ficam salvos para você continuar depois. A senha não é salva.
            </p>
            {error && (
              <p role="alert" className="text-sm text-[#9b3a2f]">
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 bg-[#244e35] px-5 py-4 font-semibold text-white disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}{" "}
              {mode === "register" ? "Criar minha conta" : "Entrar na Praça"}
            </button>
            <a
              href="/recuperar"
              className="flex min-h-11 items-center justify-center border border-[#bdb5a7] px-4 py-3 text-sm font-semibold"
            >
              Recuperar minha conta
            </a>
          </form>
          <details className="mt-6 border-t border-[#bdb5a7] pt-5">
            <summary className="cursor-pointer py-2 font-semibold">Entrar sem senha</summary>
            <div className="pt-4">
              <EmailAccessForm />
            </div>
          </details>
        </div>
      </section>
      <footer className="nature-entry-footer relative mx-5 mt-28 border-t border-[#bdb5a7] py-6 lg:mx-8">
        <NatureSpot kind="button" className="nature-entry-animal" />
        <a
          href="/mural"
          className="relative z-10 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          Ver o Mural
        </a>
      </footer>
    </main>
  );
}
