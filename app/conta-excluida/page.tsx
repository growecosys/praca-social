export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f1e8] px-5 text-[#1f241d]">
      <section className="max-w-lg border-y border-[#bdb5a7] py-10">
        <h1 className="font-serif text-4xl">Conta excluída</h1>
        <p className="mt-5 leading-7">
          Seu acesso foi encerrado e seu perfil foi removido. As publicações e os registros
          comunitários permanecem com autoria “Conta excluída”.
        </p>
        <a
          href="/mural"
          className="mt-7 inline-flex min-h-11 items-center bg-[#244e35] px-5 py-3 font-semibold text-white"
        >
          Ver o Mural
        </a>
      </section>
    </main>
  );
}
