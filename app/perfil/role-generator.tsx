"use client";

import { Check, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { useDialogFocus } from "../../lib/use-dialog-focus";
import { useState } from "react";

const questions = [
  "O que você protege?",
  "O que te revolta?",
  "Qual seu talento estranho?",
  "Qual seu defeito produtivo?",
  "Que mundo você procura?",
];
type Preview = {
  generationId: string;
  roleTitle: string;
  manifesto: string;
  mapping: {
    causa: string;
    adversario: string;
    metodo: string;
    contradicao: string;
    horizonte: string;
  };
  explanation: string;
  remaining: number;
};
function normalize(value: string) {
  return value
    .trim()
    .replace(/\s*([,;])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .replace(/[,;]\s*$/g, "");
}
function count(value: string) {
  return normalize(value)
    .split(/[\s,;]+/)
    .filter(Boolean).length;
}

export default function RoleGenerator({
  remaining: initialRemaining,
  answers: initialAnswers,
  currentRole,
  currentManifesto,
}: {
  remaining: number;
  answers: string[];
  currentRole: string;
  currentManifesto: string;
}) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useDialogFocus(
    open,
    () => {
      if (preview) void decide("reject");
      else setOpen(false);
    },
    busy,
    '[aria-labelledby="role-dialog-title"]',
  );
  const valid = answers.length === 5 && answers.every((answer) => count(answer) === 3);

  async function generate() {
    if (!valid) return setError("Cada resposta precisa ter exatamente três palavras.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: answers.map(normalize) }),
      });
      const data = (await response.json()) as Preview & { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar um novo papel.");
      setAnswers(answers.map(normalize));
      setPreview(data);
      setRemaining(data.remaining);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar um novo papel.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(action: "apply" | "reject") {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId: preview.generationId, action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir a escolha.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a escolha.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={remaining <= 0}
          className="inline-flex items-center gap-2 border border-[#244e35] px-3 py-2 text-xs font-semibold text-[#244e35] transition hover:bg-[#244e35] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw size={15} />
          Gerar novamente
        </button>
        <p className="mt-1 text-right text-[11px] text-[#667064]">{remaining} crédito(s)</p>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#14261b]/70 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-dialog-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border-2 border-[#244e35] bg-[#f5f1e8] p-5 shadow-[10px_10px_0_#df5c45] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">
                  revisão de identidade
                </p>
                <h2 id="role-dialog-title" className="mt-2 font-serif text-4xl">
                  {preview ? "Compare antes de escolher" : "Gerar um novo papel"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => (preview ? decide("reject") : setOpen(false))}
                disabled={busy}
                aria-label={preview ? "Manter papel atual e fechar" : "Fechar"}
                className="p-2 disabled:opacity-40"
              >
                <X />
              </button>
            </div>
            {!preview ? (
              <>
                <p className="mt-5 max-w-2xl leading-7 text-[#667064]">
                  Seu papel nasce das cinco respostas abaixo. Mantenha os mesmos sinais ou revise-os
                  antes da geração.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEdit(false);
                      setAnswers(initialAnswers);
                    }}
                    className={`border p-4 text-left ${!edit ? "border-[#244e35] bg-[#e7eee8]" : "border-[#c8c0b1]"}`}
                  >
                    <strong className="block">Manter respostas</strong>
                    <span className="mt-1 block text-sm text-[#667064]">
                      Usar exatamente os sinais atuais.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdit(true)}
                    className={`border p-4 text-left ${edit ? "border-[#244e35] bg-[#e7eee8]" : "border-[#c8c0b1]"}`}
                  >
                    <strong className="block">Revisar respostas</strong>
                    <span className="mt-1 block text-sm text-[#667064]">
                      Editar antes de gerar.
                    </span>
                  </button>
                </div>
                <div className="mt-6 space-y-4">
                  {questions.map((question, index) => (
                    <label key={question} className="block">
                      <span className="flex justify-between gap-4 text-sm font-semibold">
                        <span>
                          {index + 1}. {question}
                        </span>
                        <span
                          className={
                            count(answers[index] || "") === 3 ? "text-[#244e35]" : "text-[#9b3a2f]"
                          }
                        >
                          {count(answers[index] || "")}/3
                        </span>
                      </span>
                      <input
                        value={answers[index] || ""}
                        readOnly={!edit}
                        onChange={(event) =>
                          setAnswers((current) =>
                            current.map((answer, position) =>
                              position === index ? event.target.value : answer,
                            ),
                          )
                        }
                        onBlur={() =>
                          setAnswers((current) =>
                            current.map((answer, position) =>
                              position === index ? normalize(answer) : answer,
                            ),
                          )
                        }
                        className={`mt-2 w-full border px-3 py-3 outline-none ${edit ? "border-[#b7ae9f] bg-white focus:border-[#244e35]" : "border-[#d8d0c1] bg-[#ece7dc] text-[#667064]"}`}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-7 border-l-4 border-[#f0c64b] bg-[#fbf8f1] p-4 text-sm leading-6">
                  <strong>Ordem:</strong> confirme as respostas → use 1 crédito → compare o novo
                  papel → escolha aplicar ou manter o atual.
                </div>
                <button
                  type="button"
                  onClick={generate}
                  disabled={busy || !valid || remaining <= 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-[#244e35] px-5 py-4 font-semibold text-white disabled:opacity-40"
                >
                  {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{" "}
                  {busy ? "Inventando…" : "Gerar novo papel — usar 1 crédito"}
                </button>
              </>
            ) : (
              <>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <article className="border border-[#c8c0b1] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#667064]">
                      papel atual
                    </p>
                    <h3 className="mt-3 font-serif text-2xl text-[#244e35]">{currentRole}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#667064]">{currentManifesto}</p>
                  </article>
                  <article className="border-2 border-[#244e35] bg-[#fbf8f1] p-5 shadow-[5px_5px_0_#f0c64b]">
                    <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#667064]">
                      novo papel
                    </p>
                    <h3 className="mt-3 font-serif text-2xl text-[#244e35]">{preview.roleTitle}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#667064]">{preview.manifesto}</p>
                  </article>
                </div>
                <section className="mt-6 border border-[#c8c0b1] bg-[#ece7dc] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#667064]">
                    como suas respostas formaram o papel
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      ["Causa · o que protege", preview.mapping.causa],
                      ["Adversário · o que revolta", preview.mapping.adversario],
                      ["Método · talento estranho", preview.mapping.metodo],
                      ["Contradição · defeito produtivo", preview.mapping.contradicao],
                      ["Horizonte · mundo procurado", preview.mapping.horizonte],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-semibold">{label}</dt>
                        <dd className="text-[#667064]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 border-l-4 border-[#f0c64b] pl-3 text-sm leading-6 text-[#4f574f]">
                    {preview.explanation}
                  </p>
                </section>
                <p className="mt-6 text-sm text-[#667064]">
                  O crédito já foi utilizado para criar esta versão. O papel atual só muda se você
                  confirmar.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => decide("reject")}
                    disabled={busy}
                    className="border border-[#244e35] px-4 py-3 font-semibold text-[#244e35] disabled:opacity-40"
                  >
                    Manter papel atual
                  </button>
                  <button
                    type="button"
                    onClick={() => decide("apply")}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 bg-[#244e35] px-4 py-3 font-semibold text-white disabled:opacity-40"
                  >
                    {busy ? <LoaderCircle className="animate-spin" /> : <Check />} Usar novo papel
                  </button>
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-[#9b3a2f]">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
