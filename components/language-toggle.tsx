"use client";

import { Languages, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Language = "pt" | "en";

export default function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const [language, setLanguage] = useState<Language>("pt");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      setLanguage(localStorage.getItem("praca_language") === "en" ? "en" : "pt");
    } catch {}
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ loading: boolean; failed?: boolean }>).detail;
      setLoading(detail.loading);
      setFailed(Boolean(detail.failed));
    };
    window.addEventListener("praca-translation-state", onState);
    return () => window.removeEventListener("praca-translation-state", onState);
  }, []);

  function toggle() {
    const next: Language = language === "pt" ? "en" : "pt";
    setLanguage(next);
    setFailed(false);
    try {
      localStorage.setItem("praca_language", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("praca-language", { detail: { language: next } }));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      data-no-translate
      aria-label={
        language === "pt" ? "Translate page to English" : "Traduzir página para português"
      }
      title={failed ? "A tradução não foi concluída. Tente novamente." : undefined}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 border px-2.5 py-2 text-xs font-bold transition disabled:opacity-60 ${dark ? "border-white/25 text-white/75 hover:border-[#f0c64b] hover:text-[#f0c64b]" : "border-[#c8c0b1] text-[#667064] hover:border-[#244e35] hover:text-[#244e35]"}`}
    >
      {loading ? (
        <LoaderCircle size={14} className="animate-spin" />
      ) : (
        <Languages size={14} className="max-sm:hidden" />
      )}
      <span
        className={language === "pt" ? "underline decoration-2 underline-offset-4" : "opacity-55"}
      >
        PT
      </span>
      <span className="opacity-35">/</span>
      <span
        className={language === "en" ? "underline decoration-2 underline-offset-4" : "opacity-55"}
      >
        EN
      </span>
    </button>
  );
}
