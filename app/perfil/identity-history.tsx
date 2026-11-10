"use client";

import { Check, History, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

type RoleVersion = {
  id: string;
  roleTitle: string;
  manifesto: string;
  createdAt: string;
  mapping: Record<string, string>;
  explanation: string;
};
type PartialRoleRecord = { roleTitle: string; createdAt: string };
type AvatarVersion = { id: string; active: boolean; createdAt: string };

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}

export function RoleHistory({
  versions,
  partialRecords,
  currentRole,
  currentManifesto,
}: {
  versions: RoleVersion[];
  partialRecords: PartialRoleRecord[];
  currentRole: string;
  currentManifesto: string;
}) {
  const current =
    versions.find(
      (version) =>
        version.roleTitle === currentRole &&
        version.manifesto === currentManifesto,
    ) || versions[0];
  const [selectedId, setSelectedId] = useState(current?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(
    () => versions.find((version) => version.id === selectedId),
    [versions, selectedId],
  );
  const selectedPartial = useMemo(
    () =>
      partialRecords.find(
        (record) => `legacy:${record.roleTitle}` === selectedId,
      ),
    [partialRecords, selectedId],
  );
  async function apply() {
    if (
      !selected ||
      (selected.roleTitle === currentRole &&
        selected.manifesto === currentManifesto)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId: selected.id, action: "select" }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível trocar o papel.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível trocar o papel.",
      );
      setBusy(false);
    }
  }
  async function restoreLegacy() {
    if (!selectedPartial) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "restore_legacy",
          roleTitle: selectedPartial.roleTitle,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível reconstruir o papel.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível reconstruir o papel.",
      );
      setBusy(false);
    }
  }
  if (!versions.length) return null;
  const alreadyActive = Boolean(
    selected &&
    selected.roleTitle === currentRole &&
    selected.manifesto === currentManifesto,
  );
  return (
    <section className="mt-5 border-t border-[#d8d0c1] pt-4">
      <label className="block text-xs font-semibold uppercase tracking-[.14em] text-[#667064]">
        <span className="flex items-center gap-2">
          <History size={14} />
          Versões do papel
        </span>
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-2 w-full border border-[#b7ae9f] bg-[#fbf8f1] px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#244e35]"
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.roleTitle} · {date(version.createdAt)}
            </option>
          ))}
          {partialRecords.map((record) => (
            <option
              key={`legacy:${record.roleTitle}`}
              value={`legacy:${record.roleTitle}`}
            >
              {record.roleTitle} · registro recuperado
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <div className="mt-3 border bg-[#fbf8f1] p-3">
          <strong className="font-serif text-lg text-[#244e35]">
            {selected.roleTitle}
          </strong>
          <p className="mt-1 text-xs leading-5 text-[#667064]">
            {selected.manifesto}
          </p>
          {Object.keys(selected.mapping).length > 0 && (
            <details className="mt-3 border-t pt-3">
              <summary className="cursor-pointer text-xs font-semibold">
                Ver composição deste papel
              </summary>
              <dl className="mt-2 space-y-1 text-xs text-[#667064]">
                {Object.entries(selected.mapping).map(([key, value]) => (
                  <div key={key}>
                    <dt className="inline font-semibold capitalize text-[#1f241d]">
                      {key}:{" "}
                    </dt>
                    <dd className="inline">{value}</dd>
                  </div>
                ))}
              </dl>
              {selected.explanation && (
                <p className="mt-2 text-[11px] leading-5 text-[#667064]">
                  {selected.explanation}
                </p>
              )}
            </details>
          )}
        </div>
      )}
      {selectedPartial && (
        <div className="mt-3 border border-dashed border-[#b7ae9f] bg-[#fbf8f1] p-3">
          <strong className="font-serif text-lg text-[#244e35]">
            {selectedPartial.roleTitle}
          </strong>
          <p className="mt-1 text-xs leading-5 text-[#667064]">
            O título original foi recuperado. O sistema antigo não preservou
            manifesto, símbolo e cores; esses elementos serão reconstruídos a
            partir das cinco respostas e identificados na auditoria.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={selectedPartial ? restoreLegacy : apply}
        disabled={busy || alreadyActive}
        className="mt-3 flex w-full items-center justify-center gap-2 border border-[#244e35] px-3 py-2 text-xs font-semibold text-[#244e35] disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : alreadyActive ? (
          <Check size={14} />
        ) : (
          <History size={14} />
        )}
        {alreadyActive
          ? "Papel em uso"
          : selectedPartial
            ? "Reconstruir e usar este papel"
            : "Usar este papel"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-[#9b3a2f]">
          {error}
        </p>
      )}
      <p className="mt-2 text-[11px] text-[#667064]">
        Trocar de versão não utiliza créditos.
      </p>
    </section>
  );
}

export function AvatarGallery({
  userId,
  versions,
}: {
  userId: string;
  versions: AvatarVersion[];
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function apply(id: string) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId: id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível trocar o avatar.");
      window.location.reload();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível trocar o avatar.",
      );
      setBusy("");
    }
  }
  if (!versions.length) return null;
  return (
    <section className="mt-5 border-t border-[#d8d0c1] pt-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#667064]">
        <History size={14} />
        Galeria de avatares
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {versions.map((version) => (
          <button
            key={version.id}
            type="button"
            onClick={() => !version.active && apply(version.id)}
            disabled={Boolean(busy) || version.active}
            title={
              version.active
                ? "Avatar em uso"
                : `Gerado em ${date(version.createdAt)}`
            }
            className={`relative aspect-square overflow-hidden border-2 ${version.active ? "border-[#244e35] shadow-[3px_3px_0_#f0c64b]" : "border-transparent hover:border-[#244e35]"}`}
          >
            <img
              src={`/avatar/${userId}?generation=${version.id}`}
              alt="Versão anterior do avatar"
              className="size-full object-cover"
            />
            {version.active && (
              <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-[#244e35] text-white">
                <Check size={12} />
              </span>
            )}
            {busy === version.id && (
              <span className="absolute inset-0 grid place-items-center bg-[#f5f1e8]/70">
                <LoaderCircle className="animate-spin" />
              </span>
            )}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-[#9b3a2f]">
          {error}
        </p>
      )}
      <p className="mt-2 text-[11px] text-[#667064]">
        Selecione uma imagem para usá-la novamente, sem gastar créditos.
      </p>
    </section>
  );
}
