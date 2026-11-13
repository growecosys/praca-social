"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";

type GuideUser = {
  id: string;
  displayName: string;
  profileComplete: boolean;
  roleTitle: string;
  hasAvatar: boolean;
} | null;
type Action = { id: string; label: string; href: string };
type Message = { role: "user" | "assistant"; content: string; actions?: Action[] };

function greeting(user: GuideUser) {
  if (!user)
    return "Posso explicar como a Praça funciona, mostrar o Mural ou ajudar você a criar sua conta. O que quer descobrir?";
  if (!user.profileComplete)
    return `Olá, ${user.displayName}. Posso ajudar você a criar sua identidade e explicar como as cinco respostas criam seu papel.`;
  if (!user.hasAvatar)
    return `Seu papel já existe: ${user.roleTitle}. Posso explicar o avatar, os créditos ou ajudar você a encontrar o próximo passo.`;
  return `Olá, ${user.displayName}. Conheço os caminhos, regras e pequenos mistérios da Praça. O que você quer fazer?`;
}

const quickQuestions = [
  "O que faço primeiro?",
  "Como funcionam os créditos?",
  "Como convido alguém?",
];

export default function PersonalGuide({ user }: { user: GuideUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: greeting(user) },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null),
    inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  const stage = !user
    ? "visitor"
    : !user.profileComplete
      ? "profile"
      : !user.hasAvatar
        ? "avatar"
        : "resident";

  useEffect(() => {
    const key = `praca_guide_seen_v2_${user?.id || "visitor"}_${stage}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    const timer = window.setTimeout(() => setNudge(true), 1100);
    return () => window.clearTimeout(timer);
  }, [stage, user?.id]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: localStorage.getItem("praca_language") === "en" ? "en" : "pt",
          currentPath: pathname,
          messages: next.map(({ role, content: value }) => ({ role, content: value })),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        actions?: Action[];
        remaining?: number;
        error?: string;
      };
      if (!response.ok || !data.message)
        throw new Error(data.error || "O assistente não conseguiu responder.");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message!, actions: data.actions || [] },
      ]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O assistente não conseguiu responder.");
    } finally {
      setBusy(false);
    }
  }

  if (
    pathname.startsWith("/jogar") ||
    pathname.startsWith("/escrever") ||
    pathname.startsWith("/editar")
  )
    return null;

  return (
    <>
      {nudge && !open && (
        <div
          role="status"
          className="fixed bottom-[5.2rem] left-5 z-[54] max-w-[280px] border border-[#244e35] bg-[#fbf8f1] p-3 text-sm leading-5 text-[#1f241d] shadow-[4px_4px_0_#f0c64b]"
        >
          <button
            type="button"
            onClick={() => setNudge(false)}
            aria-label="Dispensar ajuda"
            className="float-right ml-2 p-1"
          >
            <X size={14} />
          </button>
          <strong className="block">Primeira vez por aqui?</strong>
          <span className="text-[#667064]">Posso mostrar os caminhos da Praça.</span>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setNudge(false);
          setOpen((value) => !value);
        }}
        aria-label="Abrir Assistente da Praça"
        aria-expanded={open}
        className="fixed bottom-5 left-5 z-[55] flex items-center gap-2 rounded-full border-2 border-[#244e35] bg-[#f0c64b] px-4 py-3 text-sm font-bold text-[#14261b] shadow-[4px_4px_0_#244e35] transition hover:-translate-y-0.5"
      >
        <Bot size={18} />
        <span className="hidden sm:inline">Assistente da Praça</span>
      </button>

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Chat com o Assistente da Praça"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
          className="fixed bottom-20 left-3 right-3 z-[54] flex max-h-[calc(100dvh-7rem)] flex-col border-2 border-[#244e35] bg-[#f5f1e8] text-[#1f241d] shadow-[8px_8px_0_#f0c64b] sm:left-5 sm:right-auto sm:h-[min(650px,calc(100dvh-7rem))] sm:w-[410px]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[#c8c0b1] bg-[#f5f1e8]/95 px-4 py-3 backdrop-blur">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Bot size={18} /> Assistente da Praça
              </div>
              <p className="mt-0.5 text-[10px] uppercase tracking-[.12em] text-[#667064]">
                IA conhecedora dos caminhos
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Fechar assistente"
              className="grid size-11 place-items-center"
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "ml-10" : "mr-7"}>
                <div
                  className={`px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[#244e35] text-white" : "border border-[#c8c0b1] bg-[#fbf8f1]"}`}
                >
                  {message.content}
                </div>
                {message.actions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <a
                        key={`${index}-${action.id}`}
                        href={action.href}
                        onClick={() => setOpen(false)}
                        className="border border-[#244e35] bg-[#f5f1e8] px-3 py-2 text-xs font-semibold text-[#244e35] hover:bg-[#244e35] hover:text-white"
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy && (
              <div className="mr-16 flex items-center gap-2 border border-[#c8c0b1] bg-[#fbf8f1] px-4 py-3 text-sm text-[#667064]">
                <LoaderCircle className="animate-spin" size={15} /> Consultando o mapa da Praça…
              </div>
            )}
            {error && (
              <p className="border border-[#df5c45] bg-[#fff4f0] p-3 text-xs leading-5 text-[#8a2e24]">
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>

          {messages.length === 1 && (
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-[#d8d0c1] px-4 py-3">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => send(question)}
                  disabled={busy}
                  className="border border-[#b7ae9f] px-3 py-2 text-left text-xs leading-4 hover:border-[#244e35]"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
            className="shrink-0 border-t border-[#c8c0b1] p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(draft);
                  }
                }}
                rows={2}
                maxLength={1_200}
                aria-label="Mensagem para o assistente da Praça"
                placeholder="Pergunte qualquer coisa sobre a Praça…"
                className="min-h-12 flex-1 resize-none border border-[#b7ae9f] bg-[#fbf8f1] px-3 py-2 text-sm leading-5 outline-none focus:border-[#244e35]"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                aria-label="Enviar pergunta"
                className="grid size-12 shrink-0 place-items-center bg-[#244e35] text-white disabled:opacity-40"
              >
                {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px] leading-4 text-[#747970]">
              <span className="flex items-center gap-1">
                <Sparkles size={11} /> IA acionada somente ao enviar
              </span>
              {remaining !== null && <span>{remaining} mensagens hoje</span>}
            </div>
          </form>
        </section>
      )}
    </>
  );
}
