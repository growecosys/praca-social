export type SocialStats = {
  posts: number;
  likesReceived: number;
  commentsReceived: number;
  sharesReceived: number;
  uniqueViews: number;
  linkVisitors: number;
  peopleAttracted: number;
  pokesReceived: number;
  hasGeneratedAvatar: boolean;
};

export type EarnedBadge = { key: string; emoji: string; title: string; description: string };

export function earnedBadges(stats: SocialStats): EarnedBadge[] {
  return [
    stats.posts >= 1 && { key: "seal", emoji: "📯", title: "Quebrou o Lacre", description: "Publicou sem pedir licença." },
    stats.posts >= 3 && { key: "columnist", emoji: "🗞️", title: "Colunista sem Sindicato", description: "Três textos e nenhum editor para culpar." },
    stats.likesReceived >= 5 && { key: "magnet", emoji: "🧲", title: "Ímã de Joinha", description: "Atraiu cinco aprovações públicas e suspeitas." },
    stats.commentsReceived >= 3 && { key: "circle", emoji: "🪑", title: "Abriu a Roda", description: "Fez a praça parar para conversar." },
    stats.sharesReceived >= 3 && { key: "smuggler", emoji: "🕵️", title: "Contrabandista de Link", description: "Fez ideias atravessarem três fronteiras digitais." },
    stats.linkVisitors >= 10 && { key: "pamphleteer", emoji: "📣", title: "Panfleteiro Digital", description: "Trouxe dez visitantes diferentes pelos becos da internet." },
    stats.peopleAttracted >= 1 && { key: "chair", emoji: "🪑", title: "Puxou uma Cadeira", description: "Trouxe alguém que entrou e concluiu seu lugar na Praça." },
    stats.pokesReceived >= 3 && { key: "pokeable", emoji: "👉", title: "Cutucável Oficial", description: "Foi requisitado pela população três vezes." },
    stats.hasGeneratedAvatar && { key: "portrait", emoji: "🎨", title: "Retrato Falado pela Máquina", description: "Deixou a inteligência artificial prestar depoimento." },
  ].filter(Boolean) as EarnedBadge[];
}
