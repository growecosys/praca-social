# Praça Social no seu computador

Código da Praça Social a partir do commit `11767715ce7ac5f912c8704fdd2425a9fbfcb71b`, empacotado em 10 de novembro de 2026. Inclui Mural, perfis, Círculos, Histórias da Praça e Espaço Comum. O envio de G$ está em planejamento.

## Requisitos

Node.js 22.13 ou mais recente (recomendado Node.js 24) e npm. Em Windows, use o WSL2 com o Node instalado dentro do Linux.

## Iniciar

Extraia o ZIP. Abra um terminal na pasta `praca-social` e rode:

```bash
npm ci
node scripts/setup-local.mjs
npm run dev -- --host localhost
```

Abra http://localhost:5173. Se essa porta estiver ocupada, use o endereço mostrado no terminal. Use `Ctrl+C` para parar. Nos próximos usos, rode apenas `npm run dev -- --host localhost`. O script de configuração pode ser executado novamente para verificar as migrações.

A Praça usa Vinext e simula Cloudflare D1 (banco) e R2 (arquivos) localmente. Os dados ficam em `.wrangler/state/`. A instalação começa com um banco vazio e inclui os assets que fazem parte do código. Contas, publicações e uploads do site online não fazem parte desta cópia.

## Recursos com serviços externos

As funções que chamam IA precisam de uma configuração própria para `OPENAI_API_KEY`. O envio de e-mail depende de `RESEND_API_KEY`, `AUTH_EMAIL_FROM` e de `AUTH_EMAIL_ORIGIN` apontando para a origem HTTPS que recebe os links. Os valores são opcionais para iniciar o servidor e podem ser definidos em um `.env.local` que fica só no seu computador. Use credenciais próprias de desenvolvimento. As automações hospedadas do site não são executadas por este comando local.

## O que foi adaptado para esta cópia

O script local aplica as migrações D1 na ordem das dependências. Uma migração de limpeza de conta específica de produção foi excluída do pacote porque o banco local começa vazio. O código do site e seus arquivos de deploy no repositório original não foram alterados.
