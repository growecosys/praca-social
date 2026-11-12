"use client";
import { useEffect, useState } from "react";
export default function EmailAccessForm({
  purpose = "login",
  currentEmail,
  pendingEmail,
}: {
  purpose?: "login" | "link";
  currentEmail?: string | null;
  pendingEmail?: string | null;
}) {
  const [code, setCode] = useState(""),
    [email, setEmail] = useState(pendingEmail || ""),
    [available, setAvailable] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/auth/email", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAvailable(Boolean(d.available)))
      .catch(() => setAvailable(false));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", purpose, email }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Não foi possível enviar.");
      setMessage(d.message);
      setEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "consume", token: code.replace(/\s/g, "") }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Confira o código.");
      setCode("");
      window.location.replace(d.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar.");
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3" data-no-translate>
      <h2 className="font-serif text-2xl">
        {purpose === "link" ? "Seu e-mail" : "Entrar com e-mail"}
      </h2>
      {pendingEmail && (
        <p className="break-all text-sm">
          Aguardando confirmação: <strong>{pendingEmail}</strong>
        </p>
      )}
      {currentEmail && (
        <p className="break-all text-sm">
          E-mail confirmado: <strong>{currentEmail}</strong>
        </p>
      )}
      <p className="text-sm text-[#667064]">
        {purpose === "link"
          ? "Confirme seu e-mail para entrar e recuperar sua conta. Ele não aparece no perfil público."
          : "Use o e-mail que você já confirmou no seu perfil. Este acesso não cria uma conta nova."}
      </p>
      {purpose === "login" && (
        <p className="text-sm text-[#667064]">
          Criou sua conta sem e-mail?{" "}
          <a href="/entrar?modo=login&trocar=1" className="underline">
            Entre com seu usuário e senha
          </a>{" "}
          ou{" "}
          <a href="/recuperar#perguntas-secretas" className="underline">
            use uma pergunta secreta
          </a>
          . Depois adicione seu e-mail em Editar perfil.
        </p>
      )}
      {available === false ? (
        <p role="status" className="text-sm text-[#667064]">
          O acesso por e-mail está indisponível no momento. Entre com usuário e senha.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-semibold">
            Seu e-mail
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!available || busy}
              className="mt-2 block w-full border border-[#bdb5a7] bg-white px-4 py-3"
            />
          </label>
          <button
            disabled={!available || busy}
            className="min-h-11 w-full bg-[#244e35] px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Enviando…"
              : purpose === "link"
                ? "Enviar confirmação"
                : "Receber acesso por e-mail"}
          </button>
          <p className="text-xs text-[#667064]">
            Abra o link neste navegador ou digite abaixo o código do e-mail. Ambos expiram em 15
            minutos.
          </p>
        </form>
      )}
      {available && (
        <details
          open={Boolean(message) || Boolean(pendingEmail)}
          className="border-t border-[#c8c0b1] pt-3"
        >
          <summary className="cursor-pointer py-2 text-sm font-semibold">
            Já recebi um código
          </summary>
          <form onSubmit={confirm} className="mt-3 space-y-3">
            <label className="block text-sm font-semibold">
              Código de 8 dígitos
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                minLength={8}
                maxLength={8}
                required
                disabled={busy}
                className="mt-2 block w-full border border-[#bdb5a7] bg-white px-4 py-3 text-lg tracking-widest"
              />
            </label>
            <button
              disabled={busy || code.length !== 8}
              className="min-h-11 w-full border border-[#244e35] px-4 py-3 font-semibold disabled:opacity-50"
            >
              {busy ? "Confirmando…" : "Confirmar código e continuar"}
            </button>
            <p className="text-xs text-[#667064]">
              Volte à página onde pediu o e-mail para digitar o código. Não compartilhe com ninguém.
            </p>
          </form>
        </details>
      )}
      {message && (
        <p role="status" className="text-sm text-[#244e35]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
