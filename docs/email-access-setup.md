# Acesso por e-mail e edição do perfil

Status: integração implementada; envio depende de configuração externa. Login por Chave da Praça continua disponível.

## Ativação

1. Criar conta no Resend e verificar um domínio remetente com os registros DNS fornecidos pelo serviço.
2. Criar uma chave restrita a envio. Configurar como segredo de produção `RESEND_API_KEY` pelo painel de ambiente do Site. Não colocar em código ou conversa.
3. Configurar `AUTH_EMAIL_FROM` com o remetente verificado, por exemplo `Praça <acesso@seu-dominio>`. O domínio precisa ser controlado pelo responsável, não o domínio do Site hospedado.
4. Opcional: `AUTH_EMAIL_ORIGIN`, origem HTTPS canônica. O padrão é a URL publicada da Praça. Links nunca usam o Host arbitrário da solicitação.
5. Desativar rastreamento de cliques nos e-mails de autenticação. Publicar novamente após configurar o ambiente e verificar entrega e consumo com uma conta de teste controlada pelo responsável.

## Fluxo

No cadastro tradicional, nome, usuário, e-mail e senha criam a conta. O endereço fica em pending_account_emails até ser confirmado; ele não é reservado globalmente nem aceito para login. A conta pode continuar o onboarding e entrar por usuário/senha enquanto isso. A confirmação promove o endereço para account_emails e remove a pendência em transação. No acesso sem senha, o endereço deve ser confirmado antes de criar uma nova conta. Contas existentes vinculam o endereço autenticadas em Editar perfil. Não há mesclagem automática por nomes ou identificadores. Novas contas escolhem nome e identificador depois de confirmar e-mail. E-mails ficam apenas em tabela privada, fora do perfil público e dos contextos de IA.

Links contêm 32 bytes aleatórios, expiram em 15 minutos e têm consumo atômico único. A base guarda somente hash do token e do nonce de navegador. Fragmento da URL é limpo no cliente antes da confirmação. GET nunca consome o token; o usuário confirma por POST. Cookie HttpOnly, Secure, SameSite=Lax vincula o pedido ao navegador. Limites por e-mail e IP usam a base compartilhada. Respostas não expõem tokens ou o cadastro do endereço. Falha de envio remove o token.

Resend necessariamente recebe destinatário e conteúdo do e-mail. Não é criptografia de ponta a ponta nem proteção contra o operador do serviço. Tokens e endereço não entram nos eventos públicos de atividade. Não há envio real enquanto as duas variáveis obrigatórias não existirem.

## Perfil

Nome público, identificador e apresentação de até 500 caracteres. Validação e autorização no servidor; rascunho local; cancelar limpa o rascunho. Atualização e reserva dos identificadores acontecem em transação. Identificadores antigos permanecem reservados ao mesmo usuário e resolvem os links públicos anteriores. Eventos de auditoria guardam nomes dos campos alterados, sem seus valores. E-mail é editado separadamente mediante nova verificação.

## Validação e limites

Testes locais verificam expiração, consumo concorrente único, vínculo ao navegador e à conta, envio simulado, ausência de tokens no retorno, reserva de nomes e reversão transacional. Entrega real depende da configuração Resend e não foi comprovada nesta alteração. Não se trata de uma auditoria completa de autenticação.

## Alteração de 5 de novembro — cadastro tradicional

Login por usuário ou e-mail confirmado e senha. Perguntas secretas deixam de ser exigidas de novas contas; recuperação antiga continua disponível separadamente. E-mail e senha não entram no rascunho local. Cadastro e senha têm limite de tentativas por IP. Testes cobrem e-mail pendente versus confirmado, conflitos com nomes antigos e reversão de cadastro incompleto.


## Google — preparação necessária

Criar cliente OAuth Web no Google Cloud, configurar marca/consentimento, suporte e política de privacidade e cadastrar a origem HTTPS exata da Praça. A integração Google Identity Services pode usar Client ID público com ID token verificado no servidor (audience, issuer, expiração e sub estável). Não exige segredo de cliente nesse fluxo. Vincular contas existentes exige autenticação prévia; não mesclar somente por e-mail. Verificar domínio próprio e requisitos de publicação antes de liberar ao público. Não implementado nesta alteração.

## Próximos pontos do onboarding

Comprovar entrega real em desktop e celular, simplificar abertura do link no mesmo navegador, oferecer troca segura de senha no perfil e uma política de privacidade acessível antes de adicionar novos provedores de login.

## Onboarding e segurança — atualização de 5 de novembro

Cadastro, confirmação e formulário das cinco perguntas apresentam progresso com estados reais. O perfil reaproveita sua lista existente para mostrar a confirmação pendente, sem criar outro checklist.

O e-mail agora inclui um código aleatório de oito dígitos além do link. Ambos compartilham o mesmo registro de uso único e prazo de 15 minutos; a base guarda hashes, nunca o código. A confirmação por código mantém o vínculo ao navegador solicitante e, para vinculação, à conta autenticada. São permitidas cinco tentativas por pedido em uma janela de 15 minutos, além do limite por IP. Assim o usuário pode ler o código no aplicativo de e-mail e digitá-lo na página original. Links antigos sem código continuam válidos até expirar.

Em Editar perfil, Alterar senha exige a senha atual, valida a repetição e tamanho da nova senha, aplica limite de tentativas por usuário e rejeita origens externas. A alteração transacional revoga sessões e pedidos de e-mail anteriores do usuário, registra somente o evento e cria uma sessão nova no navegador atual. Uma alteração concorrente não pode revogar sessões nem gerar auditoria falsa. Senhas nunca entram no rascunho ou no evento. Contas criadas apenas por link não têm senha conhecida: continuam acessando por e-mail; definição inicial de senha é um fluxo futuro.

Validação: testes com envio simulado cobrem código, vínculo ao navegador/conta, uso único entre código e link, limite de tentativas, confirmação de senha atual, isolamento de contas, concorrência e reversão transacional. O envio real do novo e-mail será solicitado somente ao destinatário de teste autorizado. Sem acesso à caixa de entrada nem dispositivo físico, não se comprova entrega final nem abertura no celular.

## Recuperação de contas sem e-mail

Acesso e recuperação por e-mail nunca criam usuários. Ao confirmar um endereço sem vínculo, o servidor orienta entrar com usuário e senha ou recuperar pelas perguntas secretas. O cadastro tradicional continua sendo o único local de criação de conta. A página de acesso explicita essa diferença. Um link permite trocar para a conta original mesmo havendo sessão na conta vazia. Recuperação pelas perguntas encerra a sessão atual antes do novo login.

Contas vazias criadas pelo antigo fluxo automático são identificadas por nome/usuário gerados, perfil incompleto, perguntas vazias e ausência de publicações/comentários. Elas não redirecionam mais para onboarding ao confirmar um e-mail. Depois de entrar na conta original, o usuário pode confirmar o mesmo endereço em Editar perfil. O vínculo é transferido apenas desse placeholder vazio, após comprovação do e-mail e autenticação na conta original. A transação encerra as sessões do placeholder e o desativa. Contas reais não são mescladas nem transferidas por esse procedimento. Nenhuma conta de produção foi apagada para testar.
