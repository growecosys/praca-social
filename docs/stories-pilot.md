# Histórias da Praça — piloto coletivo

Base preservada: publicação 91, commit 7feb769d678264281e8ce78b17c93533fe3b8361, tag local backup/pre-historias-v91. Os dados do RPG solo, Correio Aéreo e Baldio permanecem intactos. Tabelas novas aditivas story_campaigns/story_messages. Restaurar a publicação 91 retira as novas telas sem excluir registros.

## Experiência

/jogar apresenta Histórias da Praça como atividade principal; minigames e o caderno solo ficam recolhidos em Explorar minigames. /jogar/historias oferece inscrição e jogo. Ficha e avatar copiados na inscrição; habilidades iguais para novos e antigos usuários. Premissa concreta: feira sem água. Rotas: reparar conexão, abastecer recipientes ou transferir o evento, além de organizar acesso e tarefas. Só usuários são personagens; o mestre não interpreta nem assume consentimento deles.

Inscrições 72 horas, 3–6 participantes, espera de até 24 com autorização explícita de promoção automática antes do início. Sem mínimo, turma não formada sem penalidade. Campanha com até 7 rodadas fixas de 24 horas. Uma ação principal confirmada por participante/rodada. Não há avanço manual ou antecipado. Objetivo atingido encerra no fechamento da rodada, preservando oportunidade de participação por revisão. Sem ações por duas rodadas, interrupção; ausência individual após duas rodadas, retorno explícito possível. Saída voluntária durante jogo é definitiva na turma, com confirmação na interface. Grupo vazio interrompe. Após uma hora de intervalo, nova inscrição; a espera anterior não é transferida.

Gastos com propostas predefinidas e maioria estrita dos ativos. Uma proposta por pessoa/rodada, votos substituíveis, silêncio não é consentimento, expiração ao fechar rodada. Recurso validado na aprovação; aplicação única no mesmo estado transacional. Sem dinheiro real. Atividades opcionais por autodeclaração: no máximo duas, habilidades diferentes, equivalência real/ficcional, uma preparação de +1 por vez, descarte possível. Relatos privados para o autor, não enviados à IA. Prática concede até +1 por habilidade dentro da campanha, sem vantagem acumulada entre turmas.

Mestre usa o AI Gateway da Vercel (sem chave própria), mesmo modelo do guia, saída estruturada. Interpreta intenção em ação permitida ou conversa sem efeitos mecânicos. Dados, recursos, cronologia e XP pertencem ao servidor. Quota pessoal compartilhada com RPG solo: 30 chamadas/dia, reservadas atomicamente, falhas contam. Até 24 respostas de conversa do mestre por rodada do grupo. Com IA indisponível ou quota esgotada, sugestões, rolagens e conversa humana continuam. IA não recebe relatos privados nem dados de contas fora do grupo.

Conversa restrita aos membros, somente leitura ao encerrar, últimos 80 registros na interface, 8 envios/minuto por conta e proteção de reenvio. Histórico de acontecimentos preservado separadamente, fichas próprias não revelam rascunhos nem relatos alheios. Perfil público exibe participação e marcos, sem conversa. XP: primeira ação coletiva 5 e primeiro encerramento não interrompido com ação 20, uma vez cada por conta; futuras campanhas continuam registradas sem cultivo desses marcos. Notificações de início, rodada e fim com chave única.

## Consistência e cronologia

Estado canônico por campanha com revisão otimista e apenas uma campanha corrente (índice único). Vários cliques ou atores simultâneos não sobrescrevem atualizações: a versão obsoleta recebe 409 e deve ser revista. Dados sorteados no servidor e gravados somente numa ação aceita. Migrations aplicadas antes do Worker. IDs de contas removidas são retirados da turma pelo reconciliador; avatar verifica conta ativa.

GET público /api/historias/tick é o escritor determinístico de prazos. Não recebe tempo ou comandos do chamador, não lê fontes externas e não chama IA. Também é invocado nas leituras/mutações da campanha. Uma tarefa vinculada ao Site deve executá-lo de hora em hora para avançar com o site fechado. A interface consulta o estado a cada 30 s quando visível. Prazos são absolutos e exibidos no fuso America/Sao_Paulo. Verificação agendada pode ocorrer até uma hora depois do prazo; visitar a campanha aplica o prazo imediatamente.

Para verificar sem avançar indevidamente, fazer duas chamadas consecutivas ao tick e conferir mesmo id/fase/rodada/próximo prazo. Não criar contas ou campanhas de teste em produção. Os testes de campanha acelerada usam apenas SQLite local e relógio injetado no motor.

## Limites do piloto

Uma premissa preparada, três caminhos, sem notícias, campanhas simultâneas, personagens fictícios, criação livre de regras, pagamentos reais ou mudanças em acordos de círculos. A visualização do chat carrega 80 mensagens recentes; o banco preserva o restante. O perfil considera até 100 campanhas recentes. Testes de regras cobrem limites, ausências, todas as rotas, duplicação, privacidade e concorrência. A chave secreta não é disponibilizada na prévia: chamadas reais ao mestre serão observáveis quando a turma publicada iniciar; não afirmar validação de geração em produção antes disso.
