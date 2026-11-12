"use client";
import { useDialogFocus } from "../lib/use-dialog-focus";
import { useEffect, useRef, useState } from "react";
import { readImageResponse } from "../lib/image-upload";
import { useAutosave } from "../lib/use-autosave";
export default function PostImageGenerator({
  content,
  onInsert,
}: {
  content: string;
  onInsert: (url: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [prompt, setPrompt] = useState(""),
    [style, setStyle] = useState("Fotografia simbólica e realista"),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [url, setUrl] = useState(""),
    [remaining, setRemaining] = useState<number | null>(null),
    [images, setImages] = useState<Array<{ id: string; url: string }>>([]);
  useDialogFocus(open, () => setOpen(false), busy, '[aria-label="Criar imagem para a publicação"]');
  const lock = useRef(false);
  const requestId = useRef("");
  useAutosave("praca-post-image-prompt", { prompt, style }, (v) => {
    setPrompt(v.prompt || "");
    setStyle(v.style || "Fotografia simbólica e realista");
  });
  async function refresh() {
    try {
      const d = await readImageResponse(await fetch("/api/post-images", { cache: "no-store" }));
      setRemaining(d.remaining);
      setImages(d.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar a cota.");
    }
  }
  useEffect(() => {
    if (open) void refresh();
  }, [open]);
  function suggest() {
    if (content.trim().length < 40) {
      setError(
        "Escreva pelo menos algumas frases na publicação ou descreva sua imagem manualmente.",
      );
      return;
    }
    setPrompt(
      `Crie uma imagem editorial que represente simbolicamente o tema central deste texto, com profundidade e uma composição clara. Evite ilustrações genéricas e texto escrito na imagem.\n\nTexto de referência:\n${content.trim().slice(0, 4500)}`,
    );
    setConfirmed(false);
    setError("");
  }
  async function generate() {
    if (lock.current || !confirmed || prompt.trim().length < 20) return;
    lock.current = true;
    setBusy(true);
    setError("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const d = await readImageResponse(
        await fetch("/api/post-images", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: `Estilo visual: ${style}.\n\n${prompt}`,
            confirmed: true,
            requestId: requestId.current,
          }),
        }),
      );
      setUrl(d.url);
      setRemaining(d.remaining);
      setImages(d.images || []);
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "A geração falhou.");
      await refresh();
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-[#b7ae9f] px-4 py-3 text-sm"
      >
        ✦ Criar imagem com IA
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Criar imagem para a publicação"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) setOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto bg-[#f5f1e8] p-5 sm:p-8">
            <div className="flex justify-between gap-4">
              <h2 className="font-serif text-3xl">Imagem para sua publicação</h2>
              <button disabled={busy} onClick={() => setOpen(false)} aria-label="Fechar">
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm">
              1. Prepare o prompt · 2. Revise e confirme · 3. Confira a prévia e insira.
            </p>
            <p className="mt-2 text-sm">
              {remaining === null
                ? "Consultando créditos…"
                : `${remaining} de 3 créditos de imagens para posts disponíveis. Cota separada do avatar.`}
            </p>
            <button disabled={busy} onClick={suggest} className="mt-5 border px-3 py-2 text-sm">
              Preparar prompt a partir do texto
            </button>
            <p className="mt-2 text-xs">Preparar esta sugestão não inicia uma geração de imagem.</p>
            <label className="mt-4 block">
              Prompt
              <textarea
                value={prompt}
                maxLength={5700}
                disabled={busy}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setConfirmed(false);
                  requestId.current = "";
                }}
                className="mt-2 min-h-40 w-full border border-[#b7ae9f] bg-white p-3"
                placeholder="Descreva a cena, os símbolos e a composição…"
              />
            </label>
            <label className="mt-4 block">
              Estilo
              <select
                value={style}
                disabled={busy}
                onChange={(e) => {
                  setStyle(e.target.value);
                  setConfirmed(false);
                  requestId.current = "";
                }}
                className="mt-2 w-full border bg-white p-3"
              >
                {[
                  "Fotografia simbólica e realista",
                  "Ilustração editorial",
                  "Gravura brasileira",
                  "Colagem conceitual",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="mt-5 flex gap-3 text-sm">
              <input
                type="checkbox"
                disabled={busy}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Revisei o prompt e autorizo usar 1 crédito para gerar esta imagem.
            </label>
            <button
              disabled={
                busy ||
                !confirmed ||
                prompt.trim().length < 20 ||
                remaining === null ||
                remaining === 0
              }
              onClick={generate}
              className="mt-4 bg-[#244e35] px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              {busy ? "Gerando… aguarde sem fechar" : "Confirmar e gerar · 1 crédito"}
            </button>
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-800">
                {error}
              </p>
            )}
            {url && (
              <section className="mt-6">
                <img
                  src={url}
                  alt="Prévia da imagem gerada"
                  className="max-h-80 w-full object-contain"
                />
                <button
                  onClick={() => {
                    onInsert(url);
                    setOpen(false);
                  }}
                  className="mt-3 bg-[#244e35] px-4 py-3 text-white"
                >
                  Inserir na publicação
                </button>
                <button
                  onClick={() => {
                    requestId.current = "";
                    setUrl("");
                    setConfirmed(false);
                  }}
                  className="ml-3 p-3 text-sm"
                >
                  Preparar outra geração
                </button>
              </section>
            )}
            {images.length > 0 && (
              <details className="mt-6 border-t pt-4">
                <summary>Suas imagens anteriores · reutilizar não gasta crédito</summary>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setUrl(image.url)}
                      aria-label="Selecionar imagem anterior"
                    >
                      <img
                        src={image.url}
                        alt="Imagem gerada anteriormente"
                        className="aspect-square w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </details>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="mt-6 min-h-11 border border-[#bdb5a7] px-5 disabled:opacity-40"
            >
              Cancelar e voltar ao texto
            </button>
          </div>
        </div>
      )}
    </>
  );
}
