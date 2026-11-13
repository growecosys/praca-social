import SiteHeader from "../../../components/site-header";
import { getPracaUser } from "../../../lib/praca-auth";
import StoriesClient from "./stories-client";
import "./stories.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Histórias da Praça",
  description: "Uma história por vez. Seu papel, outras pessoas e decisões que mudam o caminho.",
};
export default async function Page() {
  const user = await getPracaUser();
  return (
    <main className="stories-page">
      <SiteHeader active="jogar" />
      <div className="stories-shell" id="conteudo-principal" tabIndex={-1}>
        <a href="/jogar" className="stories-back">
          ← Jogos da Praça
        </a>
        <header className="stories-title">
          <p>UMA HISTÓRIA POR VEZ</p>
          <h1>
            Histórias
            <br />
            <em>da Praça.</em>
          </h1>
          <div>
            Seu papel encontra outros papéis.
            <br />
            Vocês decidem o que acontece depois.
          </div>
        </header>
        <StoriesClient userId={user?.id || null} />
      </div>
    </main>
  );
}
