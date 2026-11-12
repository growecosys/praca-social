import { env } from "cloudflare:workers";
import { storyOverview } from "../../lib/story-overview";
import StoryLobbySummary from "../../components/story-lobby-summary";
import SiteHeader from "../../components/site-header";
import { getPracaUser } from "../../lib/praca-auth";
import { ArrowRight, Trophy } from "lucide-react";
import "./historias/stories.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Histórias da Praça — Jogos",
  description:
    "Uma história por vez, com pessoas da Praça. Participe de uma campanha coletiva com seu papel e avatar.",
};
export default async function Page() {
  const u = await getPracaUser();
  const story = await storyOverview(env.DB, u?.id).catch(() => null);
  return (
    <main className="stories-page">
      <SiteHeader active="jogar" />
      <section className="stories-home" id="conteudo-principal" tabIndex={-1}>
        <header className="stories-home-top">
          <p>JOGAR NA PRAÇA</p>
          <a href={u ? "/perfil#jogos" : "/entrar"}>
            <Trophy size={15} />
            {u ? "Meu percurso nos jogos" : "Entrar na Praça"}
          </a>
        </header>
        <article className="stories-feature">
          <div className="stories-feature-copy">
            <p>RPG COLETIVO · SEU PAPEL EM JOGO</p>
            <h1>
              Histórias
              <br />
              <em>da Praça.</em>
            </h1>
            <p>
              Uma situação para resolver. Um grupo de pessoas da Praça. Seu papel, suas escolhas e
              uma história que vocês constroem juntos.
            </p>
            <a className="stories-primary" href="/jogar/historias">
              {story?.phase === "playing" && story.joined
                ? "Voltar à campanha"
                : story?.joined && story.phase === "enrollment"
                  ? "Ver minha inscrição"
                  : "Conhecer a turma"}{" "}
              <ArrowRight size={16} />
            </a>
            <small>
              3 dias de inscrições · 3 a 6 participantes
              <br />
              Até uma semana de campanha · Cada pessoa joga no seu horário
            </small>
          </div>
          <div className="stories-feature-art" aria-hidden="true">
            <svg viewBox="0 0 520 470">
              <circle cx="280" cy="210" r="160" fill="#c7d0ac" />
              <path d="M0 366q145-48 270-7t250-6v117H0" fill="#b4bf99" />
              <path d="M0 409q170-45 300-12t220-2v75H0" fill="#9eae87" />
              <path d="M170 210h230v125H170z" fill="#f0dfaa" />
              <path d="m156 214 128-69 130 69" fill="#647d57" />
              <path
                d="M185 214v122m65-122v122m70-122v122m65-122v122"
                stroke="#f6ecd2"
                strokeWidth="7"
              />
              <path d="M157 339h258l16 14H142z" fill="#7a8b65" />
              <path d="M72 308h75v65H72z" fill="#c28c5b" />
              <path d="m60 308 14-35h72l15 35" fill="#e6bc66" />
              <path d="M63 310h94m-90-11h83" stroke="#a76d44" strokeWidth="3" />
              <g fill="#3e614b">
                <circle cx="227" cy="359" r="12" />
                <path d="M212 380q15-15 30 0v42h-30z" />
              </g>
              <g fill="#b6784b">
                <circle cx="285" cy="380" r="12" />
                <path d="M270 401q15-15 30 0v42h-30z" />
              </g>
              <g fill="#7d8957">
                <circle cx="345" cy="355" r="12" />
                <path d="M330 376q15-15 30 0v42h-30z" />
              </g>
              <path
                d="M104 180v71M74 220q30-65 62 0"
                fill="#83976a"
                stroke="#83976a"
                strokeWidth="7"
              />
              <circle cx="413" cy="88" r="31" fill="#f3d58d" />
              <path
                d="M205 90q20-30 40 0m-110 20q12-19 24 0"
                fill="none"
                stroke="#687f55"
                strokeWidth="3"
              />
              <path
                d="M276 361q10-24 27-16m-55 47q16 13 32 1"
                fill="none"
                stroke="#788865"
                strokeDasharray="3 5"
              />
            </svg>
          </div>
        </article>
        {story ? (
          <StoryLobbySummary story={story} canInvite={Boolean(u?.profileComplete)} />
        ) : (
          <div className="stories-home-next">
            <a href="/jogar/historias">Consultar a turma →</a>
          </div>
        )}
        <details className="stories-minis">
          <summary>Explorar minigames · para uma partida por conta própria</summary>
          <div className="stories-minis-list">
            <article>
              <h2>Correio Aéreo</h2>
              <p>
                Pilote, enfrente o vento e entregue cartas. Partidas rápidas com recordes e
                conquistas no perfil.
              </p>
              <a href="/jogar/correio-aereo">Ir para o voo →</a>
            </article>
            <article>
              <h2>Baldio · Depois das Horas</h2>
              <p>
                Explore caminhos, resolva mecanismos e teste suas invenções. Seu progresso continua
                salvo.
              </p>
              <a href="/jogar/baldio">Explorar o Baldio →</a>
            </article>
          </div>
          <p className="stories-legacy">
            Já começou o RPG solo anterior? <a href="/jogar/rpg">Reabrir meu caderno</a>
          </p>
        </details>
      </section>
    </main>
  );
}
