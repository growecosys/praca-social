import { env } from 'cloudflare:workers';
import { commonCalendar } from '../lib/common-space';
import { pracaDeadline, storyOverview } from '../lib/story-overview';

export default async function MuralNotices() {
  const now = new Date();
  const [vote, story] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count, MIN(closes_at) AS deadline FROM common_proposals WHERE status = 'open' AND closes_at > ?")
      .bind(now.toISOString()).first<{count: number; deadline: string | null}>(),
    storyOverview(env.DB).catch(() => null),
  ]);
  const openVotes = vote?.count ?? 0;
  const enrolling = story?.phase === 'enrollment';

  return <aside aria-labelledby="mural-notices-title" className="mt-7 border-y border-[#bfc3ae] bg-[#eeeee0] px-5 py-5 sm:px-7">
    <h2 id="mural-notices-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52614c]">Na Praça agora</h2>
    <div className="mt-4 grid gap-5 md:grid-cols-3">
      <div>
        <h3 className="font-serif text-xl">Animais e natureza</h3>
        <p className="mt-1 text-sm leading-6">{openVotes && vote?.deadline
          ? `${openVotes} ${openVotes === 1 ? 'proposta aberta' : 'propostas abertas'}. Próximo fechamento em ${pracaDeadline(vote.deadline)} (Brasília).`
          : `Nenhuma proposta em votação agora. O ciclo fecha em ${pracaDeadline(commonCalendar(now).closesAt)} (Brasília).`}</p>
        <a className="mt-2 inline-block text-sm font-semibold underline underline-offset-4" href="/espaco-comum">Ir ao Espaço Comum →</a>
      </div>
      <div>
        <h3 className="font-serif text-xl">Créditos de papel</h3>
        <p className="mt-1 text-sm leading-6">Quem fica em primeiro no placar de pessoas da semana encerrada renova os créditos para gerar papel.</p>
        <a className="mt-2 inline-block text-sm font-semibold underline underline-offset-4" href="/placar">Ver o placar de atividades →</a>
      </div>
      <div>
        <h3 className="font-serif text-xl">Histórias da Praça{story?.first ? ' · I turma' : ''}</h3>
        <p className="mt-1 text-sm leading-6">A feira ficou sem água. Resolva o problema em grupo, com seu papel da Praça. {enrolling && story ? `Inscrições até ${pracaDeadline(story.deadline)} (Brasília).` : story?.phase === 'playing' ? 'A turma está jogando.' : 'Acompanhe a próxima abertura.'}</p>
        <a className="mt-2 inline-block text-sm font-semibold underline underline-offset-4" href="/jogar">{enrolling ? 'Conhecer a turma e participar' : 'Ver Histórias da Praça'} →</a>
      </div>
    </div>
  </aside>;
}
