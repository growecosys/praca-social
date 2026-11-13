import PageBack from "../../components/page-back";
import SiteHeader from "../../components/site-header";
import CommonSpace from "../../components/common-space";

export const metadata = { title: "Espaço Comum — Praça" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#14261b]">
      <SiteHeader active="comum" />
      <section
        id="conteudo-principal"
        tabIndex={-1}
        className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8 sm:py-14"
      >
        <PageBack />
        <header className="mb-8 border-b border-[#c8c0b1] pb-7">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#48604c]">
            Governança da Praça
          </p>
          <h1 className="my-3 font-serif text-[clamp(3rem,9vw,6.5rem)] leading-none tracking-tight">
            Espaço Comum
          </h1>
          <p className="max-w-xl text-lg leading-7 text-[#465347]">
            Acompanhe os sinais, as votações e as decisões da comunidade.
          </p>
        </header>
        <CommonSpace />
      </section>
    </main>
  );
}
