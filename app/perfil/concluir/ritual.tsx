"use client";

import OnboardingProgress from "../../../components/onboarding-progress";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import LanguageToggle from "../../../components/language-toggle";
import { clearAutosave, useAutosave } from "../../../lib/use-autosave";

const questions = ["O que você protege?", "O que te revolta?", "Qual seu talento estranho?", "Qual seu defeito produtivo?", "Que mundo você procura?"];

function normalize(value: string) {
  return value
    .trim()
    .replace(/\s*([,;])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .replace(/[,;]\s*$/g, "");
}

function words(value: string) {
  return normalize(value)
    .split(/[\s,;]+/)
    .map((part) => part.replace(/^[.!?…:]+|[.!?…:]+$/g, ""))
    .filter(Boolean);
}

export default function Ritual({ name,emailConfirmed=false }: { name: string;emailConfirmed?:boolean }) {
  const [answers, setAnswers] = useState<string[]>(Array(5).fill(""));
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const restoreAnswers = useCallback((saved: string[]) => { if (Array.isArray(saved) && saved.length === 5) setAnswers(saved); }, []);
  useAutosave("praca_profile_ritual", answers, restoreAnswers);

  function update(index: number, value: string) {
    setAnswers((current) => current.map((answer, position) => position === index ? value : answer));
    if (error) setError("");
  }

  function format(index: number) {
    update(index, normalize(answers[index]));
  }

  async function finish() {
    const formatted = answers.map(normalize);
    setAnswers(formatted);
    setSubmitted(true);
    const invalid = formatted.findIndex((answer) => words(answer).length !== 3);
    if (invalid >= 0) {
      setError(`Revise a resposta ${invalid + 1}: ela precisa ter três palavras.`);
      inputs.current[invalid]?.focus();
      return;
    }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/profile/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: formatted }) });
      const data = await response.json() as { next?: string; error?: string };
      if (response.ok && data.next) { clearAutosave("praca_profile_ritual"); window.location.href = data.next; }
      else { setError(data.error || "Não foi possível concluir."); setBusy(false); }
    } catch { setError("Não foi possível conectar à Praça. Suas respostas continuam aqui."); setBusy(false); }
  }

  return <main className="min-h-screen bg-[#14261b] px-5 py-12 text-[#f5f1e8]">
    <section id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-4xl"><div className="mb-8 flex items-center justify-between gap-4"><a href="/mural" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">← Continuar depois</a><LanguageToggle dark /></div>
      <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#f0c64b]">sua identidade · {name}</p>
      <OnboardingProgress account email={emailConfirmed} dark/><h1 className="mt-5 font-serif text-[clamp(3.6rem,9vw,7rem)] leading-[.88] tracking-[-.055em]">Cinco perguntas.<br /><span className="text-[#f0c64b]">Três palavras.</span></h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Digite três palavras em cada resposta. Pode usar vírgulas: espaços e pontuação serão organizados automaticamente.</p>
      <div className="mt-5 border-l-2 border-[#f0c64b] pl-4 text-sm leading-6 text-white/60"><strong className="text-white/85">Exemplo:</strong> privacidade , liberdade, justiça <span className="mx-2">→</span> <span className="text-[#f0c64b]">privacidade, liberdade, justiça</span></div>

      <div className="mt-12 space-y-6">{questions.map((question, index) => {
        const count = words(answers[index]).length;
        const valid = count === 3;
        const showError = submitted && !valid;
        return <label key={question} className={`block border-b pb-6 transition-colors ${showError ? "border-[#ff9c8d]" : valid ? "border-[#f0c64b]/60" : "border-white/20"}`}>
          <span className="flex items-end justify-between gap-4"><strong className="font-serif text-2xl font-normal">{index + 1}. {question}</strong><span className={`flex items-center gap-1 text-xs ${valid ? "text-[#f0c64b]" : showError ? "text-[#ff9c8d]" : "text-white/40"}`}>{valid && <Check size={13} />}{count}/3</span></span>
          <input ref={(element) => { inputs.current[index] = element; }} value={answers[index]} onChange={(event) => update(index, event.target.value)} onBlur={() => format(index)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); format(index); inputs.current[index + 1]?.focus(); } }} aria-invalid={showError} aria-describedby={`answer-help-${index}`} placeholder="ex.: semente, cuidado, futuro" autoComplete="off" className="mt-4 w-full bg-transparent py-2 font-serif text-3xl outline-none placeholder:text-white/20" />
          <span id={`answer-help-${index}`} className={`mt-2 block text-xs ${showError ? "text-[#ff9c8d]" : "text-white/35"}`}>{showError ? count < 3 ? `Falta${3 - count > 1 ? "m" : ""} ${3 - count} palavra${3 - count > 1 ? "s" : ""}.` : `Há ${count - 3} palavra${count - 3 > 1 ? "s" : ""} a mais.` : valid ? "Pronto." : "Vírgulas e espaços extras não contam como palavras."}</span>
        </label>;
      })}</div>

      {error && <p role="alert" className="mt-6 text-[#ff9c8d]">{error}</p>}
      <button onClick={finish} disabled={busy} className="mt-10 flex items-center gap-3 bg-[#f0c64b] px-6 py-4 font-semibold text-[#14261b] shadow-[6px_6px_0_#df5c45] disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy ? "Combinando sinais…" : "Revelar minha identidade"}<ArrowRight size={18} /></button>
    </section>
  </main>;
}
