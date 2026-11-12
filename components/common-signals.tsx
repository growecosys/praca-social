"use client";

import { useEffect, useState } from "react";
import { signalHref, type PublicSignal, type VotingDraft } from "../lib/common-signals";

const dispositions = {
  investigate: "Vale investigar",
  clarify: "Falta informação",
  voting: "Rascunho de pedido de votação",
  recorded: "Relato registrado",
};
const action =
  "inline-flex min-h-11 items-center border border-[#244e35] px-4 py-2 text-sm font-semibold disabled:opacity-50";
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default function CommonSignals({
  id,
  onDraft,
}: {
  id: string | null;
  onDraft: (draft: VotingDraft) => void;
}) {
  const [data, setData] = useState<{
    signals: PublicSignal[];
    hasMore: boolean;
    canSubmit: boolean;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [retrying, setRetrying] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const query = new URLSearchParams(id ? { id } : { page: String(page) });
        const response = await fetch("/api/common-space/signals?" + query, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw Error();
        const result = await response.json();
        if (controller.signal.aborted) return;
        setData(result);
        setLoadError("");
        if (result.signals.some((signal: PublicSignal) => signal.status === "pending"))
          timer = setTimeout(load, 4000);
      } catch {
        if (!controller.signal.aborted) setLoadError("Não foi possível carregar os sinais.");
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, page, revision]);

  async function retry(signalId: string) {
    setRetrying(signalId);
    setRetryError("");
    try {
      const response = await fetch("/api/common-space/signals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: signalId, retry: true }),
      });
      if (!response.ok) throw Error();
      setRevision((value) => value + 1);
    } catch {
      setRetryError("Não foi possível repetir a análise.");
    } finally {
      setRetrying("");
    }
  }

  function goTo(next: number) {
    setData(null);
    setPage(next);
  }

  return (
    <section aria-labelledby="signals-title" className="space-y-5">
      <div className="border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-7">
        <h2 id="signals-title" className="font-serif text-3xl sm:text-4xl">
          Sinais
        </h2>
        <p className="my-3 max-w-xl leading-7 text-[#465347]">
          Ideias e relatos públicos sobre a Praça. A IA resume cada sinal, sugere um próximo passo e
          indica relatos relacionados.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("praca:compose-signal"))}
            className={action}
          >
            Dar um sinal
          </button>
          {id && (
            <a href={signalHref()} className={action}>
              Ver todos os sinais
            </a>
          )}
        </div>
      </div>
      {loadError && (
        <p role="alert">
          {loadError}{" "}
          <button className="underline" onClick={() => setRevision((value) => value + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {retryError && <p role="alert">{retryError}</p>}
      {!data && !loadError && <p role="status">Carregando sinais…</p>}
      {data?.signals.length === 0 && (
        <p>{id ? "Sinal indisponível." : "Nenhum sinal publicado ainda."}</p>
      )}
      {data?.signals.map((signal) => (
        <article key={signal.id} className="space-y-3 border border-[#c8c0b1] bg-[#fbf8f1] p-5">
          <p className="text-sm text-[#465347]">
            {signal.authorName ?? "Sem nome de perfil"} · {signal.page} ·{" "}
            <a className="underline" href={signalHref(signal.id)}>
              <time dateTime={new Date(signal.createdAt).toISOString()}>
                {date.format(signal.createdAt)}
              </time>
            </a>
          </p>
          <p className="whitespace-pre-wrap break-words leading-7">{signal.body}</p>
          {signal.analysis ? (
            <div className="space-y-2 border-t border-[#c8c0b1] pt-3 text-sm leading-6">
              <p className="font-bold">
                Análise da IA · {dispositions[signal.analysis.disposition]}
              </p>
              <p>{signal.analysis.summary}</p>
              <p>{signal.analysis.reason}</p>
              {signal.analysis.relatedId && (
                <a className="inline-block underline" href={signalHref(signal.analysis.relatedId)}>
                  Ler sinal relacionado
                </a>
              )}
              {signal.analysis.draft && (
                <details className="border-t border-[#c8c0b1] pt-2">
                  <summary className="cursor-pointer font-semibold">
                    Ler rascunho de pedido de votação
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="font-bold">{signal.analysis.draft.title}</p>
                    <p>
                      <strong>Área afetada</strong> · {signal.analysis.draft.scope}
                    </p>
                    <p>{signal.analysis.draft.change}</p>
                    <p>{signal.analysis.draft.impact}</p>
                    {data.canSubmit && (
                      <button className={action} onClick={() => onDraft(signal.analysis!.draft!)}>
                        Usar rascunho no pedido
                      </button>
                    )}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="border-t border-[#c8c0b1] pt-3 text-sm">
              <p>
                {signal.status === "pending"
                  ? "Aguardando análise da IA."
                  : "A IA ainda não conseguiu analisar este sinal."}
              </p>
              {signal.canRetry && (
                <button
                  className={action + " mt-2"}
                  disabled={Boolean(retrying)}
                  onClick={() => retry(signal.id)}
                >
                  {retrying === signal.id ? "Analisando…" : "Tentar análise novamente"}
                </button>
              )}
            </div>
          )}
        </article>
      ))}
      {!id && data && (page > 1 || data.hasMore) && (
        <nav aria-label="Páginas de sinais" className="flex gap-3">
          <button className={action} disabled={page === 1} onClick={() => goTo(page - 1)}>
            Anterior
          </button>
          <button className={action} disabled={!data.hasMore} onClick={() => goTo(page + 1)}>
            Próxima
          </button>
        </nav>
      )}
    </section>
  );
}
