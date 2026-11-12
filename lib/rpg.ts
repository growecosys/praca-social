export const SKILLS = {
  investigar: "Investigar",
  inventar: "Inventar",
  articular: "Articular",
  cuidar: "Cuidar",
  explorar: "Explorar",
} as const;
export type Skill = keyof typeof SKILLS;
export const skillKeys = Object.keys(SKILLS) as Skill[];
export type Entry = { who: "mestre" | "jogador" | "dados"; text: string };
export type Proposal = { id: string; action: string; intent: string; text: string };
export type RpgState = {
  version: 1;
  role: string;
  talent: Skill;
  skills: Record<Skill, number>;
  growth: Record<Skill, number>;
  boon: Skill | null;
  focus: boolean;
  clues: string[];
  pressure: number;
  turn: number;
  ended: boolean;
  ending: string;
  xp: number;
  pending: Proposal | null;
  journal: Entry[];
  activities: string[];
  lastRoll: null | { dice: number[]; bonus: number; total: number; outcome: string; skill: Skill };
};
export class RpgError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type Action = {
  id: string;
  label: string;
  skill: Skill;
  clue?: string;
  risk: string;
  effect: string;
  final?: boolean;
};
export const ACTIONS: Action[] = [
  {
    id: "archive",
    label: "Investigar o livro de manutenção",
    skill: "investigar",
    clue: "registro",
    risk: "O arquivista exige um favor e a preparação da feira avança.",
    effect: "Descobrir o que mudou no coreto.",
  },
  {
    id: "follow",
    label: "Seguir a sombra pelo bairro",
    skill: "explorar",
    clue: "rastro",
    risk: "O rastro desvia você e a preparação da feira avança.",
    effect: "Descobrir para onde a sombra está indo.",
  },
  {
    id: "keeper",
    label: "Ouvir a zeladora com atenção",
    skill: "cuidar",
    clue: "memoria",
    risk: "A conversa leva mais tempo e a preparação da feira avança.",
    effect: "Descobrir uma lembrança sobre o fenômeno.",
  },
  {
    id: "neighbors",
    label: "Reunir quem viu o acontecimento",
    skill: "articular",
    clue: "testemunhas",
    risk: "Duas testemunhas entram em conflito e a preparação da feira avança.",
    effect: "Encontrar uma conexão entre os relatos.",
  },
  {
    id: "device",
    label: "Construir um detector de sombras",
    skill: "inventar",
    clue: "medida",
    risk: "O protótipo precisa de reparos e a preparação da feira avança.",
    effect: "Medir a relação entre o coreto e a sombra.",
  },
  {
    id: "restore",
    label: "Restaurar a ligação com o coreto",
    skill: "inventar",
    final: true,
    risk: "O reparo ficará incompleto ou exigirá uma concessão.",
    effect: "Devolver a sombra ao coreto.",
  },
  {
    id: "pact",
    label: "Negociar um novo lugar para a sombra",
    skill: "articular",
    final: true,
    risk: "O acordo terá uma contrapartida para a feira.",
    effect: "Criar um acordo entre a sombra e os moradores.",
  },
  {
    id: "shelter",
    label: "Preparar a feira para conviver com a mudança",
    skill: "cuidar",
    final: true,
    risk: "Parte da feira precisará mudar de lugar.",
    effect: "Garantir abrigo para a feira sem prender a sombra.",
  },
];
export const CLUE_TEXT: Record<string, string> = {
  registro: "Uma reforma retirou o banco onde as pessoas contavam histórias ao entardecer.",
  rastro: "A sombra parou no terreno onde um antigo jardim foi cimentado.",
  memoria: "A zeladora lembra: a sombra seguia as pessoas, antes de seguir o edifício.",
  testemunhas: "Todas as testemunhas estavam compartilhando alguma coisa quando a sombra passou.",
  medida: "O detector reage às conversas e aos encontros, não à intensidade da luz.",
};
export const OPENING =
  "Ao meio-dia, a sombra do coreto se desprendeu e atravessou a rua. Amanhã haverá feira. Lídia, a zeladora, guarda um livro com duas páginas arrancadas. No chão, uma faixa escura ainda aponta para o antigo jardim. Você tem algumas horas para entender o fenômeno e decidir o que fazer.";
export function initialRpg(role: string, talent: Skill): RpgState {
  if (!skillKeys.includes(talent)) throw new RpgError("Escolha um talento.");
  const skills = { investigar: 0, inventar: 0, articular: 0, cuidar: 0, explorar: 0 };
  skills[talent] = 2;
  for (const k of skillKeys.filter((k) => k !== talent).slice(0, 2)) skills[k] = 1;
  return {
    version: 1,
    role: role.slice(0, 100) || "Habitante da Praça",
    talent,
    skills,
    growth: { investigar: 0, inventar: 0, articular: 0, cuidar: 0, explorar: 0 },
    boon: null,
    focus: true,
    clues: [],
    pressure: 0,
    turn: 0,
    ended: false,
    ending: "",
    xp: 0,
    pending: null,
    journal: [{ who: "mestre", text: OPENING }],
    activities: [],
    lastRoll: null,
  };
}
export function available(s: RpgState) {
  if (s.ended) return [];
  return ACTIONS.filter((a) =>
    a.final ? s.clues.length >= 2 : !s.clues.includes(a.clue!) && s.pressure < 6,
  );
}
export function bonus(s: RpgState, a: Action, focus = false) {
  return (
    s.skills[a.skill] +
    Math.min(1, Math.floor(s.growth[a.skill] / 2)) +
    (s.boon === a.skill ? 1 : 0) +
    (focus && s.focus && s.talent === a.skill ? 1 : 0)
  );
}
export function resolve(s: RpgState, proposalId: string, dice: number[], focus = false): RpgState {
  if (s.ended || !s.pending || s.pending.id !== proposalId)
    throw new RpgError("Esta ação já mudou. Atualize a aventura.", 409);
  const a = available(s).find((a) => a.id === s.pending!.action);
  if (!a) throw new RpgError("Ação indisponível.", 409);
  if (dice.length !== 2 || dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6))
    throw new RpgError("Dados inválidos.");
  if (focus && (!s.focus || s.talent !== a.skill))
    throw new RpgError("Seu talento não está disponível para este teste.");
  const n = structuredClone(s),
    b = bonus(s, a, focus),
    total = dice[0] + dice[1] + b,
    outcome = total >= 10 ? "Sucesso" : total >= 7 ? "Sucesso com custo" : "Complicação";
  n.turn++;
  n.pending = null;
  n.lastRoll = { dice, bonus: b, total, outcome, skill: a.skill };
  if (focus) n.focus = false;
  if (n.boon === a.skill) n.boon = null;
  let text = "";
  if (a.final) {
    n.ended = true;
    n.ending = a.id;
    const costs =
      total >= 10
        ? "A feira abre no horário."
        : total >= 7
          ? "A feira abre mais tarde, e o grupo assume a manutenção do novo arranjo."
          : "A feira precisa ocupar outra rua. A solução é provisória e exige trabalho depois.";
    text =
      (
        {
          restore:
            "Você reconstrói o banco do coreto e cria espaço para os encontros. A sombra volta, mas agora se move quando alguém conta uma história.",
          pact: "A sombra aceita visitar a feira e passar as tardes no antigo jardim. Os moradores se comprometem a devolver vida àquele espaço.",
          shelter:
            "Você organiza toldos, bancos e caminhos acessíveis. A sombra continua livre, e a feira aprende a acontecer em mais de um lugar.",
        } as Record<string, string>
      )[a.id] +
      " " +
      costs;
    n.xp += 20;
    n.growth[a.skill]++;
  } else {
    n.clues.push(a.clue!);
    n.growth[a.skill]++;
    n.xp += 5;
    const cost = total >= 10 ? 0 : total >= 7 ? 1 : 2;
    n.pressure = Math.min(6, n.pressure + cost);
    text =
      CLUE_TEXT[a.clue!] +
      " " +
      (cost === 0
        ? "Você encontra a pista a tempo."
        : cost === 1
          ? "Você consegue a pista, mas a feira está mais próxima."
          : "A pista aparece depois de um contratempo: o tempo disponível diminuiu bastante.");
    if (n.pressure >= 6)
      text += " Os preparativos terminaram. É hora de escolher uma solução com o que você já sabe.";
  }
  if (!a.final && total < 10) {
    const details: Record<string, string> = {
      archive: "O arquivista pede sua ajuda para reorganizar uma caixa antes de liberar o livro.",
      follow: "O caminho termina num portão fechado; você precisa contornar o quarteirão.",
      keeper: "Lídia interrompe a conversa para terminar os preparativos e você a acompanha.",
      neighbors: "Você precisa separar dois relatos contraditórios antes de chegar à pista.",
      device: "Uma conexão se solta e exige um reparo antes de a leitura funcionar.",
    };
    text = details[a.id] + " " + text;
  }
  n.journal.push(
    {
      who: "dados",
      text: `${SKILLS[a.skill]}: ${dice.join(" + ")} + ${b} = ${total}. ${outcome}.`,
    },
    { who: "mestre", text },
  );
  return n;
}
export const ACTIVITIES = [
  {
    id: "fontes",
    skill: "investigar" as Skill,
    title: "Duas versões de uma história",
    real: "Compare duas fontes sobre um tema e descreva uma diferença relevante. Se publicar na Praça, inclua as fontes.",
    inside:
      "Compare a versão da zeladora com uma pista já encontrada. O que coincide e o que permanece incerto?",
  },
  {
    id: "projeto",
    skill: "inventar" as Skill,
    title: "Um objeto, outra possibilidade",
    real: "Descreva uma pequena adaptação que você fez ou projetou e o problema que ela resolve.",
    inside:
      "Proponha uma solução para dar sombra à feira com materiais reaproveitados. Explique uma limitação.",
  },
  {
    id: "escuta",
    skill: "articular" as Skill,
    title: "Um acordo possível",
    real: "Relate um aprendizado de uma decisão coletiva, sem identificar outras pessoas sem autorização.",
    inside:
      "Escreva um acordo entre os feirantes e a sombra, incluindo uma responsabilidade para cada parte.",
  },
  {
    id: "cuidado",
    skill: "cuidar" as Skill,
    title: "Aquilo que precisa de manutenção",
    real: "Observe uma necessidade de cuidado num espaço ou objeto e descreva uma ação possível.",
    inside:
      "Como organizar a feira para quem precisa de descanso ou tem dificuldade de locomoção? Descreva uma medida concreta.",
  },
  {
    id: "entorno",
    skill: "explorar" as Skill,
    title: "Reparar no caminho",
    real: "Observe do lugar onde estiver algo que normalmente passa despercebido e registre uma descoberta. Não é preciso sair de casa.",
    inside:
      "Escolha dois lugares mencionados na aventura e formule uma hipótese sobre a trajetória da sombra.",
  },
];
export function recordActivity(s: RpgState, id: string, mode: string, note: string) {
  const a = ACTIVITIES.find((a) => a.id === id);
  if (!a || !["inside", "real"].includes(mode)) throw new RpgError("Atividade inválida.");
  if (s.ended) throw new RpgError("Este capítulo já terminou.");
  if (s.pending) throw new RpgError("Resolva ou cancele a ação antes de preparar uma atividade.");
  if (s.activities.includes(id)) throw new RpgError("Esta atividade já foi registrada.", 409);
  if (note.trim().length < 80 || note.length > 1800)
    throw new RpgError("Registre entre 80 e 1.800 caracteres.");
  if (s.boon) throw new RpgError("Use sua preparação atual antes de registrar outra atividade.");
  const n = structuredClone(s);
  n.activities.push(id);
  n.growth[a.skill]++;
  n.boon = a.skill;
  n.journal.push(
    {
      who: "jogador",
      text: `Atividade — ${a.title} (${mode === "real" ? "observação real" : "dentro da aventura"}): ${note.trim()}`,
    },
    {
      who: "mestre",
      text: `Preparação registrada por autodeclaração. +1 no próximo teste de ${SKILLS[a.skill]}. Não é uma certificação de habilidade real.`,
    },
  );
  return n;
}
export function publicRpg(s: RpgState) {
  return {
    role: s.role,
    talent: s.talent,
    skills: s.skills,
    growth: s.growth,
    xp: s.xp,
    ended: s.ended,
    turn: s.turn,
    clues: s.clues.length,
  };
}
