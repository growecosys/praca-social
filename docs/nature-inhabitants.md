# Natureza nos encaixes da Praça

Cada imagem tem apoio (chão, pouso, canto ou voo), lugares permitidos, escala, movimento e compensação da margem transparente inferior. A coluna placement_json guarda escolhas validadas e limitadas a opções conhecidas. O acervo inicial tem regras por espécie; configurações ausentes usam defaults seguros.

A interface oferece encaixes explícitos no header, títulos, botão de entrada, cards de círculos e mapa. O sorteio escolhe até duas imagens diferentes por página (uma no celular), evita a combinação da visita anterior quando houver alternativa e não utiliza posições incompatíveis. Imagens ocupam espaço reservado e não interceptam cliques. Os encaixes pequenos têm altura fixa antes do carregamento. A Home e o Espaço Comum usam áreas próprias para imagens grandes; posições negativas fora da tela foram removidas. Movimentos suaves respeitam prefers-reduced-motion.

Novas contribuições têm duas etapas: gerar e salvar uma imagem; depois escolher encaixes nas prévias e submeter à comunidade. A geração continua limitada a uma por mês. O rascunho fica no banco e pode ser retomado; submeter não chama o gerador. A proposta publica também as regras de encaixe. A imagem só participa da rotação quando aprovada. Propostas existentes continuam funcionando com as regras padrão.

Migration: 0023_boring_blizzard adds only common_assets.placement_json with a constant default. Previous applied migrations are unchanged.

## Arte revisada

Arquivo integrado: public/nature/lobo-guara-v2.png. A referência original public/nature/lobo-guara.webp foi preservada. Foi usada a ferramenta integrada de imagens, com fundo transparente, sem consumir a cota de geração do aplicativo.

Prompt:

Edit target: attached walking Brazilian maned wolf website cutout. Fix the broken colored transparency edge artifacts and refine this into a biologically accurate photorealistic lobo-guará (Chrysocyon brachyurus): distinctive very long slender black legs, large erect ears, reddish-orange coat, black mane, slim body and white-tipped tail. Preserve side-on walking pose facing RIGHT and natural-history photographic look. Show the complete animal, all paws, ears and tail within frame. Remove all grass and scenery; animal only on genuinely transparent background with clean alpha edges, no opaque shadow floor or colored outline. Wide landscape composition, modest transparent margin, level horizontal paw baseline near bottom, suitable as a small decorative animal walking atop a website card border. No text or logo.

## Validação

Testes usam gerador simulado: compatibilidade, sorteio sem duplicatas, recuperação de rascunho, autoria, limite mensal e envio idempotente. Nenhuma geração de produção foi executada no teste. Browser QA verifica o acervo, as prévias públicas de encaixe, a rotação na Home e os limites de imagens em frames de 390 e 768 pixels, sem transbordamento horizontal. A compilação de produção é verificada antes da publicação. O TypeScript isolado continua com os erros anteriores de tipos de runtime Cloudflare e pontos não relacionados.
+
+## Revisão de composição por espécie
+
+O encaixe genérico de 28–38 px foi removido. O lobo usa o mesmo arquivo v2 e volta a aproximadamente 156 × 82 px no desktop, caminhando sobre uma linha. As outras sete imagens compostas não são mais candidatas a miniaturas de header.
+
+No Mural: ipê ou jabuticaba compõem a área do título; tucano, mico ou beija-flor ocupam a lateral da publicação em destaque; vitória-régia ou borboleta aparecem no fechamento da página. A composição varia dentro desses grupos, sem duplicar a mesma imagem. A lateral é ocultada no celular para manter prioridade ao texto.
+
+As dimensões consideram as silhuetas: tucano e jabuticaba têm espaço vertical; o mico preserva a cauda; a vitória-régia é larga e baixa; a borboleta mantém uma escala reconhecível; ipê e helicônia usam áreas laterais. Os elementos não usam recortes circulares nem um tamanho único. Imagens aprovadas novas continuam usando suas opções de encaixe.
+
+Verificações: build de produção; testes de compatibilidade e envio; browser com Mural e uma publicação fictícia local, além de frame de 390 px sem transbordamento horizontal. O conteúdo de teste é removido antes da publicação.
+


## Acervo separado v1
Onze inclusões autorizadas pelo responsável: dez imagens isoladas e um habitat de capim. `lib/common-asset-catalog.json` preserva os prompts, categorias, rotas compatíveis e URLs WebP. O cadastro é idempotente e nunca reativa registros removidos. Categorias e rota ficam também no placement_json de cada registro. Originais e decisões anteriores são preservados. Capim só aparece como camada fixa atrás de um visitante terrestre, se estiver ativo. A jaçanã está restrita ao ponto aquático; plantas isoladas usam áreas editoriais. Os encaixes existentes são reutilizados, sem criar um novo editor de rotas nesta alteração.
