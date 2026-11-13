"use client";
import { useEffect, useState } from "react";
export default function PokeButton({
  username,
  compact = false,
}: {
  username: string;
  compact?: boolean;
}) {
  const [state, setState] = useState("loading"),
    [id, setId] = useState<number>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(username)}/poke`)
      .then((r) => r.json())
      .then((d) => {
        setState(d.state || "new");
        setId(d.id);
      })
      .catch(() => setState("new"));
  }, [username]);
  async function act() {
    setBusy(true);
    try {
      const r = await fetch(
        state === "incoming"
          ? `/api/pokes/${id}`
          : `/api/users/${encodeURIComponent(username)}/poke`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(state === "incoming" ? { action: "return" } : { kind: "mystery" }),
        },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setState(state === "incoming" ? "connected" : "sent");
      setMessage(d.message || "Conexão estabelecida.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    loading: "Carregando…",
    connected: "✓ Conectados",
    incoming: "Cutucar de volta e conectar",
    sent: "Aproximação registrada",
    new: "👉 Cutucar",
  };
  return (
    <div>
      <button
        onClick={act}
        disabled={busy || ["loading", "connected", "sent"].includes(state)}
        className={`bg-[#f0c64b] font-bold text-[#14261b] disabled:opacity-60 ${compact ? "px-3 py-2" : "px-5 py-3"}`}
      >
        {labels[state]}
      </button>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
