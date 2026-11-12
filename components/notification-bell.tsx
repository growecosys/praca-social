"use client";
import { Bell, CheckCheck, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
type Item = {
  id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};
export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false),
    [unread, setUnread] = useState(0),
    [items, setItems] = useState<Item[]>([]),
    [sound, setSound] = useState(false),
    [audioStatus, setAudioStatus] = useState(""),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const receive = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setUnread(d.unread || 0);
      setItems(d.items || []);
      setSound(d.soundEnabled === true);
    };
    window.addEventListener("praca-notifications", receive);
    window.dispatchEvent(new Event("praca-notification-refresh"));
    return () => window.removeEventListener("praca-notifications", receive);
  }, []);
  useEffect(() => {
    const receive = (e: Event) =>
      setAudioStatus(
        (e as CustomEvent).detail?.ok
          ? "Som funcionando."
          : "O navegador bloqueou o áudio. Toque em Testar som para tentar novamente.",
      );
    window.addEventListener("praca-notification-audio-status", receive);
    return () => window.removeEventListener("praca-notification-audio-status", receive);
  }, []);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);
  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  async function mark(id?: number) {
    const r = await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(id ? { id } : { action: "read_all" }),
    });
    if (!r.ok) throw Error();
  }
  async function readAll() {
    setError("");
    try {
      await mark();
      setUnread(0);
      setItems((current) => current.map((i) => ({ ...i, read: true })));
      window.dispatchEvent(new Event("praca-notification-refresh"));
    } catch {
      setError("Não foi possível marcar como lidas. Tente novamente.");
    }
  }
  function toggleSound() {
    const enabled = !sound;
    setSound(enabled);
    window.dispatchEvent(new CustomEvent("praca-notification-sound", { detail: { enabled } }));
  }
  function date(value: string) {
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    return Number.isNaN(d.getTime())
      ? ""
      : new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        }).format(d);
  }
  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <dialog
            ref={dialog}
            onClose={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                const r = e.currentTarget.getBoundingClientRect();
                if (
                  e.clientX < r.left ||
                  e.clientX > r.right ||
                  e.clientY < r.top ||
                  e.clientY > r.bottom
                )
                  close();
              }
            }}
            aria-labelledby="notification-heading"
            className="notification-dialog max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain border-2 border-[#244e35] bg-[#f5f1e8] p-0 text-[#1f241d] shadow-[8px_8px_0_#f0c64b] backdrop:bg-black/25"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-[#f5f1e8] p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#667064]">
                  notificações
                </p>
                <h2 id="notification-heading" className="mt-1 font-serif text-2xl">
                  A Praça chamou
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                autoFocus
                aria-label="Fechar notificações"
                className="grid size-11 place-items-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="border-b px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-pressed={sound}
                  className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold"
                >
                  {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}Som{" "}
                  {sound ? "ligado" : "desligado"}
                </button>
                {sound && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("praca-notification-test"))}
                    className="min-h-11 px-2 text-sm underline underline-offset-4"
                  >
                    Testar som
                  </button>
                )}
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={readAll}
                    className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold underline"
                  >
                    <CheckCheck size={17} />
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              {audioStatus && (
                <p role="status" className="mt-2 text-xs text-[#555e53]">
                  {audioStatus}
                </p>
              )}
              {error && (
                <p role="alert" className="mt-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              <p className="mt-2 text-xs leading-5 text-[#555e53]">
                Com a Praça aberta, os avisos aparecem no sino e no título da aba. O som depende da
                sua escolha e das permissões de áudio do navegador.
              </p>
            </div>
            <ul>
              {items.length ? (
                items.map((item) => (
                  <li key={item.id} className="border-b">
                    <a
                      href={item.href}
                      onClick={async (e) => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                        e.preventDefault();
                        if (!item.read) {
                          try {
                            await mark(item.id);
                          } catch {}
                        }
                        window.location.assign(item.href);
                      }}
                      className={`block p-4 hover:bg-[#ece7dc] ${item.read ? "" : "bg-[#fbf8f1]"}`}
                    >
                      <span className="flex items-start gap-2 text-sm font-semibold">
                        {!item.read && (
                          <span
                            className="mt-1 size-2 shrink-0 rounded-full bg-[#a52f24]"
                            aria-hidden="true"
                          />
                        )}
                        {item.title}
                        {!item.read && <span className="sr-only"> · Não lida</span>}
                      </span>
                      {item.body && (
                        <span className="mt-1 block line-clamp-2 text-sm leading-5 text-[#555e53]">
                          {item.body}
                        </span>
                      )}
                      <time className="mt-2 block text-xs text-[#555e53]">
                        {date(item.createdAt)}
                      </time>
                    </a>
                  </li>
                ))
              ) : (
                <li className="p-6 text-sm text-[#555e53]">Nenhuma notificação por aqui.</li>
              )}
            </ul>
          </dialog>,
          document.body,
        )
      : null;
  return (
    <div className="shrink-0" data-no-translate>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setOpen(true);
          window.dispatchEvent(new Event("praca-notification-refresh"));
        }}
        aria-label={unread ? `${unread} notificações não lidas` : "Notificações"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative grid size-11 place-items-center ${dark ? "text-white hover:bg-white/10" : "text-[#244e35] hover:bg-black/5"}`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-[#a52f24] px-1 text-[11px] font-bold leading-5 text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
