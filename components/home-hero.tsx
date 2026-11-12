import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquareText, PenLine, Sparkles } from "lucide-react";
import NatureSpot from "./nature-spot";

const heroAssets = [
  "ipe-amarelo",
  "jabuticaba",
  "acervo-vitoria-regia",
  "acervo-heliconia",
  "acervo-bromelia",
];

const steps = [
  { icon: MessageSquareText, text: "Responda 5 perguntas" },
  { icon: Sparkles, text: "Descubra seu papel" },
  { icon: PenLine, text: "Publique e ajude a cuidar do espaço comum" },
];

/** Position in the entrance sequence; consumed by the `.rise` rule in globals.css. */
export const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

export function HeroSection({ children }: { children: ReactNode }) {
  return (
    <section
      id="conteudo-principal"
      tabIndex={-1}
      className="relative mx-auto grid max-w-[1180px] items-center gap-6 overflow-hidden px-4 pb-28 pt-8 sm:px-8 sm:pt-10 lg:min-h-[calc(100svh-7.25rem)] lg:grid-cols-[1.12fr_.88fr] lg:gap-10 lg:pb-14"
    >
      <div className="relative z-10">{children}</div>
      <div aria-hidden="true" className="relative min-h-72 self-stretch lg:min-h-[560px]">
        <NatureSpot kind="card" showcase scene="hero" assets={heroAssets} />
      </div>
    </section>
  );
}

export function Eyebrow({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <p
      className="rise text-xs font-semibold uppercase tracking-[.22em] text-muted-foreground"
      style={stagger(index)}
    >
      {children}
    </p>
  );
}

export function PrimaryAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-14 w-fit items-center gap-3 bg-primary px-6 text-lg font-semibold text-primary-foreground shadow-[7px_7px_0_var(--sun)] motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[4px_4px_0_var(--sun)] active:translate-x-[7px] active:translate-y-[7px] active:shadow-none"
    >
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

export function SecondaryAction({
  href,
  children,
  outlined = false,
}: {
  href: string;
  children: ReactNode;
  outlined?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        outlined
          ? "inline-flex min-h-14 items-center border border-primary px-6 text-lg font-semibold text-foreground motion-safe:transition-colors hover:bg-primary hover:text-primary-foreground"
          : "inline-flex min-h-11 items-center text-base font-semibold text-foreground underline decoration-primary/40 underline-offset-8 motion-safe:transition-colors hover:decoration-primary"
      }
    >
      {children}
    </Link>
  );
}

export function Steps({ index }: { index: number }) {
  return (
    <ol className="rise mt-6 max-w-md border-t border-border" style={stagger(index)}>
      {steps.map(({ icon: Icon, text }, position) => (
        <li
          key={text}
          className="flex items-start gap-3 border-b border-border py-2 text-sm leading-6 text-muted-foreground"
        >
          <Icon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <strong className="font-semibold text-foreground">{position + 1}.</strong> {text}
          </span>
        </li>
      ))}
    </ol>
  );
}
