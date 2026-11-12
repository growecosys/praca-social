"use client";
import { useEffect, useRef, useState } from "react";
import { notificationTitle, unreadCount, brandIcon } from "../lib/browser-identity";
type Item = {
  id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};
type Payload = { unread: number; items: Item[] };
export default function NotificationRuntime({ userId }: { userId?: string | null }) {
  const [unread, setUnread] = useState(0),
    audio = useRef<AudioContext | null>(null),
    soundEnabled = useRef(false);
  useEffect(() => {
    if (!userId) return;
    let active = true,
      initialized = false,
      newest: number | null = null,
      previousUnread = 0,
      count = 0,
      inFlight = false,
      unauthorized = false;
    const read = (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      write = (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {}
      };
    soundEnabled.current = read("praca_notification_sound") === "on";
    const originalIcons = new Map<HTMLLinkElement, { href: string; type: string; sizes: string }>();
    function indicators() {
      for (const link of originalIcons.keys()) if (!link.isConnected) originalIcons.delete(link);
      const next = notificationTitle(document.title, count);
      if (document.title !== next) document.title = next;
      const href = "data:image/svg+xml," + encodeURIComponent(brandIcon(count));
      for (const link of document.head.querySelectorAll<HTMLLinkElement>(
        'link[rel="icon"],link[rel="shortcut icon"]',
      )) {
        if (count) {
          if (!originalIcons.has(link))
            originalIcons.set(link, {
              href: link.getAttribute("href") || "/favicon.svg",
              type: link.getAttribute("type") || "",
              sizes: link.getAttribute("sizes") || "",
            });
          if (link.getAttribute("href") !== href) {
            link.href = href;
            link.type = "image/svg+xml";
            link.setAttribute("sizes", "any");
          }
        } else if (originalIcons.has(link)) {
          const base = originalIcons.get(link)!;
          link.setAttribute("href", base.href);
          if (base.type) link.type = base.type;
          else link.removeAttribute("type");
          if (base.sizes) link.setAttribute("sizes", base.sizes);
          else link.removeAttribute("sizes");
          originalIcons.delete(link);
        }
      }
    }
    function badge() {
      const nav = navigator as Navigator & {
        setAppBadge?: (value: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      try {
        const result = count ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
        result?.catch(() => {});
      } catch {}
    }
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (r) =>
            r.target.nodeName === "TITLE" ||
            r.target.parentNode?.nodeName === "TITLE" ||
            Array.from(r.addedNodes).some(
              (n) =>
                n instanceof Element &&
                n.matches('title,link[rel="icon"],link[rel="shortcut icon"]'),
            ) ||
            r.target instanceof HTMLLinkElement,
        )
      )
        indicators();
    });
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    async function unlock(force = false) {
      if (!force && !soundEnabled.current) return;
      try {
        audio.current ||= new AudioContext();
        await audio.current.resume();
      } catch {}
    }
    async function chime(force = false) {
      if (!force && !soundEnabled.current) return;
      try {
        await unlock(force);
        const context = audio.current;
        if (!context || context.state !== "running") throw Error();
        const gain = context.createGain(),
          oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(660, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(990, context.currentTime + 0.16);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.3);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        window.dispatchEvent(
          new CustomEvent("praca-notification-audio-status", { detail: { ok: true } }),
        );
      } catch {
        window.dispatchEvent(
          new CustomEvent("praca-notification-audio-status", { detail: { ok: false } }),
        );
      }
    }
    function dispatch(data: Payload) {
      window.dispatchEvent(
        new CustomEvent("praca-notifications", {
          detail: { ...data, soundEnabled: soundEnabled.current },
        }),
      );
    }
    async function poll() {
      if (!active || inFlight || unauthorized || !navigator.onLine) return;
      inFlight = true;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401 || response.status === 403) {
          unauthorized = true;
          count = 0;
          setUnread(0);
          indicators();
          badge();
          dispatch({ unread: 0, items: [] });
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as Payload;
        if (!active) return;
        data.unread = unreadCount(data.unread);
        data.items = Array.isArray(data.items) ? data.items : [];
        const latest = data.items[0]?.id || null;
        if (
          initialized &&
          latest &&
          latest !== newest &&
          data.unread > previousUnread &&
          read("praca_last_chime_" + userId) !== String(latest)
        ) {
          write("praca_last_chime_" + userId, String(latest));
          void chime();
        }
        initialized = true;
        newest = latest;
        previousUnread = data.unread;
        count = data.unread;
        setUnread(count);
        indicators();
        badge();
        dispatch(data);
      } catch {
      } finally {
        inFlight = false;
      }
    }
    function refresh() {
      void poll();
    }
    function gesture() {
      void unlock();
    }
    function setSound(event: Event) {
      soundEnabled.current = Boolean((event as CustomEvent).detail?.enabled);
      write("praca_notification_sound", soundEnabled.current ? "on" : "off");
      if (soundEnabled.current) void chime(true);
      refresh();
    }
    function testSound() {
      void chime(true);
    }
    function visible() {
      if (document.visibilityState === "visible") refresh();
    }
    function storage(e: StorageEvent) {
      if (e.key === "praca_notification_sound") {
        soundEnabled.current = e.newValue === "on";
        refresh();
      }
    }
    document.addEventListener("pointerdown", gesture);
    document.addEventListener("keydown", gesture);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", refresh);
    window.addEventListener("storage", storage);
    window.addEventListener("praca-notification-refresh", refresh);
    window.addEventListener("praca-notification-sound", setSound);
    window.addEventListener("praca-notification-test", testSound);
    refresh();
    const timer = setInterval(refresh, 20000);
    return () => {
      active = false;
      clearInterval(timer);
      observer.disconnect();
      count = 0;
      indicators();
      document.removeEventListener("pointerdown", gesture);
      document.removeEventListener("keydown", gesture);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", refresh);
      window.removeEventListener("storage", storage);
      window.removeEventListener("praca-notification-refresh", refresh);
      window.removeEventListener("praca-notification-sound", setSound);
      window.removeEventListener("praca-notification-test", testSound);
      void audio.current?.close();
      audio.current = null;
    };
  }, [userId]);
  return userId ? (
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {unread ? `${unread} notificações não lidas.` : "Nenhuma notificação não lida."}
    </span>
  ) : null;
}
