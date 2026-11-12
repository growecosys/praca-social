import { z } from "zod";

export const proposalKinds = ["structural", "governance", "configuration"] as const;

export const proposalLabels = {
  structural: "Mudança estrutural",
  governance: "Regras de governança",
  configuration: "Configuração coletiva",
} satisfies Record<(typeof proposalKinds)[number], string>;

export const proposalFields = {
  title: { label: "Título da votação", min: 5, max: 100 },
  scope: { label: "Parte da Praça afetada", min: 3, max: 120 },
  change: { label: "O que a comunidade decidiria?", min: 15, max: 2000 },
  impact: {
    label: "Qual é o benefício coletivo e o que precisa ser avaliado?",
    min: 10,
    max: 1600,
  },
} as const;

function proposalText(field: keyof typeof proposalFields) {
  const { label, min, max } = proposalFields[field];
  return z
    .string()
    .trim()
    .min(min, `${label} precisa ter pelo menos ${min} caracteres.`)
    .max(max, `${label} aceita até ${max} caracteres.`);
}

export const governanceSubmission = z.object({
  id: z.string().uuid(),
  kind: z.enum(proposalKinds),
  title: proposalText("title"),
  scope: proposalText("scope"),
  change: proposalText("change"),
  impact: proposalText("impact"),
  rules: z.string().trim().max(600).optional(),
});

export type GovernanceProposal = Omit<z.infer<typeof governanceSubmission>, "rules"> & {
  rules: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

export const governanceCancellation = z.object({ id: z.string().uuid() });
