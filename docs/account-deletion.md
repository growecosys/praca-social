# Exclusão da conta

Botão destacado no perfil e em Editar perfil. A janela exige somente escrever DELETAR CONTA e apertar Excluir conta definitivamente, conforme solicitado pelo usuário. Não exige senha ou confirmação por e-mail. Cancelar ou Escape fecha a janela; a ação final permanece desabilitada até a frase coincidir exatamente.

O endpoint exige sessão ativa, origem correspondente e a mesma frase. Os testes usam apenas SQLite em memória. Nenhuma conta real foi excluída nesta implementação.

A operação revoga sessões, tokens e recuperação; remove vínculos de e-mail, respostas e dados privados de identidade; anonimiza nome, bio, papel e referências ao avatar; elimina histórico privado de geração e metadados de atividade. Um registro técnico sem perfil público preserva integridade referencial. Nomes de usuário antigos ficam reservados para impedir que novos usuários assumam links antigos. O perfil público e o avatar deixam de ser servidos, e a autenticação ignora contas excluídas.

Publicações, versões, comentários e registros comunitários são preservados, com autoria Conta excluída. O conteúdo textual dessas contribuições não é apagado nem reescrito: pode conter informações que a própria pessoa publicou. Objetos de mídia já públicos e cópias em cache não são apagados por este fluxo de encerramento de conta. A tela explica a conservação do conteúdo antes da confirmação. Não é uma promessa de remoção de toda cópia existente na infraestrutura.

A alteração principal é transacional. Uma falha reverte credenciais, sessões, dados e autoria. Depois da exclusão, o navegador limpa os rascunhos e mostra uma página de conclusão. O controle de acesso considera deleted_at mesmo se houver uma sessão remanescente.
