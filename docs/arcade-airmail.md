# Correio Aéreo e perfil de jogos

## Ponto de restauração

Antes desta alteração, foi verificada a versão 89 com pacote de publicação salvo:

- Projeto: `appgprj_6a9618cc8d6881919018217eb8790c80`
- Versão: `appgprj_6a9618cc8d6881919018217eb8790c80~appgver_917ba2387a44819195da966d7aba4e68`
- Commit: `328db2977192461d6e447b30466ff9781fe155fe`

Republicar essa versão desfaz a interface desta mudança. As tabelas adicionadas podem permanecer: a versão 89 as ignora. A versão 88, anterior a todos os jogos, também continua salva (ver `after-hours.md`). Não houve cópia do banco de produção nem alteração dos registros existentes para introduzir o jogo.

## Experiência

`/jogar` passa a ser a entrada dos jogos. O Correio Aéreo fica em `/jogar/correio-aereo`. A aventura anterior foi preservada em `/jogar/baldio`, com o mesmo progresso em `after_hours_states`.

Correio Aéreo é um jogo de ação 2D em canvas: o avião avança, o jogador muda altitude e velocidade e solta cartas. Cada rota tem seis destinos, oito cartas, oito anéis postais e aves que causam dano. São três vidas e até 60 segundos. Há previsão visual da queda, inércia, vento, bônus de precisão e sequência. Teclado (setas/WASD e espaço), botões de toque, pausa e tela cheia. O tempo da simulação para ao ocultar a aba ou perder o foco.

Visitantes podem jogar treinos sem gravar resultado. Contas da Praça iniciam uma partida no servidor e enviam os comandos ao concluir. Falhas de rede preservam o envio pendente na sessão do navegador e oferecem nova tentativa. Recarregar no meio de um voo não o conclui nem concede pontos.

## Pontos e XP

Os perfis público e privado mostram uma seção Jogos: nível, XP, recorde por jogo, pontos acumulados, entregas e partidas concluídas. Pontos são a soma de resultados validados. XP vem de seis conquistas, cada uma concedida uma vez por conta/jogo. Os níveis derivam exclusivamente desse XP. Nada foi integrado ao placar de atividades ou aos recursos financeiros dos círculos.

## Validação de resultados

`airmail.ts` contém as regras determinísticas da versão 1. O servidor emite a semente da rota e registra a largada. Ao concluir, reproduz os comandos com passos fixos de 30 Hz e calcula o resultado, ignorando pontuações informadas pelo cliente. Valida tamanho/ordem dos comandos, duração real mínima, término do jogo, titularidade e expiração de 15 minutos. Uma atualização de versão precisa preservar o simulador antigo ou rejeitar partidas da versão anterior de forma explícita.

A validação dificulta adulteração direta de pontos e partidas instantâneas; não é uma prova de habilidade humana nem proteção completa contra bots. Partidas terminadas são idempotentes por ID e hash dos comandos. Gravação do resultado e concessões de conquistas usam um batch transacional; o índice único impede XP repetido. Contas excluídas não aparecem no perfil de jogos. O servidor limita largadas por minuto e não expõe replays em perfis públicos.

## Tabelas

`arcade_runs`: partidas por conta e jogo, versão, semente, início/fim, resultado calculado e replay para auditoria.

`game_achievements`: conquistas únicas por conta/jogo/chave, XP e partida de origem. Catálogo no código evita confiar em valores enviados pelo navegador.

## Testes

Simulação determinística, efeitos dos controles, quantidade de cartas, entregas reais, ordem/validade dos comandos, propriedade da partida, limites de largada, expiração, duração mínima, resultados duplicados, concessão única de XP, soma versus recorde, contas excluídas e níveis de jogador.
