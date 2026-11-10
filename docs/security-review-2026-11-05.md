# Praça — revisão de recuperação e credenciais

Escopo: revisão de código, não auditoria completa da infraestrutura ou pentest. Nenhuma credencial real nem resposta de usuário foi consultada.

## Estado observado

- Senhas e respostas: PBKDF2-HMAC-SHA256, 100.000 iterações, salt aleatório de 16 bytes por segredo. Hash unidirecional, não criptografia reversível.
- Sessões: token aleatório de 32 bytes; apenas SHA-256 do token na base. Cookie HttpOnly, Secure e SameSite=Lax.
- Fluxo de recuperação não chama a API de IA. Auditoria registra apenas usuário, ação e horário; não grava respostas nem senhas.
- Proteções anteriores: exigia duas respostas e tinha contador de erros sujeito a concorrência; perguntas cadastradas eram reveladas na consulta; sessões anteriores continuavam válidas.

## Alterações

Botão de recuperação sempre visível na entrada. Seleção de uma das perguntas cadastradas, resposta e confirmação da nova chave. Catálogo de perguntas público e genérico, sem retornar a escolha de cada conta. Reserva atômica de até cinco tentativas por conta em uma janela de 30 minutos. Confirmação da chave no servidor. Validação da origem, limites de entrada, respostas sem cache. Troca da senha, revogação das sessões e evento de auditoria em lote transacional. Novo login obrigatório. Segredos fora de autosave e tradução.

## Limites e prioridades

Uma resposta secreta é mais fraca que duas e não é um fator independente. Atendido o fluxo solicitado, mas não deve ser apresentado como recuperação de alta segurança. Limite por conta não substitui proteção de borda/IP contra abuso distribuído ou negação de serviço.

O custo PBKDF2 atual permanece inferior à recomendação OWASP de 600.000 iterações para SHA-256; o runtime Workerd possui histórico de limite de 100.000. Não houve aumento cego que pudesse interromper contas existentes. Planejar migração versionada de KDF e validar no runtime de produção.

Hash reduz exposição de credenciais na base, mas não torna respostas fáceis resistentes a adivinhação. Aplicação recebe valores em memória no processo de verificação. Não há criptografia de ponta a ponta nem garantia de inacessibilidade ao operador ou provedor. Dados públicos de perfil/posts continuam públicos; metadados de atividade são armazenados.

Prioridades recomendadas: passkeys; códigos aleatórios de recuperação de uso único guardados pelo usuário; proteção de borda; revisão de acesso administrativo; para dados privados, criptografia no cliente com chaves sob controle do usuário e modelo de recuperação específico. A infraestrutura e distribuição do cliente continuam parte da confiança.

Referências: OWASP Forgot Password, Password Storage e Cryptographic Storage Cheat Sheets; cloudflare/workerd issue 1346.
