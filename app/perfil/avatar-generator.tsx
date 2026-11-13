"use client";

import { Check, Copy, Eye, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useDialogFocus } from "../../lib/use-dialog-focus";
import { useState } from "react";

type PromptData = {
  prompt: string;
  factors: {
    roleTitle: string;
    manifesto: string;
    answers: string[];
    symbol: string;
    colors: string[];
    style: string;
    rules: string;
  };
  settings: {
    model: string;
    size: string;
    quality: string;
    outputFormat: string;
  };
};

export default function AvatarGenerator({
  hasImage,
  remaining,
  roleTitle: _roleTitle,
  answers: _answers,
  avatarJson: _avatarJson,
}: {
  hasImage: boolean;
  remaining: number;
  roleTitle: string;
  answers: string[];
  avatarJson: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PromptData | null>(null);
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  useDialogFocus(open, () => setOpen(false), busy, '[aria-labelledby="avatar-dialog-title"]');
  const finalPrompt = data
    ? `${data.prompt}${direction.trim() ? ` Additional art direction: ${direction.trim()}.` : ""}`
    : "";

  async function inspect() {
    setOpen(true);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/avatar");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível montar o prompt.");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível montar o prompt.");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const raw = await response.text();
      let result: any = {};
      try {
        result = JSON.parse(raw);
      } catch {}
      if (!response.ok) throw new Error(result.error || "Não foi possível gerar a imagem.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar a imagem.");
      setBusy(false);
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mt-4">
      <button
        onClick={inspect}
        disabled={remaining <= 0}
        className="flex w-full items-center justify-center gap-2 border border-[#244e35] px-4 py-3 text-sm font-semibold text-[#244e35] disabled:opacity-40"
      >
        <Eye size={17} />
        {hasImage ? "Revisar e gerar nova versão" : "Preparar avatar com IA"}
      </button>
      <p className="mt-2 text-xs text-[#667064]">{remaining} geração(ões) disponível(is).</p>
      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#14261b]/70 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-dialog-title"
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border-2 border-[#244e35] bg-[#f5f1e8] p-5 shadow-[10px_10px_0_#f0c64b] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#667064]">
                  transparência da geração
                </p>
                <h2 id="avatar-dialog-title" className="mt-2 font-serif text-4xl">
                  O que formará seu avatar
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="p-2"
              >
                <X />
              </button>
            </div>
            {busy && !data ? (
              <div className="grid min-h-56 place-items-center">
                <LoaderCircle className="animate-spin text-[#244e35]" />
              </div>
            ) : (
              data && (
                <>
                  <ol className="mt-6 grid gap-2 text-sm sm:grid-cols-4">
                    {[
                      "Revisar influências",
                      "Adicionar direção",
                      "Conferir prompt",
                      "Gerar imagem",
                    ].map((label, index) => (
                      <li key={label} className="border border-[#c8c0b1] p-3">
                        <span className="mr-2 inline-grid size-6 place-items-center bg-[#244e35] text-xs text-white">
                          {index + 1}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 border-l-4 border-[#244e35] bg-[#e7eee8] p-4 text-sm leading-6">
                    <strong>Base atual:</strong> este avatar será inspirado em
                    <strong> {data.factors.roleTitle}</strong> e no manifesto selecionado. Trocar de
                    papel altera automaticamente este prompt.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <article className="border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#667064]">
                        elementos pessoais
                      </p>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div>
                          <dt className="font-semibold">Papel ativo</dt>
                          <dd className="text-[#667064]">{data.factors.roleTitle}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold">Manifesto ativo</dt>
                          <dd className="text-[#667064]">{data.factors.manifesto}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold">Símbolo</dt>
                          <dd className="text-[#667064]">{data.factors.symbol}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold">Cores</dt>
                          <dd className="mt-1 flex gap-2">
                            {data.factors.colors.map((color) => (
                              <span
                                key={color}
                                title={color}
                                className="size-7 border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold">Respostas</dt>
                          <dd className="text-[#667064]">{data.factors.answers.join(" · ")}</dd>
                        </div>
                      </dl>
                    </article>
                    <article className="border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#667064]">
                        regras da praça · fixas
                      </p>
                      <p className="mt-3 text-sm leading-6 text-[#667064]">{data.factors.style}</p>
                      <p className="mt-3 text-sm leading-6 text-[#667064]">{data.factors.rules}</p>
                      <p className="mt-4 text-xs">
                        {data.settings.model} · {data.settings.size} · qualidade{" "}
                        {data.settings.quality}
                      </p>
                    </article>
                  </div>
                  <label className="mt-6 block">
                    <span className="text-sm font-semibold">
                      Direção adicional{" "}
                      <span className="font-normal text-[#667064]">(opcional)</span>
                    </span>
                    <textarea
                      value={direction}
                      onChange={(event) => setDirection(event.target.value.slice(0, 300))}
                      rows={3}
                      placeholder="Ex.: mais abstrato, menos sombrio, use mais verde…"
                      className="mt-2 w-full resize-y border border-[#b7ae9f] bg-white px-3 py-3 outline-none focus:border-[#244e35]"
                    />
                    <span className="mt-1 block text-right text-xs text-[#667064]">
                      {direction.length}/300
                    </span>
                  </label>
                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Prompt enviado à IA</p>
                      <button
                        type="button"
                        onClick={copyPrompt}
                        className="flex items-center gap-2 text-xs underline underline-offset-4"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "Copiado" : "Copiar prompt"}
                      </button>
                    </div>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap border bg-[#ece7dc] p-4 text-xs leading-5 text-[#4f574f]">
                      {finalPrompt}
                    </pre>
                  </div>
                  <p className="mt-5 border-l-4 border-[#f0c64b] bg-[#fbf8f1] p-4 text-sm leading-6">
                    A geração utilizará 1 crédito. O prompt, as influências e as configurações serão
                    registrados no histórico de auditoria.
                  </p>
                  <button
                    type="button"
                    onClick={generate}
                    disabled={busy || remaining <= 0}
                    className="mt-5 flex w-full items-center justify-center gap-2 bg-[#244e35] px-5 py-4 font-semibold text-white disabled:opacity-40"
                  >
                    {busy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
                    {busy ? "Gerando imagem…" : "Gerar avatar — usar 1 crédito"}
                  </button>
                </>
              )
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-[#9b3a2f]">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
