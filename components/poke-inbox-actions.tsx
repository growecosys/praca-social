"use client";
import { Archive, LoaderCircle } from "lucide-react";
import { useState } from "react";
export default function PokeInboxActions({
  id,
  username,
  kind,
  actionLabel,
}: {
  id: number;
  username: string;
  kind: string;
  actionLabel: string;
}) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function act(action: "attend" | "return" | "decline" | "archive") {
    setBusy(action);
    setMessage("");
    const response = await fetch(`/api/pokes/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await response.json()) as { error?: string; href?: string; message?: string };
    if (!response.ok) {
      setMessage(data.error || "Não foi possível concluir.");
      setBusy("");
      return;
    }
    if (action === "attend" && data.href) {
      window.location.href = data.href;
      return;
    }
    setMessage(
      data.message || (action === "return" ? "Conexão estabelecida." : "Conexão atualizada."),
    );
    setBusy("");
    window.setTimeout(() => window.location.reload(), 500);
  }
  const asksResponse = kind === "opinion" || kind === "publish";
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() =>
            kind === "mystery" ? window.location.assign(`/u/${username}`) : act("attend")
          }
          disabled={Boolean(busy)}
          className="flex items-center gap-2 bg-[#244e35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy === "attend" && <LoaderCircle size={13} className="animate-spin" />}
          {actionLabel}
        </button>
        {kind === "mystery" && (
          <button
            onClick={() => act("return")}
            disabled={Boolean(busy)}
            className="border border-[#c8c0b1] px-3 py-2 text-xs font-bold"
          >
            Cutucar de volta
          </button>
        )}
        {asksResponse && (
          <button
            onClick={() => act("decline")}
            disabled={Boolean(busy)}
            className="border border-[#c8c0b1] px-3 py-2 text-xs font-bold"
          >
            Recusar
          </button>
        )}
        <button
          onClick={() => act("archive")}
          disabled={Boolean(busy)}
          aria-label="Arquivar"
          title="Arquivar"
          className="p-2"
        >
          <Archive size={15} />
        </button>
      </div>
      {message && (
        <p role="status" className="mt-2 text-xs text-[#667064]">
          {message}
        </p>
      )}
    </div>
  );
}
