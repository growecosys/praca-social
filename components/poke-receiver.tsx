"use client";
import { Archive, Hand, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

type Poke = {
  id: number;
  kind: string;
  senderName: string;
  senderUsername: string;
  targetSlug: string | null;
  targetTitle: string | null;
};
const text: Record<string, { headline: string; detail: string; action: string }> = {
  opinion: {
    headline: "quer seu parecer.",
    detail: "Você foi chamado para uma conversa da Praça.",
    action: "Dar meu parecer",
  },
  publish: {
    headline: "passou a palavra para você.",
    detail: "A cadeira está vazia e esperam uma publicação sua.",
    action: "Aceitar a palavra",
  },
  missing: {
    headline: "notou sua ausência.",
    detail: "Consta em ata que você anda sumido da Praça.",
    action: "Reaparecer",
  },
  mystery: {
    headline: "cutucou você.",
    detail: "Cutucar de volta aceita a conexão entre vocês.",
    action: "Investigar",
  },
};
export default function PokeReceiver() {
  const [poke, setPoke] = useState<Poke | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function check() {
      const response = await fetch("/api/pokes", { cache: "no-store" });
      if (!response.ok || !active) return;
      const data = (await response.json()) as { poke?: Poke | null };
      if (data.poke) setPoke(data.poke);
    }
    function onNotifications() {
      void check();
    }
    check();
    window.addEventListener("praca-notifications", onNotifications);
    return () => {
      active = false;
      window.removeEventListener("praca-notifications", onNotifications);
    };
  }, []);
  async function action(name: "attend" | "return" | "archive") {
    if (!poke) return;
    setBusy(name);
    setError("");
    const current = poke;
    const response = await fetch(`/api/pokes/${poke.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: name }),
    });
    const data = (await response.json()) as { error?: string; href?: string };
    if (!response.ok) {
      setError(data.error || "A resposta tropeçou.");
      setBusy("");
      return;
    }
    setPoke(null);
    setBusy("");
    if (name === "attend" && data.href) window.location.href = data.href;
  }
  if (!poke) return null;
  const copy = text[poke.kind] || text.mystery;
  return (
    <aside
      role="dialog"
      aria-label="Cutucada recebida"
      aria-live="assertive"
      className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-xl rotate-[-1deg] border-4 border-[#14261b] bg-[#f0c64b] p-5 text-[#14261b] shadow-[10px_10px_0_#df5c45] sm:top-7"
    >
      <button
        onClick={() => action("archive")}
        aria-label="Arquivar cutucada"
        className="absolute right-2 top-2 p-2 hover:bg-black/10"
      >
        <X size={19} />
      </button>
      <div className="flex items-center gap-5 pr-8">
        <span className="animate-bounce text-6xl" aria-hidden="true">
          👉
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em]">atenção, atenção</p>
          <p className="mt-1 font-serif text-2xl leading-tight">
            <a
              href={`/u/${poke.senderUsername}`}
              className="underline decoration-2 underline-offset-4"
            >
              {poke.senderName}
            </a>{" "}
            {copy.headline}
          </p>
          <p className="mt-1 text-sm font-medium">{copy.detail}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-[#14261b]/20 pt-4">
        <button
          onClick={() => window.location.assign(`/u/${poke.senderUsername}`)}
          disabled={Boolean(busy)}
          className="flex items-center gap-2 bg-[#14261b] px-4 py-2 text-sm font-bold text-[#f0c64b] disabled:opacity-60"
        >
          {busy === "attend" ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Hand size={16} />
          )}
          Investigar
        </button>
        <button
          onClick={() => action("return")}
          disabled={Boolean(busy)}
          className="px-3 py-2 text-sm font-bold underline underline-offset-4"
        >
          Cutucar de volta
        </button>
        <button
          onClick={() => action("archive")}
          disabled={Boolean(busy)}
          title="Arquivar"
          className="p-2"
        >
          <Archive size={17} />
        </button>
        <a href="/conexoes" className="ml-auto text-sm font-bold underline underline-offset-4">
          Ver conexões
        </a>
        {error && <p className="w-full text-sm font-semibold text-[#8a2e24]">{error}</p>}
      </div>
    </aside>
  );
}
