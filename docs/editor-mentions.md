# Menções e formatação no editor

O editor oferece menções com sugestões de nome público, usuário e avatar, links em palavras e negrito/itálico/riscado, com prévia por bloco. Atalhos: Ctrl/Cmd+B, I e K. As ações estão disponíveis por botões para toque e teclado. A edição usa marcações de texto visíveis; a prévia mostra a apresentação publicada.

Somente os blocos com inlineFormat=markdown recebem formatação. Publicações anteriores continuam com sua interpretação original até o bloco ser editado. Rascunhos e histórico de versões preservam a marcação. HTML não é executado; links permitem HTTP/HTTPS sem credenciais, além de perfis locais válidos. Menções dentro de código não são processadas.

A busca exige uma sessão e retorna até oito perfis concluídos, apenas com dados públicos. A seleção insere um link @usuário. Identificadores antigos continuam resolvendo pelo registro de aliases. As notificações são criadas no servidor, apenas ao salvar a publicação, excluindo o autor e contas incompletas. Chave de deduplicação por publicação e destinatário impede avisos repetidos em edições, inclusive após remover e reinserir uma menção. São permitidos até vinte identificadores distintos por publicação. Uma menção adicionada a uma edição notifica um destinatário que ainda não foi avisado.

Post, revisão, evento de atividade e notificações são gravados na mesma transação D1. O aviso abre a publicação ancorada no primeiro bloco em que o destinatário foi mencionado. Remover a menção em uma versão futura não apaga um aviso já recebido nem altera versões antigas.

Validação: renderização escapada, URLs perigosas, formatação, compatibilidade com texto antigo, menções em código, aliases, exclusão do autor, perfis incompletos, deduplicação, limite de menções e reversão transacional. Não são enviados e-mails ou notificações externas; usa-se a central de notificações existente na Praça.

## Ordem dos blocos

Alça Arrastar usa Pointer Events com captura para mouse, toque e caneta, indicador de destino e rolagem automática perto das bordas da janela. Escape e cancelamento do ponteiro abandonam a operação. Setas visíveis e teclas para cima/baixo na alça oferecem alternativa de teclado. Conteúdo dos campos não inicia arraste.

Apagar está sempre visível em cada bloco. Exclusão e reordenação guardam um estado anterior na pilha de desfazer já existente, agora também acessível acima dos blocos. Ao apagar o último bloco, um parágrafo vazio mantém o editor utilizável. O foco após exclusão segue para a alça vizinha; mudanças são anunciadas para leitores de tela. Os IDs dos blocos e seus conteúdos permanecem intactos ao reorganizar; autosave e versões continuam usando a ordem da lista.

## Desfazer e refazer

Histórico unificado do título, texto, ordem, inserção e exclusão de blocos e aplicação da IA. Refazer restaura o estado desfeito; uma edição nova limpa a sequência de refazer. Digitação próxima é agrupada para evitar um passo por caractere. O rascunho preserva ambas as pilhas, com no máximo 30 estados. Ctrl/Cmd+Z desfaz; Ctrl/Cmd+Y ou Shift+Z refaz. Formulários auxiliares de link mantêm o histórico nativo.
