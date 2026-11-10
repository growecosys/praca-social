import { z } from 'zod';
import { governanceSubmission } from './common-governance';

export const signalPages: Record<string, string> = {
  '/': 'Início', '/mural': 'Mural', '/circulos': 'Círculos', '/jogar': 'Jogar',
  '/jogar/historias': 'Histórias da Praça', '/espaco-comum': 'Espaço Comum',
  '/conexoes': 'Conexões', '/perfil': 'Perfil',
};

export function signalPage(path: string) {
  if (Object.hasOwn(signalPages, path)) return signalPages[path];
  const section = '/' + path.split('/')[1];
  return Object.hasOwn(signalPages, section) ? signalPages[section] : 'Outra página';
}

export const signalSubmission = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(5).max(1200),
  page: z.enum(['Outra página', ...Object.values(signalPages)]),
  hideName: z.boolean(),
});

export const votingDraft = governanceSubmission.pick({ kind: true, title: true, scope: true, change: true, impact: true }).strict();
export const signalAnalysis = z.object({
  disposition: z.enum(['investigate', 'clarify', 'voting', 'recorded']),
  summary: z.string().trim().min(5).max(450),
  reason: z.string().trim().min(5).max(500),
  relatedId: z.string().uuid().nullable(),
  draft: votingDraft.nullable(),
}).strict();

export type VotingDraft = z.infer<typeof votingDraft>;
export type SignalAnalysis = z.infer<typeof signalAnalysis>;
export type PublicSignal = {
  id: string;
  body: string;
  page: string;
  createdAt: number;
  authorName: string | null;
  analysis: SignalAnalysis | null;
  status: 'pending' | 'failed' | 'reviewed';
  canRetry: boolean;
};

export const signalHref = (id?: string) => '/espaco-comum?aba=sinais' + (id ? '&sinal=' + encodeURIComponent(id) : '');
