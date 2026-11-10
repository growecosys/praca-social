import StoryInvites from './story-invites';
import { pracaDeadline, type storyOverview } from '../lib/story-overview';

type Story = Awaited<ReturnType<typeof storyOverview>>;

export default function StoryLobbySummary({story, canInvite}: {story: Story; canInvite: boolean}) {
  const enrolling = story.phase === 'enrollment';
  const playing = story.phase === 'playing';
  const timing = enrolling ? 'Inscrições até' : playing ? 'Rodada até' : 'Próxima abertura a partir de';
  const status = playing
    ? (story.joined ? 'Você está jogando nesta turma.' : 'As inscrições desta turma estão encerradas.')
    : enrolling
      ? (story.joined ? 'Sua inscrição está confirmada.' : story.waiting ? `Você está em ${story.waiting}º na lista de espera.` : 'Você ainda não está inscrito.')
      : story.phase === 'unformed' ? 'Esta turma não reuniu participantes suficientes.' : 'Esta campanha terminou.';

  return <section className="grid gap-5 border-b border-[#bfc3ae] py-6 sm:grid-cols-2" aria-label="Situação da turma">
    <div>
      <p className="stories-eyebrow">{story.first ? 'I TURMA' : 'TURMA ATUAL'} · {enrolling ? 'INSCRIÇÕES ABERTAS' : playing ? `RODADA ${story.round}` : 'ENCERRADA'}</p>
      <h2 className="mt-2 font-serif text-2xl">A feira vai acontecer?</h2>
      <p className="mt-2 text-sm leading-6">As torneiras da feira estão sem água. A turma precisa descobrir o problema e decidir como manter o evento de pé.</p>
    </div>
    <div>
      <p className="text-sm font-semibold">{status}</p>
      <p className="mt-2 text-sm">{story.seats}/6 participantes · mínimo de 3</p>
      <p className="mt-1 text-sm">{timing} <time dateTime={new Date(story.deadline).toISOString()}>{pracaDeadline(story.deadline)}</time> (Brasília).</p>
      <a className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4" href="/jogar/historias">{playing && story.joined ? 'Voltar à campanha' : enrolling && !story.joined && !story.waiting ? 'Ver regras e se inscrever' : 'Ver a turma'} →</a>
      {enrolling && <StoryInvites campaign={story.id} canInvite={canInvite}/>}
    </div>
  </section>;
}
