"use client";

import { useState, type FormEvent } from "react";

export default function StoryInvites({
  campaign,
  canInvite,
}: {
  campaign: string;
  canInvite: boolean;
}) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const url = `https://praca.social/jogar/historias?campanha=${encodeURIComponent(campaign)}`;
  const message =
    "Vem jogar Histórias da Praça comigo? A campanha é coletiva e cada pessoa joga no seu horário.";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copiado.");
    } catch {
      setStatus("Copie o link do campo abaixo.");
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/historias/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign, username }),
      });
      const data = await response.json();
      setStatus(data.message || data.error || "Não foi possível enviar o convite.");
      if (response.ok) setUsername("");
    } catch {
      setStatus("Não foi possível enviar o convite. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="stories-invites mt-4">
      <summary className="cursor-pointer text-sm font-semibold">Convidar para esta turma</summary>
      <div className="mt-4 grid gap-4">
        <p className="text-sm">
          Compartilhe o link com quem está fora. Cada pessoa faz a própria inscrição.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="stories-secondary" type="button" onClick={copy}>
            Copiar link
          </button>
          <a
            className="stories-secondary"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(message + " " + url)}`}
          >
            WhatsApp
          </a>
        </div>
        <input
          className="min-w-0 border border-[#aeb69e] bg-white/60 px-3 py-2 text-xs"
          aria-label="Link da turma"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
        {canInvite && (
          <form onSubmit={invite}>
            <label className="block text-sm font-semibold" htmlFor="story-invite-user">
              Pelo sino da Praça
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="story-invite-user"
                className="min-w-0 flex-1 border border-[#aeb69e] bg-white/60 px-3 py-2 text-sm"
                placeholder="@usuário"
                required
                maxLength={61}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button className="stories-primary" disabled={busy || !username.trim()}>
                {busy ? "Enviando…" : "Enviar convite"}
              </button>
            </div>
          </form>
        )}
        <p role="status" className="text-sm">
          {status}
        </p>
      </div>
    </details>
  );
}
