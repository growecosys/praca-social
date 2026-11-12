"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, LoaderCircle, RefreshCw, ArrowDown } from "lucide-react";
import { LinkifiedText } from "../lib/content";
import { clearAutosave, useAutosave } from "../lib/use-autosave";
type Message = {
  id: number;
  body: string;
  createdAt: string;
  mine: boolean;
  author: { id: string; name: string; username: string | null; avatar: string | null };
};
function merge(old: Message[], incoming: Message[]) {
  const byId = new Map(old.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
function date(value: string) {
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(d);
}
export default function CircleChat({
  circleId,
  userId,
  initiallyReadOnly = false,
  initiallyEnabled = false,
}: {
  circleId: number;
  userId: string;
  initiallyReadOnly?: boolean;
  initiallyEnabled?: boolean;
}) {
  const linkedMessage = useRef<string | null>(null);
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(""),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [olderBusy, setOlderBusy] = useState(false),
    [hasEarlier, setHasEarlier] = useState(false),
    [readOnly, setReadOnly] = useState(initiallyReadOnly),
    [lostAccess, setLostAccess] = useState(false),
    [error, setError] = useState(""),
    [sendError, setSendError] = useState(""),
    [newCount, setNewCount] = useState(0);
  const panel = useRef<HTMLElement>(null),
    scroll = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    latest = useRef(0),
    follow = useRef(true),
    visible = useRef(false),
    wake = useRef<() => void>(() => {}),
    alive = useRef(true),
    acknowledged = useRef(0),
    sendLock = useRef(false),
    revoked = useRef(false);
  const draftKey = `praca_circle_chat_draft_${userId}_${circleId}`;
  const restore = useCallback((saved: { body?: string; clientId?: string }) => {
    if (typeof saved?.body === "string") setDraft(saved.body.slice(0, 2000));
    if (typeof saved?.clientId === "string" && /^[a-f0-9-]{36}$/i.test(saved.clientId))
      setRequestId(saved.clientId as `${string}-${string}-${string}-${string}-${string}`);
  }, []);
  useAutosave(draftKey, { body: draft, clientId: requestId }, restore, 500);
  function atBottom() {
    const el = scroll.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }
  async function acknowledge() {
    const id = latest.current;
    if (
      !visible.current ||
      document.visibilityState !== "visible" ||
      !atBottom() ||
      id <= acknowledged.current
    )
      return;
    try {
      const r = await fetch(`/api/circles/${circleId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "read", lastSeen: id }),
      });
      if (r.ok) {
        acknowledged.current = id;
        window.dispatchEvent(new Event("praca-notification-refresh"));
      }
    } catch {}
  }
  function revoke() {
    revoked.current = true;
    latest.current = 0;
    setMessages([]);
    setLostAccess(true);
    setLoading(false);
    setError("Seu acesso à conversa mudou. Só membros ativos podem participar.");
  }
  useEffect(() => {
    alive.current = true;
    let stopped = false,
      running = false,
      timer: number | undefined,
      controller: AbortController | undefined;
    async function poll() {
      if (stopped || revoked.current) return;
      if (running) return;
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(poll, 6000);
        return;
      }
      running = true;
      controller = new AbortController();
      let delay = 6000;
      try {
        const after = latest.current;
        const r = await fetch(`/api/circles/${circleId}/chat${after ? "?after=" + after : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if ([401, 403, 404].includes(r.status)) {
          stopped = true;
          revoke();
          return;
        }
        if (!r.ok) throw Error();
        const data = await r.json();
        if (stopped || revoked.current) return;
        follow.current = atBottom() || after === 0;
        const incoming: Message[] = data.messages || [];
        if (incoming.length) {
          latest.current = Math.max(latest.current, ...incoming.map((m) => m.id));
          setMessages((old) => merge(old, incoming));
          if (!follow.current)
            setNewCount((n) => n + incoming.filter((m) => m.id > after && !m.mine).length);
        }
        if (!after) setHasEarlier(Boolean(data.hasEarlier));
        setReadOnly(Boolean(data.readOnly));
        setEnabled(Boolean(data.chatEnabled));
        setError("");
        setLoading(false);
        if (data.hasMore) delay = 20;
      } catch (e) {
        if (!stopped && (e as Error).name !== "AbortError") {
          setError("A atualização da conversa falhou. Seu texto foi mantido.");
          setLoading(false);
          delay = 12000;
        }
      } finally {
        running = false;
        if (!stopped) timer = window.setTimeout(poll, delay);
      }
    }
    wake.current = () => {
      if (timer) window.clearTimeout(timer);
      void poll();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") wake.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    void poll();
    const observer = new IntersectionObserver(
      (entries) => {
        visible.current = Boolean(entries[0]?.isIntersecting);
        if (visible.current) void acknowledge();
      },
      { threshold: 0.15 },
    );
    if (panel.current) observer.observe(panel.current);
    return () => {
      stopped = true;
      alive.current = false;
      controller?.abort();
      if (timer) clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [circleId, userId]);
  useEffect(() => {
    const hash = window.location.hash;
    if (!/^#chat-message-\d+$/.test(hash) || linkedMessage.current === hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ block: "center" });
      follow.current = atBottom();
      linkedMessage.current = hash;
    }
  }, [messages]);
  useEffect(() => {
    requestAnimationFrame(() => {
      if (follow.current && scroll.current) {
        scroll.current.scrollTop = scroll.current.scrollHeight;
        setNewCount(0);
      }
      void acknowledge();
    });
  }, [messages]);
  async function older() {
    if (olderBusy || !messages.length) return;
    setOlderBusy(true);
    setError("");
    const el = scroll.current,
      height = el?.scrollHeight || 0,
      top = el?.scrollTop || 0;
    try {
      const r = await fetch(`/api/circles/${circleId}/chat?before=${messages[0].id}`, {
        cache: "no-store",
      });
      if ([401, 403, 404].includes(r.status)) {
        revoke();
        return;
      }
      if (!r.ok) throw Error();
      const d = await r.json();
      if (revoked.current) return;
      follow.current = false;
      setMessages((old) => merge(old, d.messages || []));
      setHasEarlier(Boolean(d.hasEarlier));
      requestAnimationFrame(() => {
        if (el) el.scrollTop = top + el.scrollHeight - height;
      });
    } catch {
      setError("Não foi possível carregar mensagens anteriores. Tente novamente.");
    } finally {
      if (alive.current) setOlderBusy(false);
    }
  }
  async function send() {
    if (sendLock.current || readOnly || lostAccess || !draft.trim() || loading) return;
    sendLock.current = true;
    setSending(true);
    setSendError("");
    const body = draft.trim(),
      clientId = requestId;
    try {
      const r = await fetch(`/api/circles/${circleId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, clientId }),
      });
      const d = await r
        .json()
        .catch(() => ({ error: "Não foi possível enviar. Seu texto continua aqui." }));
      if ([401, 403].includes(r.status)) {
        revoke();
        return;
      }
      if (!r.ok) throw Error(d.error || "Não foi possível enviar.");
      if (!alive.current || revoked.current) return;
      follow.current = true;
      setMessages((old) => merge(old, [d.message]));
      setDraft("");
      setRequestId(crypto.randomUUID());
      clearAutosave(draftKey);
      input.current?.focus();
      wake.current();
    } catch (e) {
      if (alive.current)
        setSendError(
          e instanceof Error ? e.message : "Não foi possível enviar. Seu texto continua aqui.",
        );
    } finally {
      sendLock.current = false;
      if (alive.current) setSending(false);
    }
  }
  return (
    <section
      id="conversa"
      ref={panel}
      data-no-translate
      className="overflow-hidden rounded-sm border border-[#bdb5a7] bg-[#fbf8f1]"
      aria-labelledby={`circle-chat-title-${circleId}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8d0c1] p-4 sm:p-5">
        <div>
          <h2
            id={`circle-chat-title-${circleId}`}
            className="flex items-center gap-2 font-serif text-3xl"
          >
            <MessageCircle size={23} />
            Conversa do círculo
          </h2>
          <p className="mt-2 text-sm text-[#555e53]">
            Mensagens visíveis somente aos membros ativos. Atualização automática.
          </p>
        </div>
        <button
          type="button"
          onClick={() => wake.current()}
          disabled={lostAccess}
          className="inline-flex min-h-11 items-center gap-2 px-3 text-sm underline"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>
      {!lostAccess && (
        <div
          ref={scroll}
          onScroll={() => {
            if (atBottom()) {
              setNewCount(0);
              void acknowledge();
            }
          }}
          className="h-[min(26rem,55dvh)] min-h-56 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5"
          aria-busy={loading}
        >
          {hasEarlier && (
            <button
              type="button"
              onClick={older}
              disabled={olderBusy}
              className="mx-auto block min-h-11 border border-[#bdb5a7] px-4 text-sm"
            >
              {olderBusy ? "Carregando…" : "Ver mensagens anteriores"}
            </button>
          )}
          {loading ? (
            <p role="status" className="flex items-center gap-2 text-sm">
              <LoaderCircle size={17} className="animate-spin" />
              Carregando a conversa…
            </p>
          ) : !messages.length ? (
            <p className="py-8 text-sm leading-6 text-[#555e53]">
              A conversa ainda não começou. Use este espaço para combinar próximos passos e trocar
              ideias com o círculo.
            </p>
          ) : (
            <ol className="space-y-4" aria-label="Mensagens do círculo">
              {messages.map((m) => (
                <li
                  key={m.id}
                  id={`chat-message-${m.id}`}
                  className={`flex gap-3 ${m.mine ? "justify-end" : ""}`}
                >
                  <div
                    className={`max-w-[92%] min-w-0 border px-4 py-3 sm:max-w-[85%] ${m.mine ? "border-[#c3d1c5] bg-[#e7eee5]" : "border-[#d8d0c1] bg-[#f5f1e8]"}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#555e53]">
                      {m.author.username ? (
                        <a
                          href={"/u/" + m.author.username}
                          className="font-semibold text-[#244e35] underline underline-offset-4"
                        >
                          {m.author.name}
                          {m.mine ? " · você" : ""}
                        </a>
                      ) : (
                        <strong>{m.author.name}</strong>
                      )}
                      <time dateTime={m.createdAt.replace(" ", "T") + "Z"}>
                        {date(m.createdAt)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-base leading-7 [overflow-wrap:anywhere]">
                      <LinkifiedText text={m.body} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {newCount > 0 && (
        <button
          type="button"
          onClick={() => {
            if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
            setNewCount(0);
            void acknowledge();
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 border-t bg-[#f0c64b] px-4 text-sm font-semibold"
        >
          <ArrowDown size={16} />
          {newCount} nova{newCount === 1 ? " mensagem" : "s mensagens"}
        </button>
      )}
      <p className="sr-only" role="status">
        {newCount ? `${newCount} novas mensagens na conversa.` : ""}
      </p>
      {error && (
        <p role="alert" className="border-t border-[#d8d0c1] p-4 text-sm text-[#8a3329]">
          {error}{" "}
          {!lostAccess && (
            <button
              type="button"
              onClick={() => wake.current()}
              className="ml-2 min-h-11 underline"
            >
              Tentar novamente
            </button>
          )}
        </p>
      )}
      {lostAccess ? (
        <p className="border-t p-4 text-sm">
          <a href="/conexoes" className="underline">
            Voltar às Conexões
          </a>
        </p>
      ) : readOnly ? (
        <p className="border-t p-4 text-sm text-[#555e53]">
          {enabled
            ? "Este círculo está arquivado. O histórico continua disponível para leitura."
            : "A conversa está fechada. O responsável pode abri-la nesta aba; o histórico permanece disponível."}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="border-t border-[#d8d0c1] p-4 sm:p-5"
        >
          <label htmlFor={`chat-draft-${circleId}`} className="block text-sm font-semibold">
            Sua mensagem
          </label>
          <textarea
            ref={input}
            id={`chat-draft-${circleId}`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setRequestId(crypto.randomUUID());
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                !window.matchMedia("(pointer:coarse)").matches
              ) {
                e.preventDefault();
                void send();
              }
            }}
            rows={3}
            maxLength={2000}
            disabled={sending}
            placeholder="Converse com as pessoas deste círculo…"
            className="mt-2 w-full resize-y border border-[#a5ad9e] bg-[#fbf8f1] p-3 text-base leading-6"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#555e53]">
              {draft.length}/2.000 · Rascunho neste navegador
              <span className="hidden sm:inline"> · Enter envia; Shift+Enter quebra a linha</span>
            </p>
            <button
              type="submit"
              disabled={sending || loading || !draft.trim()}
              className="flex min-h-11 items-center gap-2 bg-[#244e35] px-5 font-semibold text-white disabled:opacity-50"
            >
              {sending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
              {sending ? "Enviando…" : "Enviar mensagem"}
            </button>
          </div>
          {sendError && (
            <p role="alert" className="mt-3 text-sm text-[#8a3329]">
              {sendError}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
