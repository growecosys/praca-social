"use client";

import { useEffect, useRef } from "react";

type StoredDraft<T> = { value: T; savedAt: string };

export function clearAutosave(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export function useAutosave<T>(key: string, value: T, restore: (value: T) => void, delay = 500, onSaved?: (date: Date) => void) {
  const ready = useRef(false);
  const skipFirstSave = useRef(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const serialized = JSON.stringify(value);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw) as StoredDraft<T>;
        if (stored?.value !== undefined) {
          skipFirstSave.current = true;
          restoreRef.current(stored.value);
        }
      }
    } catch {}
    ready.current = true;
  }, [key]);

  useEffect(() => {
    if (!ready.current) return;
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    const timer = window.setTimeout(() => {
      try {
        const savedAt = new Date();
        localStorage.setItem(key, JSON.stringify({ value: JSON.parse(serialized) as T, savedAt: savedAt.toISOString() } satisfies StoredDraft<T>));
        onSaved?.(savedAt);
      } catch {}
    }, delay);
    return () => window.clearTimeout(timer);
  }, [key, serialized, delay, onSaved]);
}
