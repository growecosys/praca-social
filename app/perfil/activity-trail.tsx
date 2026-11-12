"use client";

import { ChevronDown, Filter } from "lucide-react";
import { useMemo, useState } from "react";

type Event = {
  id: number;
  action: string;
  entityType: string;
  createdAt: string;
};
const labels: Record<string, string> = {
  account_created: "Conta criada",
  signed_in: "Entrada na conta",
  profile_completed: "Perfil concluído",
  generation_credits_reset: "Créditos de geração renovados",
  weekly_leader_reward: "Prêmio semanal do placar",
  avatar_generated: "Avatar gerado",
  avatar_version_selected: "Avatar anterior selecionado",
  role_preview_generated: "Prévia de papel gerada",
  role_regenerated: "Novo papel aplicado",
  role_version_selected: "Papel anterior selecionado",
  legacy_role_reconstructed: "Papel histórico reconstruído",
  role_preview_rejected: "Prévia de papel recusada",
  post_created: "Publicação criada",
  comment_created: "Comentário publicado",
  like_added: "Curtida registrada",
  share_created: "Link de circulação criado",
  poke_sent: "Cutucada enviada",
  poke_received: "Cutucada recebida",
  assistant_used: "Assistente de escrita utilizado",
  guide_assistant_used: "Assistente da Praça consultado",
};
function group(action: string) {
  if (/avatar|role|profile|generation/.test(action)) return "identity";
  if (/post|comment|share|like|assistant/.test(action)) return "content";
  if (/poke/.test(action)) return "social";
  return "account";
}
function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value.replace(" ", "T")}Z`));
}

export default function ActivityTrail({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState("all");
  const visible = useMemo(
    () => events.filter((event) => filter === "all" || group(event.action) === filter),
    [events, filter],
  );
  return (
    <details className="mt-12 border border-[#c8c0b1] bg-[#fbf8f1]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <span>
          <span className="block font-serif text-3xl">Rastro de atividade</span>
          <span className="mt-1 block text-sm text-[#667064]">
            {events.length} eventos auditáveis · expandir ou recolher
          </span>
        </span>
        <ChevronDown className="shrink-0" />
      </summary>
      <div className="border-t p-5">
        <label className="flex max-w-xs items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#667064]">
          <Filter size={14} />
          Filtrar
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="ml-auto border border-[#b7ae9f] bg-white px-3 py-2 font-normal normal-case tracking-normal text-[#1f241d]"
          >
            <option value="all">Tudo</option>
            <option value="identity">Identidade e gerações</option>
            <option value="content">Publicações e conteúdo</option>
            <option value="social">Interações sociais</option>
            <option value="account">Conta e sistema</option>
          </select>
        </label>
        <div className="mt-4 border-t">
          {visible.length ? (
            visible.map((event) => (
              <div
                key={event.id}
                className="flex flex-col justify-between gap-1 border-b py-3 sm:flex-row sm:items-center"
              >
                <span className="text-sm">
                  {labels[event.action] || event.action.replaceAll("_", " ")}
                </span>
                <time className="text-xs text-[#667064]">{date(event.createdAt)}</time>
              </div>
            ))
          ) : (
            <p className="py-5 text-sm text-[#667064]">Nenhum evento neste filtro.</p>
          )}
        </div>
      </div>
    </details>
  );
}
