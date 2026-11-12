"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  governanceSubmission,
  proposalFields,
  proposalKinds,
  proposalLabels,
  type GovernanceProposal,
} from "../lib/common-governance";

import type { VotingDraft } from "../lib/common-signals";

type ProposalPage = { canSubmit: boolean; proposals: GovernanceProposal[]; hasMore: boolean };

const fields = [
  { key: "title", placeholder: "Ex.: Como arquivar atividades concluídas nos Círculos?" },
  { key: "scope", placeholder: "Ex.: Todos os Círculos, Mural ou regras de votação" },
  {
    key: "change",
    placeholder:
      "Descreva a decisão que a votação deve permitir e os limites das propostas que poderiam entrar nela.",
  },
  {
    key: "impact",
    placeholder: "Quem se beneficia? Que efeitos, riscos ou dependências precisam ser avaliados?",
  },
] as const;

const actionClass =
  "inline-flex min-h-11 items-center justify-center border border-[#244e35] px-4 py-2 text-sm font-semibold disabled:opacity-40";
const inputClass = "mt-2 w-full border border-[#bdb5a7] bg-white px-3 py-2 text-base";

export default function CommonGovernance({ draft: initialDraft }: { draft?: VotingDraft }) {
  const [data, setData] = useState<ProposalPage | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [showForm, setShowForm] = useState(Boolean(initialDraft));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const request = useRef<{ id: string; fingerprint: string } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    fetch("/api/common-space/governance?page=" + page, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const result = await response.json();
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("Não foi possível carregar os pedidos.");
      });
    return () => controller.abort();
  }, [page, revision]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setSubmitError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const fingerprint = JSON.stringify(fields);
    if (request.current?.fingerprint !== fingerprint)
      request.current = { id: crypto.randomUUID(), fingerprint };
    const payload = governanceSubmission.safeParse({ ...fields, id: request.current.id });
    if (!payload.success) {
      setSubmitError(payload.error.issues[0].message);
      return;
    }

    inFlight.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/common-space/governance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        if (response.status === 409) request.current = null;
        throw Error(result.error ?? "Não foi possível confirmar o envio.");
      }
      request.current = null;
      setShowForm(false);
      setDraft(undefined);
      setNotice("Pedido de abertura publicado.");
      setPage(1);
      setRevision((value) => value + 1);
    } catch (error) {
      setSubmitError(
        error instanceof SyntaxError
          ? "Não foi possível confirmar o envio. Tente novamente com os mesmos dados."
          : (error as Error).message,
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    if (
      inFlight.current ||
      !window.confirm("Retirar seu pedido de abertura? Ele ficará no painel como retirado.")
    )
      return;
    inFlight.current = true;
    setCancellingId(id);
    setCancelError("");
    setNotice("");
    try {
      const response = await fetch("/api/common-space/governance", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true)
        throw Error(result.error ?? "Não foi possível confirmar a retirada.");
      setNotice("Pedido retirado.");
      setRevision((value) => value + 1);
    } catch {
      setCancelError("Não foi possível confirmar a retirada. Tente novamente.");
    } finally {
      setCancellingId("");
      inFlight.current = false;
    }
  }

  function turnPage(next: number) {
    setData(null);
    setPage(next);
  }

  return (
    <section
      id="propostas-coletivas"
      className="space-y-6"
      aria-labelledby="propostas-coletivas-titulo"
    >
      <div className="border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-7">
        <div>
          <h2 id="propostas-coletivas-titulo" className="font-serif text-3xl sm:text-4xl">
            Pedir uma votação
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-[#465347]">
            Diga qual assunto a comunidade deve decidir e o que a votação deve abranger.
          </p>
          {data?.canSubmit && (
            <button
              type="button"
              aria-expanded={showForm}
              onClick={() => {
                setShowForm((value) => !value);
                setNotice("");
                setSubmitError("");
              }}
              disabled={saving || Boolean(cancellingId)}
              className="mt-5 min-h-11 bg-[#244e35] px-5 py-2 font-semibold text-white disabled:opacity-40"
            >
              {showForm ? "Recolher formulário" : "Pedir nova votação"}
            </button>
          )}
          {data && !data.canSubmit && (
            <a href="/entrar" className={actionClass + " mt-5"}>
              Entre para pedir uma votação
            </a>
          )}
          {notice && (
            <p role="status" className="mt-4 font-semibold text-[#244e35]">
              {notice}
            </p>
          )}
        </div>
      </div>

      {showForm && data?.canSubmit && (
        <form
          onSubmit={submit}
          className="grid gap-4 border border-[#c8c0b1] bg-[#fbf8f1] p-5 sm:p-7"
        >
          <h3 className="font-serif text-2xl">Pedir a abertura de uma votação</h3>
          {draft && (
            <p className="text-sm">
              Rascunho da IA. Revise a pergunta, o escopo e as dependências antes de publicar.
            </p>
          )}
          <fieldset disabled={saving} className="grid gap-4 disabled:opacity-60">
            <label className="block text-sm font-semibold">
              Tipo de decisão
              <select name="kind" defaultValue={draft?.kind} className={inputClass}>
                {proposalKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {proposalLabels[kind]}
                  </option>
                ))}
              </select>
            </label>
            {fields.map(({ key, placeholder }) => {
              const { label, min, max } = proposalFields[key];
              const props = {
                name: key,
                required: true,
                minLength: min,
                maxLength: max,
                defaultValue: draft?.[key],
                placeholder,
                className: inputClass,
              };
              return (
                <label key={key} className="block text-sm font-semibold">
                  {label}
                  {key === "title" || key === "scope" ? (
                    <input {...props} />
                  ) : (
                    <textarea {...props} rows={4} />
                  )}
                </label>
              );
            })}
            <label className="block text-sm font-semibold">
              Como deveria funcionar a votação? (opcional)
              <textarea
                name="rules"
                maxLength={600}
                rows={3}
                placeholder="Sugira prazo, quem pode votar ou como decidir em caso de empate."
                className={inputClass}
              />
            </label>
            <p className="text-sm leading-6 text-[#465347]">
              O pedido e o nome do seu perfil ficam públicos. Você pode retirar o pedido enquanto
              ele aguarda análise.
            </p>
            <button
              type="submit"
              className="min-h-11 justify-self-start bg-[#244e35] px-5 py-2 font-semibold text-white"
            >
              {saving ? "Publicando…" : "Publicar pedido"}
            </button>
          </fieldset>
          {submitError && (
            <p role="alert" className="text-sm font-semibold text-red-800">
              {submitError}
            </p>
          )}
        </form>
      )}

      <section aria-labelledby="propostas-recebidas-titulo" className="space-y-4">
        <h3 id="propostas-recebidas-titulo" className="font-serif text-3xl">
          Pedidos de votação
        </h3>
        {cancelError && (
          <p role="alert" className="text-sm font-semibold text-red-800">
            {cancelError}
          </p>
        )}
        {loadError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <p>{loadError}</p>
            <button
              type="button"
              className={actionClass}
              onClick={() => setRevision((value) => value + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : !data ? (
          <p role="status">Carregando pedidos…</p>
        ) : (
          <>
            {!data.proposals.length && (
              <p className="border border-dashed border-[#bdb5a7] p-5 text-[#465347]">
                Ainda não há pedidos nesta página.
              </p>
            )}
            {data.proposals.map((proposal) => (
              <details key={proposal.id} className="border border-[#c8c0b1] bg-[#fbf8f1]">
                <summary className="cursor-pointer break-words p-4 sm:p-5">
                  <span className="ml-1 text-xs font-bold uppercase tracking-wide text-[#48604c]">
                    {proposalLabels[proposal.kind]} ·{" "}
                    {proposal.cancelledAt ? "Retirado" : "Aguardando análise"}
                  </span>
                  <span className="mt-2 block font-serif text-2xl">{proposal.title}</span>
                  <span className="mt-1 block text-sm text-[#465347]">{proposal.scope}</span>
                </summary>
                <div className="space-y-4 border-t border-[#d8d0c1] p-4 sm:p-5">
                  <p className="text-sm text-[#465347]">
                    {proposal.username ? (
                      <a className="underline" href={"/u/" + encodeURIComponent(proposal.username)}>
                        {proposal.displayName || proposal.username}
                      </a>
                    ) : (
                      "Conta indisponível"
                    )}{" "}
                    ·{" "}
                    <time dateTime={proposal.createdAt}>
                      {new Date(proposal.createdAt).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </time>
                  </p>
                  <div>
                    <h4 className="font-bold">O que a comunidade decidiria</h4>
                    <p className="whitespace-pre-wrap break-words leading-7">{proposal.change}</p>
                  </div>
                  <div>
                    <h4 className="font-bold">Benefício coletivo e pontos de análise</h4>
                    <p className="whitespace-pre-wrap break-words leading-7">{proposal.impact}</p>
                  </div>
                  {proposal.rules && (
                    <div>
                      <h4 className="font-bold">Regras sugeridas</h4>
                      <p className="whitespace-pre-wrap break-words leading-7">{proposal.rules}</p>
                    </div>
                  )}
                  {proposal.canCancel && (
                    <button
                      type="button"
                      disabled={saving || Boolean(cancellingId)}
                      className={actionClass}
                      onClick={() => cancel(proposal.id)}
                    >
                      {cancellingId === proposal.id ? "Retirando…" : "Retirar meu pedido"}
                    </button>
                  )}
                </div>
              </details>
            ))}
            {(page > 1 || data.hasMore) && (
              <nav
                className="flex flex-wrap items-center gap-3"
                aria-label="Páginas de pedidos de votação"
              >
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => turnPage(page - 1)}
                  className={actionClass}
                >
                  Anterior
                </button>
                <span className="text-sm">Página {page}</span>
                <button
                  type="button"
                  disabled={!data.hasMore}
                  onClick={() => turnPage(page + 1)}
                  className={actionClass}
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </section>
  );
}
