"use client";
import { useState } from "react";
import { useAutosave, clearAutosave } from "../lib/use-autosave";
type Person = { id: string; displayName: string };
export default function CircleControls({
  circle,
  userId,
  people = [],
  members = [],
  initialInvite,
}: {
  circle?: any;
  userId: string;
  people?: Person[];
  members?: any[];
  initialInvite?: string;
}) {
  const [draft, setDraft] = useState({
    name: circle?.name || "",
    mission: circle?.mission || "",
    success: circle?.success || "",
    emblem: circle?.emblem || "🌱",
    kind: "help",
    visibility: "public",
    invites: people.some((p) => p.id === initialInvite) ? [initialInvite!] : ([] as string[]),
  });
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("update");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = `circle-draft:${userId}:${circle?.id || "new"}`;
  useAutosave(key, draft, (saved) =>
    setDraft({
      ...saved,
      invites: [
        ...new Set([
          ...(saved.invites || []),
          ...(initialInvite && people.some((p) => p.id === initialInvite) ? [initialInvite] : []),
        ]),
      ],
    }),
  );
  const [review, setReview] = useState<{ label: string; data: any } | null>(null);
  const owner = circle?.ownerId === userId;
  const member = members.find((m) => m.userId === userId);
  async function act(data: any) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/circles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleId: circle?.id, ...data }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      if (data.action === "create" || data.action === "edit") clearAutosave(key);
      window.location.href = result.href || window.location.href;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const button = (label: string, data: any) => (
    <button
      disabled={busy}
      onClick={() => {
        if (
          ["remove", "transfer", "leave"].includes(data.action) ||
          ["archived", "interrupted"].includes(data.status)
        ) {
          setReview({ label, data });
        } else void act(data);
      }}
      className="border border-[#244e35] px-3 py-2 text-sm disabled:opacity-40"
    >
      {label}
    </button>
  );
  const fields = (
    <div className="grid gap-4">
      <label>
        Nome
        <input
          required
          maxLength={100}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="block w-full border bg-white p-3"
        />
      </label>
      <label>
        Emblema
        <select
          value={draft.emblem}
          onChange={(e) => setDraft({ ...draft, emblem: e.target.value })}
          className="ml-3 border p-2"
        >
          {["🌱", "🤝", "🧩", "🚀", "🦜", "☀️", "🪑", "🐢"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        O que vamos fazer?
        <textarea
          required
          maxLength={2000}
          value={draft.mission}
          onChange={(e) => setDraft({ ...draft, mission: e.target.value })}
          className="block w-full border bg-white p-3"
        />
      </label>
      <label>
        Como saberemos que conseguimos?
        <textarea
          required
          maxLength={2000}
          value={draft.success}
          onChange={(e) => setDraft({ ...draft, success: e.target.value })}
          className="block w-full border bg-white p-3"
        />
      </label>
    </div>
  );
  return (
    <section className="space-y-5">
      {!circle ? (
        <>
          <p className="text-sm">
            1. Escolha a ação · 2. Defina a missão · 3. Convide · 4. Revise e crie
          </p>
          <select
            aria-label="Tipo de círculo"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            className="w-full border p-3"
          >
            <option value="help">🤝 Ajudar alguém</option>
            <option value="solve">🧩 Resolver um problema</option>
            <option value="make">🚀 Fazer algo acontecer</option>
          </select>
          {fields}
          <label className="block">
            Visibilidade
            <select
              value={draft.visibility}
              onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}
              className="ml-3 border p-2"
            >
              <option value="public">Público</option>
              <option value="private">Só participantes</option>
            </select>
          </label>
          <fieldset>
            <legend>Convide suas conexões</legend>
            {people.length ? (
              people.map((p) => (
                <label key={p.id} className="m-2 inline-flex gap-2">
                  <input
                    type="checkbox"
                    checked={draft.invites.includes(p.id)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        invites: e.target.checked
                          ? [...draft.invites, p.id]
                          : draft.invites.filter((x) => x !== p.id),
                      })
                    }
                  />
                  {p.displayName}
                </label>
              ))
            ) : (
              <p className="text-sm">
                Conecte-se com alguém para convidar. Você já pode preparar o círculo.
              </p>
            )}
          </fieldset>
          <details className="border p-4">
            <summary>Revisar missão</summary>
            <p>
              {draft.emblem} {draft.name}
            </p>
            <p>{draft.mission}</p>
            <p>Conseguimos quando: {draft.success}</p>
            <p>
              {draft.invites.length} convites ·{" "}
              {draft.visibility === "public" ? "Público" : "Reservado"}
            </p>
          </details>
          {button("Criar círculo", { action: "create", ...draft })}
          <a
            href="/conexoes?view=circles"
            className="inline-flex min-h-11 items-center px-4 underline"
          >
            Cancelar e voltar
          </a>
          <p className="text-xs">Rascunho salvo automaticamente neste dispositivo.</p>
        </>
      ) : (
        <>
          {member?.status === "invited" && (
            <div className="flex gap-3">
              {button("Aceitar convite", { action: "accept" })}
              {button("Recusar", { action: "decline" })}
            </div>
          )}
          {!member &&
            circle.visibility === "public" &&
            button("Pedir para participar", { action: "request" })}
          {member?.status === "requested" && <p>Seu pedido aguarda o responsável.</p>}
          {member?.status === "active" && (
            <>
              <h2 className="font-serif text-2xl">Registrar contribuição</h2>
              <select
                aria-label="Tipo de contribuição"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="border p-2"
              >
                <option value="update">Boletim</option>
                <option value="task">Tarefa</option>
                <option value="result">Resultado / evidência</option>
              </select>
              <textarea
                aria-label="Contribuição"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                className="block w-full border bg-white p-3"
                placeholder="O que aconteceu? Links podem acompanhar o relato."
              />
              {button("Registrar", { action: "entry", kind, body })}
              {!owner && button("Sair do círculo", { action: "leave" })}
            </>
          )}
          {owner && (
            <details id="gestao" className="border p-5">
              <summary className="cursor-pointer font-bold">
                Gerir círculo · Zelador do Caos
              </summary>
              <div className="mt-5 space-y-5">
                {fields}
                {button("Salvar alterações", { action: "edit", ...draft })}
                <button
                  type="button"
                  onClick={() => {
                    setDraft({
                      ...draft,
                      name: circle.name,
                      mission: circle.mission,
                      success: circle.success,
                      emblem: circle.emblem,
                    });
                    clearAutosave(key);
                  }}
                  className="min-h-11 border px-4"
                >
                  Desfazer edição
                </button>
                <h3>Estado</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["gathering", "Reunindo gente"],
                    ["active", "Em ação"],
                    ["interrupted", "Interrompido"],
                    ["archived", "Arquivar"],
                  ].map(([status, label]) => (
                    <span key={status}>{button(label, { action: "status", status })}</span>
                  ))}
                </div>
                <p>Para concluir, escreva o resultado no campo de contribuição acima.</p>
                {button("Missão cumprida", { action: "status", status: "completed", body })}
                <h3>Convidar conexões</h3>
                <div className="flex flex-wrap gap-2">
                  {people
                    .filter(
                      (p) =>
                        !members.some(
                          (m) => m.userId === p.id && ["active", "invited"].includes(m.status),
                        ),
                    )
                    .map((p) => (
                      <span key={p.id}>
                        {button(p.displayName, { action: "invite", userId: p.id })}
                      </span>
                    ))}
                </div>
                <h3>Participantes e pedidos</h3>
                {members
                  .filter((m) => m.userId !== userId)
                  .map((m) => (
                    <div key={m.userId} className="flex flex-wrap items-center gap-2 border-t pt-2">
                      <span>
                        {m.name} · {m.status}
                      </span>
                      {m.status === "requested" &&
                        button("Aceitar", { action: "approve", userId: m.userId })}
                      {m.status === "active" &&
                        button("Transferir responsabilidade", {
                          action: "transfer",
                          userId: m.userId,
                        })}
                      {button("Remover", { action: "remove", userId: m.userId })}
                    </div>
                  ))}
              </div>
            </details>
          )}
        </>
      )}
      {review && (
        <div
          role="region"
          aria-label="Confirmar alteração no círculo"
          className="border-2 border-[#244e35] bg-[#fff4dd] p-5"
        >
          <h3 className="font-semibold">{review.label}?</h3>
          <p className="mt-2 text-sm">Revise esta ação antes de continuar.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={() => {
                void act(review.data);
                setReview(null);
              }}
              className="min-h-11 bg-[#244e35] px-4 text-white"
            >
              Confirmar
            </button>
            <button
              disabled={busy}
              onClick={() => setReview(null)}
              className="min-h-11 border px-4"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
export function CircleTaskAction({
  circleId,
  entryId,
  assigned,
  status,
  userId,
}: {
  circleId: number;
  entryId: number;
  assigned: string | null;
  status: string;
  userId: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(operation: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/circles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "task", circleId, entryId, operation }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      window.location.reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-2 flex gap-3 text-sm">
      {status !== "done" && (!assigned || assigned === userId) && (
        <>
          <button disabled={busy} onClick={() => run(assigned ? "done" : "claim")}>
            {assigned ? "Marcar como feito" : "Eu assumo"}
          </button>
          {assigned && (
            <button disabled={busy} onClick={() => run("release")}>
              Devolver tarefa
            </button>
          )}
        </>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
