import NatureSpot from "../components/nature-spot";
import { ArrowRight, Image, MessageSquareText, Sparkles } from "lucide-react";
import SiteHeader from "../components/site-header";
import { getPracaUser } from "../lib/praca-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getPracaUser();
  if (user?.profileComplete)
    return (
      <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
        <SiteHeader active="home" />
        <section
          id="conteudo-principal"
          tabIndex={-1}
          className="relative mx-auto grid min-h-[calc(100vh-65px)] max-w-[1400px] items-center gap-8 overflow-hidden px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.15fr_.85fr]"
        >
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-[#667064]">
              você está na praça como
            </p>
            <h1 className="mt-5 max-w-5xl font-serif text-[clamp(4.5rem,10vw,9.5rem)] leading-[.78] tracking-[-.07em]">
              {user.displayName}
            </h1>
            <p className="mt-6 font-serif text-3xl text-[#244e35]">{user.roleTitle}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/mural"
                className="flex items-center gap-3 bg-[#244e35] px-6 py-4 text-lg font-semibold text-white shadow-[7px_7px_0_#f0c64b]"
              >
                Ver o Mural <ArrowRight />
              </a>
              <a href="/perfil" className="border border-[#244e35] px-6 py-4 text-lg font-semibold">
                Meu perfil
              </a>
            </div>
          </div>
          <div aria-hidden="true" className="relative min-h-44 lg:min-h-[520px]">
            <NatureSpot
              kind="card"
              showcase
              scene="hero"
              assets={[
                "ipe-amarelo",
                "jabuticaba",
                "acervo-vitoria-regia",
                "acervo-heliconia",
                "acervo-bromelia",
              ]}
            />
          </div>
        </section>
      </main>
    );

  const next = user ? "/perfil/concluir" : "/entrar";
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
      <SiteHeader active="home" />
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="relative mx-auto grid min-h-[calc(100vh-65px)] max-w-[1400px] items-center gap-6 overflow-hidden px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.12fr_.88fr]"
      >
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-[#667064]">
            publique ideias, encontre pessoas e cuide do que é comum
          </p>
          <h1 className="mt-6 max-w-5xl font-serif text-[clamp(4.7rem,11vw,10.5rem)] leading-[.76] tracking-[-.075em]">
            Entre.
            <br />
            <span className="text-[#244e35]">A praça</span>
            <br />é nossa!
          </h1>
          <div className="mt-10 flex flex-wrap items-end gap-5">
            <div>
              <a
                href={next}
                className="flex w-fit items-center gap-3 bg-[#244e35] px-6 py-4 text-lg font-semibold text-white shadow-[7px_7px_0_#f0c64b]"
              >
                {user ? "Concluir meu perfil" : "Crie sua identidade"}
                <ArrowRight />
              </a>
            </div>
            <a
              href="/mural"
              className="px-2 py-3 text-base font-semibold underline decoration-[#8ca08f] underline-offset-8"
            >
              Explorar o Mural
            </a>
          </div>
          <ol className="mt-12 grid max-w-2xl gap-3 text-sm text-[#667064] sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <MessageSquareText size={17} className="text-[#244e35]" />
              <span>
                <strong className="text-[#1f241d]">1.</strong> Responda 5 perguntas
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles size={17} className="text-[#244e35]" />
              <span>
                <strong className="text-[#1f241d]">2.</strong> Descubra seu papel
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Image size={17} className="text-[#244e35]" />
              <span>
                <strong className="text-[#1f241d]">3.</strong> Publique e ajude a cuidar do espaço
                comum
              </span>
            </li>
          </ol>
        </div>
        <div aria-hidden="true" className="relative min-h-64 self-stretch lg:min-h-[620px]">
          <NatureSpot
            kind="card"
            showcase
            scene="hero"
            assets={[
              "ipe-amarelo",
              "jabuticaba",
              "acervo-vitoria-regia",
              "acervo-heliconia",
              "acervo-bromelia",
            ]}
          />
        </div>
      </section>
    </main>
  );
}
