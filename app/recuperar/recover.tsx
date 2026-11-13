"use client";
import EmailAccessForm from "../../components/email-access-form";
import { useCallback, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { clearAutosave, useAutosave } from "../../lib/use-autosave";
import { RECOVERY_QUESTIONS } from "../../lib/recovery-questions";
export default function Recover() {
  const [username, setUsername] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const restore = useCallback((saved: string) => {
    if (typeof saved === "string") setUsername(saved);
  }, []);
  useAutosave("praca_recovery_username", username, restore);
  async function reset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      values = Object.fromEntries(new FormData(form));
    if (values.newSecret !== values.confirmSecret) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, username }),
      });
      const raw = await r.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw Error("Não foi possível confirmar a recuperação. Tente novamente.");
      }
      if (!r.ok) throw Error(data.error || "Falha na recuperação.");
      form.reset();
      clearAutosave("praca_recovery_username");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na recuperação.");
    } finally {
      setBusy(false);
    }
  }
  const field = "mt-2 w-full border border-[#bdb5a7] bg-white px-4 py-3";
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f1e8] px-5 py-10 text-[#1f241d]">
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg border-y border-[#c8c0b1] bg-[#f5f1e8]/95 py-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">
          recuperar conta
        </p>
        <h1 className="mt-4 font-serif text-4xl">Voltar à Praça</h1>
        <div className="mt-6">
          <EmailAccessForm />
        </div>
        <details id="perguntas-secretas" className="mt-7 border-t border-[#c8c0b1] pt-4">
          <summary className="cursor-pointer py-2 font-semibold">
            Recuperar com uma pergunta secreta
          </summary>
          {done ? (
            <div role="status" className="mt-6">
              <p>Senha alterada. Entre novamente para continuar.</p>
              <a
                href="/entrar?modo=login&trocar=1"
                className="mt-5 inline-flex min-h-11 items-center bg-[#244e35] px-5 text-white"
              >
                Entrar com a nova senha →
              </a>
            </div>
          ) : (
            <form onSubmit={reset} className="mt-6 space-y-4" data-no-translate>
              <p className="text-sm text-[#667064]">
                Informe seu usuário e responda uma das perguntas escolhidas no cadastro.
              </p>
              <label className="block text-sm font-semibold">
                Nome de usuário
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  maxLength={25}
                  placeholder="@seu_usuario"
                  className={field}
                />
              </label>
              <label className="block text-sm font-semibold">
                Pergunta secreta
                <select name="question" required className={field} defaultValue="">
                  <option value="" disabled>
                    Escolha uma das suas perguntas
                  </option>
                  {Object.entries(RECOVERY_QUESTIONS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Resposta
                <input
                  name="answer"
                  type="password"
                  required
                  maxLength={256}
                  autoComplete="off"
                  className={field}
                />
              </label>
              <label className="block text-sm font-semibold">
                Nova senha
                <input
                  name="newSecret"
                  type="password"
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                  className={field}
                />
              </label>
              <label className="block text-sm font-semibold">
                Repita a nova senha
                <input
                  name="confirmSecret"
                  type="password"
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                  className={field}
                />
              </label>
              <p className="text-xs text-[#667064]">
                Suas respostas e senhas não são salvas neste formulário. Após várias tentativas,
                aguarde 30 minutos.
              </p>
              {error && (
                <p role="alert" className="text-sm text-[#9b3a2f]">
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="flex min-h-11 w-full items-center justify-center gap-2 bg-[#244e35] px-4 py-3 text-white disabled:opacity-50"
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
                Recuperar conta
              </button>
            </form>
          )}
        </details>
        <a
          href="/entrar?modo=login&trocar=1"
          className="mt-6 inline-flex min-h-11 items-center text-sm underline"
        >
          Cancelar e voltar ao login
        </a>
      </section>
    </main>
  );
}
