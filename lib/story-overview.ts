import { tickStories } from './stories-store';

export function pracaDeadline(value: number | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export async function storyOverview(db: D1Database, userId?: string) {
  const { state } = await tickStories(db);
  const first = !(await db.prepare('SELECT 1 FROM story_campaigns WHERE id<>? LIMIT 1').bind(state.id).first());
  const joined = state.members.some(m => m.id === userId && !m.left);
  const waiting = state.waiting.findIndex(m => m.id === userId) + 1;
  return {
    id: state.id, first, joined, waiting, phase: state.phase, round: state.round,
    seats: state.members.filter(m => !m.left).length,
    deadline: state.phase === 'enrollment' ? state.enrollEnd :
      state.phase === 'playing' ? state.roundEnd : (state.closed ?? Date.now()) + 3600000,
  };
}
