# RPG da Praça — primeiro capítulo

Base de restauração: versão publicada 90, commit a4cea08f1139eaf98afdb60de49bd0a4d1819034. Tag local backup/pre-rpg-v90. As migrações 0033 são aditivas: restaurar o Worker anterior preserva as tabelas sem expô-las.

Rota /jogar/rpg. Capítulo solo e persistente, sem reinício para impedir cultivo de recompensas. A ficha copia o papel na criação. Cinco habilidades, talento à escolha, uma invocação de +1 e até +1 de prática por habilidade. Dois d6 criptográficos no servidor com amostragem por rejeição. Risco e efeito confirmados antes da rolagem. Pistas sempre avançam; resultados baixos aumentam pressão. Com duas pistas surgem três finais possíveis. A pressão é por ação, não por relógio real.

IA: mesma OPENAI_API_KEY do ambiente de produção, Responses API, mesmo modelo do guia existente, saída estruturada. 30 tentativas diárias por conta, incluindo chamadas falhas; reserva atômica antes da chamada. Até 900 caracteres de intenção, 16 entradas de contexto, 650 tokens de saída, timeout de 25 s. IA classifica uma intenção numa ação disponível ou fala sem efeito mecânico. Nunca concede XP nem altera inventário. Propostas obsoletas são rejeitadas por controle otimista de revisão. Sugestões sem IA continuam disponíveis.

Histórico e relatos privados. Perfil público recebe apenas ficha agregada, pontos e marcos. Atividades por autodeclaração, uma por categoria, 80–1800 caracteres, com equivalência ficcional e real. Não há avaliação automática de veracidade, compartilhamento automático nem prêmio por publicar. Preparação única (+1 consumível), prática limitada. XP geral: primeiro teste 5 e conclusão 20, inseridos atomicamente e uma vez em game_achievements. Pontos de aventura separados.

Não inclui notícias, cooperação, livre criação de missões ou campanhas infinitas. Essas são etapas futuras, não funcionalidades anunciadas como prontas. Erros de IA não mudam a história; a quota reservada ainda conta. Reenvio de confirmação com revisão antiga não roda novos dados nem altera a história. Não há dados privados de terceiros no prompt, somente papel e caderno do próprio jogador.
