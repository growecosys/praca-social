"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { signalHref, signalPage } from "../lib/common-signals";

export default function SignalComposer({
  signedIn,
  canSubmit,
}: {
  signedIn: boolean;
  canSubmit: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const request = useRef<{ id: string; fingerprint: string } | null>(null);
  const [page, setPage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open() {
    setPage(signalPage(window.location.pathname));
    if (!dialog.current?.open) dialog.current?.showModal();
  }

  useEffect(() => {
    window.addEventListener("praca:compose-signal", open);
    return () => window.removeEventListener("praca:compose-signal", open);
  }, []);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const fields = { body: String(data.get("body")).trim(), hideName: data.has("hideName"), page };
    const fingerprint = JSON.stringify(fields);
    if (request.current?.fingerprint !== fingerprint)
      request.current = { id: crypto.randomUUID(), fingerprint };
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/common-space/signals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: request.current.id, ...fields }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true)
        throw Error(result.error ?? "Não foi possível confirmar a publicação.");
      window.location.assign(signalHref(result.id));
    } catch (cause) {
      setError(
        cause instanceof SyntaxError
          ? "Publicação não confirmada. Tente novamente com o mesmo texto."
          : (cause as Error).message,
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="fixed bottom-5 right-5 z-[55] rounded-full border-2 border-[#244e35] bg-[#fbf8f1] px-4 py-3 text-sm font-bold text-[#14261b] shadow-[3px_3px_0_#244e35]"
      >
        Dar um sinal
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="signal-composer-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        className="m-auto max-h-[90dvh] w-[min(34rem,calc(100%-2rem))] overflow-auto border border-[#244e35] bg-[#fbf8f1] p-6 text-[#14261b] shadow-xl backdrop:bg-black/50"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="signal-composer-title" className="font-serif text-3xl">
            Dar um sinal
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => dialog.current?.close()}
            disabled={busy}
            className="min-h-11 min-w-11 border border-[#c8c0b1] text-xl"
          >
            ×
          </button>
        </div>
        {canSubmit ? (
          <form onSubmit={publish}>
            <fieldset disabled={busy} className="grid gap-4">
              <label className="font-semibold">
                O que você percebeu ou gostaria de mudar?
                <textarea
                  name="body"
                  required
                  minLength={5}
                  maxLength={1200}
                  rows={5}
                  className="mt-2 w-full border border-[#bdb5a7] bg-white p-3 font-normal"
                  placeholder="Conte o que aconteceu ou descreva sua ideia."
                />
              </label>
              <p className="text-sm">
                Área que aparecerá com o relato <strong>{page}</strong>
              </p>
              <p className="text-sm leading-6">
                Qualquer pessoa pode ler o texto publicado em Sinais do Espaço Comum, mesmo sem
                conta. A IA analisa o texto e a área indicada. Confira se você retirou dados
                pessoais do texto.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="hideName" className="mt-1" /> Ocultar meu nome de
                perfil nesta publicação
              </label>
              <p className="text-sm text-[#465347]">
                Com a opção desmarcada, seu nome de perfil aparece junto do relato.
              </p>
              <button
                type="submit"
                className="min-h-11 justify-self-start bg-[#244e35] px-5 py-2 font-bold text-white"
              >
                {busy ? "Publicando…" : "Publicar sinal"}
              </button>
            </fieldset>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-800">
                {error}
              </p>
            )}
          </form>
        ) : (
          <p className="leading-7">
            {signedIn ? (
              <a className="underline" href="/perfil/concluir">
                Conclua seu perfil para publicar um sinal.
              </a>
            ) : (
              <a className="underline" href="/entrar">
                Entre na sua conta para publicar um sinal.
              </a>
            )}{" "}
            <a className="underline" href={signalHref()}>
              Leia os sinais publicados.
            </a>
          </p>
        )}
      </dialog>
    </>
  );
}
