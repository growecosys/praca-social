# Círculos: organização e acordos

A página usa abas por URL: missão, contribuições, acordos, recursos, conversa, pessoas e gestão. Convites e gestão de participantes ficam em Pessoas. Somente o responsável pode transferir a gestão, remover participantes ou excluir/restaurar o círculo. Excluir marca `deleted_at`; os dados permanecem recuperáveis pelo responsável em Conexões → Círculos. APIs, páginas e listas bloqueiam os círculos excluídos.

A conversa começa fechada e é aberta/pausada pelo responsável. Membros ativos podem consultar o histórico mesmo com a conversa pausada. Círculos arquivados não recebem mensagens. O componente continua com polling e notificações agrupadas por círculo; o sino direciona à aba Conversa.

## Acordos

Adaptado do Grow · Acordos de trabalho, sem copiar registros ou valores reais. Registros compartilhados ficam no D1 da Praça, separados por círculo e ciclo.

- Ciclos têm nome, objetivo, início, fim e estado. Somente o responsável cria/encerra/reabre.
- Qualquer membro ativo pode propor trabalho com responsável, papel, escopo, critérios, prazo, valor em BRL e condições. Propostas são editáveis por autor ou responsável.
- O responsável aprova; a pessoa que entrega confirma sua participação e registra evidência; a pessoa indicada para o aceite aceita ou devolve para ajustes.
- Escopo e valor ficam preservados após aprovação. O responsável pode reatribuir acordos em execução. Trocar quem entrega reinicia sua confirmação e entrega.
- Cancelamentos preservam o registro; acordos aceitos não podem ser cancelados.
- Recursos previstos não entram no caixa. Somente o responsável confirma disponibilidade e autorização de uso.
- Pagamentos são declarações manuais de transferências já realizadas. Nenhuma transferência, assinatura ou integração bancária é executada.
- Um pagamento exige acordo aceito e recurso confirmado no mesmo círculo/ciclo. O INSERT verifica saldos, titularidade e participação no mesmo comando SQL, impedindo gasto acima do recurso ou do acordo em requisições concorrentes. Chave idempotente evita lançamentos duplicados.
- Correções de pagamentos usam estorno com motivo; preservam o lançamento e repõem os saldos. Recursos podem ser corrigidos sem reduzir seu total abaixo dos pagamentos vigentes.
- Ciclos encerrados bloqueiam novas movimentações. Seu fechamento exige resolver compromissos em execução e saldos a pagar. Propostas sem aprovação não constituem dívida.
- Exportação JSON inclui todos os ciclos, acordos, recursos e pagamentos daquele círculo, disponível apenas a membros ativos. Importação não foi adicionada para evitar substituir registros compartilhados.

## Validação

Testes de autorização, isolamento entre círculos, consentimento e aceite, centavos inteiros, fonte não confirmada, pagamentos parciais, duplicação/concorrência, limite de caixa, estornos, ciclos encerrados e exclusão/pausa do chat. Migração 0030 é aditiva e não reescreve histórico aplicado.
