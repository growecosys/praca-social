# Preparação para lançamento — acessibilidade e interoperabilidade

Status: primeira revisão implementada; não representa certificação WCAG nem teste completo em dispositivos reais.

| Área | Antes | Implementação |
| --- | --- | --- |
| Identidade no navegador | Ícone azul do template | Marca da Praça em SVG, PNG 16/32/192/512, ICO e Apple Touch 180; ícone maskable com área de segurança |
| Tela inicial | Sem manifest | Manifest com nome, cores, escopo, ícones e atalhos públicos; não instala serviço de cache de páginas privadas |
| Títulos | Várias páginas com título genérico | Nomes de páginas, contador de não lidas e atualização ao navegar sem duplicar o prefixo |
| Favicon de notificações | Sem indicação | Marca recebe contador, até 99+; ao ler, retorna ao ícone normal |
| Badging | Ausente | Atualização do badge do aplicativo quando a API existir; falhas não impedem o sino nem o título |
| Som | Inicialização podia falhar com armazenamento bloqueado | Preferência tolerante a armazenamento indisponível, desbloqueio por gesto, teste explícito e supressão entre abas para o mesmo aviso |
| Avisos públicos | Consultas sem sessão retornavam 401 | Runtime iniciado só para usuários com perfil concluído; limpa estado ao perder autenticação |
| Janela do sino | Portal sem contenção de foco | Dialog nativo, foco inicial, Escape, retorno ao sino e navegação entre links |
| Leitura e toque | Controles pequenos e leitura pouco diferenciada | Controles do sino/tradução com alvo de 44px, marca textual de não lida e anúncios discretos para leitor de tela |
| Teclado | Sem atalho para conteúdo e foco variável | Pular para o conteúdo, destinos focáveis nas páginas principais, foco com contraste e suporte a cores forçadas |
| Movimento | Regras pontuais | Preferência de movimento reduzido cobre animações e transições |
| Assistente | Declarava modal mas não continha foco | Janela não modal, foco no campo ao abrir e retorno ao botão ao fechar; campo com nome acessível |
| Compartilhamento | Metadados parcialmente relativos | metadataBase canônico, nome/locale do site, canonical das publicações e ícones completos |
| Indexação | Sem política simples | robots e noindex nas páginas de conta/edição; isso não substitui autorização do servidor |

## Comportamento das notificações

Sino, título e favicon continuam sendo o caminho principal. O título aparece como `(3) Mural — Praça`; contadores acima de 99 usam `99+`. Não há piscadas. A preferência de som fica disponível no sino. O primeiro carregamento não toca todos os avisos antigos. Consultas são periódicas, sem sobreposição, e retomam quando a aba fica visível ou a conexão retorna. O navegador pode suspender abas em segundo plano.

Não foi instalado Web Push. Com o navegador/site fechado, não há promessa de alerta de sistema. A permissão de notificações não é solicitada nesta etapa. A API de badge e o comportamento de instalação variam entre navegadores; sino e título são o fallback. O manifest não oferece funcionamento offline.

## Validação e limites

Testes automatizados verificam títulos sem prefixos duplicados, limpeza de contadores, entradas inválidas, SVG sem conteúdo do usuário, manifesto e dimensões reais dos arquivos PNG/ICO. A suíte existente cobre os fluxos funcionais. Os ícones foram inspecionados visualmente.

A prévia local apresentou falha ao carregar o módulo de entrada do JavaScript de desenvolvimento. A visualização HTML e o link de salto foram observados, mas interações nessa prévia não foram consideradas aprovadas. A compilação de produção e os testes são independentes dessa limitação. A verificação após publicação deve distinguir visitantes de sessões autenticadas.

Antes de anunciar conformidade, é necessário testar com VoiceOver/NVDA e navegadores/dispositivos reais, inclusive zoom, teclado, toque, formulários, modais e áudio. Contraste e nomes acessíveis foram melhorados nas superfícies alteradas; não se afirma que todos os componentes existentes passaram em uma auditoria completa.

## Referências técnicas

- W3C WCAG 2.2, foco visível e tamanho de alvo: https://www.w3.org/TR/WCAG22/
- WAI Target Size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WAI Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance
- MDN Badging API: https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
- MDN Notifications API: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
