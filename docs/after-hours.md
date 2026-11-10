# Depois das Horas — primeira aventura

## Backup anterior à implementação

A versão 88 da Praça foi verificada antes das alterações. Seu pacote de publicação permanece salvo no Sites:

- Projeto: `appgprj_6a9618cc8d6881919018217eb8790c80`
- Versão: `appgprj_6a9618cc8d6881919018217eb8790c80~appgver_b0afab1c7ea48191a499e7ef815531aa`
- Commit: `3a9b2434355857db9b1007aef0e54eacaecd5860`
- SHA-256 do pacote: `036df0e065b120377aa9683f5f64a95ffec876655fdeb730fe25c86682b55103`

Para desfazer a experiência, republicar essa versão salva com `deploy_site_version`. Ela contém a interface e o código anterior ao jogo. Não é necessário reverter migrações: o jogo acrescenta apenas `after_hours_states`, que a v88 ignora. Não foi criada uma cópia do banco de produção; os registros existentes e o armazenamento de imagens são mantidos no lugar. Não aplicar restaurações destrutivas de banco para remover o jogo.

## Escopo

Uma nova página `/jogar` e o link Jogar no menu. Baldio com oito lugares conectados, quatro mecanismos, clima por saída, mochila de dez peças, doze passos, retorno ao acampamento ou resgate com recuperação parcial. Descobertas únicas persistem mesmo no resgate. Uma estação é a meta da primeira aventura.

Oficina de embarcações: dois cascos, três propulsões, até três baterias e distribuição de carga. Simulação determinística gratuita; fabricar gasta materiais e equipa a embarcação. Até três projetos fabricados por conta, nomeados pelo jogador. Desmontagem devolve todos os materiais. Sem IA, transferências, dinheiro real, classificação ou ligação com acordos dos círculos.

Protótipos e efeitos visuais rodam no navegador. Regras, gastos, caminhos e recompensas são revalidados no servidor. Progressos individuais ficam no D1 vinculados à conta. Controle de revisão evita sobrescritas entre abas. Recibos idempotentes impedem ações duplicadas após falhas de conexão. Contas excluídas não acessam progresso. Todas as mutações exigem sessão e mesma origem. Estado retornado ao navegador omite os recibos internos.

## Validação

Testes de receita e materiais, clima/equilíbrio, rotas e travessias em ambas as direções, capacidade da mochila, coleta repetida, mecanismos, resgate, conclusão completa com kit inicial, isolamento por conta, contas excluídas, concorrência e repetição de requisições. Interface com controles por teclado, rótulos e suporte a movimento reduzido. Todos os controles são utilizáveis sem arrastar objetos e sem áudio.
