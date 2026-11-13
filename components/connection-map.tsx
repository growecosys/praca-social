"use client";
import { useState } from "react";
type Person = { id: string; displayName: string; username: string };
type Circle = { id: number; name: string; emblem: string; status: string };
type Edge = { a: string; b: string; level: number; days: number };
export default function ConnectionMap({
  self,
  people,
  edges,
  circles,
  members,
}: {
  self: Person;
  people: Person[];
  edges: Edge[];
  circles: Circle[];
  members: { circleId: number; userId: string }[];
}) {
  const [mode, setMode] = useState("people"),
    [selected, setSelected] = useState(self.id);
  const nodes = [
    { id: self.id, label: "Você", href: "/perfil", kind: "person", avatar: self.id },
    ...people.map((p) => ({
      id: p.id,
      label: p.displayName,
      href: `/u/${p.username}`,
      kind: "person",
      avatar: p.id,
    })),
    ...(mode === "circles"
      ? circles.map((c) => ({
          id: `circle-${c.id}`,
          label: c.name,
          href: `/circulos/${c.id}`,
          kind: "circle",
          avatar: c.emblem,
        }))
      : []),
  ];
  const positions = nodes.map((n, i) => ({
    ...n,
    x:
      i === 0
        ? 400
        : 400 +
          290 * Math.cos((2 * Math.PI * (i - 1)) / Math.max(nodes.length - 1, 1) - Math.PI / 2),
    y:
      i === 0
        ? 260
        : 260 +
          190 * Math.sin((2 * Math.PI * (i - 1)) / Math.max(nodes.length - 1, 1) - Math.PI / 2),
  }));
  const links = [
    ...edges.map((e) => ({ ...e, circle: false })),
    ...(mode === "circles"
      ? members
          .filter(
            (m) => circles.some((c) => c.id === m.circleId) && nodes.some((n) => n.id === m.userId),
          )
          .map((m) => ({ a: m.userId, b: `circle-${m.circleId}`, level: 1, days: 0, circle: true }))
      : []),
  ];
  const active = nodes.find((n) => n.id === selected) || nodes[0];
  return (
    <section className="rounded-xl border border-[#c8c0b1] bg-[#fbf8f1] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl">Mapa das conexões</h2>
          <p className="mt-2 text-sm text-[#667064]">
            Selecione uma pessoa ou círculo para abrir suas ações.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ["people", "Pessoas"],
            ["circles", "Pessoas e círculos"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-11 rounded-lg border px-3 text-sm ${mode === value ? "bg-[#244e35] text-white" : "border-[#c8c0b1]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {people.length || circles.length ? (
        <>
          <label className="mt-5 block text-sm sm:hidden">
            Selecionar pessoa ou círculo
            <select
              value={active.id}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[#c8c0b1] bg-white p-3"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>
          <div className="my-4 overflow-x-auto">
            <svg
              viewBox="0 0 800 520"
              className="w-full min-w-[640px] sm:min-w-0"
              aria-label="Sua rede de pessoas e círculos"
              role="group"
            >
              {links.map((e, i) => {
                const a = positions.find((n) => n.id === e.a),
                  b = positions.find((n) => n.id === e.b);
                return a && b ? (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={e.circle ? "#bd7428" : "#244e35"}
                    strokeWidth={e.circle ? 2 : e.level * 2}
                    strokeOpacity=".5"
                    strokeDasharray={e.circle ? "6 5" : undefined}
                  >
                    <title>
                      {e.circle
                        ? "Participa do círculo"
                        : `Conexão nível ${e.level}: ${e.days} dias de interações atendidas`}
                    </title>
                  </line>
                ) : null;
              })}
              {positions.map((n) => (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Selecionar ${n.label}`}
                  onClick={() => setSelected(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(n.id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={selected === n.id ? 31 : 27}
                    fill={n.kind === "circle" ? "#f0c64b" : "#244e35"}
                    stroke={selected === n.id ? "#bd7428" : "#f5f1e8"}
                    strokeWidth="4"
                  />
                  <text
                    x={n.x}
                    y={n.y + 6}
                    textAnchor="middle"
                    fill={n.kind === "circle" ? "#14261b" : "white"}
                    fontSize="18"
                  >
                    {n.kind === "circle" ? n.avatar : n.label.slice(0, 2).toUpperCase()}
                  </text>
                  <text x={n.x} y={n.y + 49} textAnchor="middle" fill="#244e35" fontSize="16">
                    {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#e7eadf] p-4"
          >
            <strong>{active.label}</strong>
            <a
              href={active.href}
              className="inline-flex min-h-11 items-center rounded-lg border border-[#244e35] px-4 text-sm font-semibold"
            >
              {active.kind === "circle" ? "Ver círculo" : "Ver perfil"} →
            </a>
          </div>
        </>
      ) : (
        <p className="py-10 text-sm">
          Seu mapa começa com uma cutucada retribuída. Visite alguém no Mural para se aproximar.
        </p>
      )}
      <details className="mt-4 text-sm text-[#667064]">
        <summary className="py-3">Como o vínculo cresce?</summary>
        <p className="mt-2 leading-6">
          Nível 1: contato estabelecido. Nível 2: interações atendidas em pelo menos 2 dias
          diferentes. Nível 3: em pelo menos 5 dias. A espessura da linha indica o nível; linhas
          tracejadas indicam participação em círculos. Cutucadas repetidas e pedidos ainda abertos
          não aumentam o nível.
        </p>
        <ul className="mt-3 space-y-2">
          {edges
            .filter((e) => e.a === self.id || e.b === self.id)
            .map((e) => {
              const p = people.find((p) => p.id === (e.a === self.id ? e.b : e.a));
              return p ? (
                <li key={p.id}>
                  <a className="underline" href={`/u/${p.username}`}>
                    {p.displayName}
                  </a>{" "}
                  · nível {e.level}/3 · {e.days} dias
                </li>
              ) : null;
            })}
        </ul>
      </details>
    </section>
  );
}
