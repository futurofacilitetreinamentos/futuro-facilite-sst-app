# Futuro Facilite SST — contexto para agentes de IA

Sistema da Futuro Facilite (empresa de Segurança e Saúde no Trabalho, Brasília/DF) que
automatiza todo o atendimento a **condomínios**: cadastro → orçamento → contrato →
visita/inspeção → laudos (PGR, DRPS/NR-1, PCMSO, LTCAT) → trabalhadores, ASOs,
treinamentos → envio ao eSocial. A ideia central: o usuário só lança os dados atuais e o
sistema gera os documentos prontos, sem edição manual.

Responda e escreva textos de tela em **português do Brasil**.

## Regras de negócio que não devem ser quebradas

- **Escopo exclusivo: condomínios.** Não generalizar telas, textos, bibliotecas de
  funções/riscos ou CNAE para outros ramos.
- **Quem assina cada documento** (`src/lib/signatarios.ts`): por condomínio pode-se
  escolher o signatário de PGR, PGR-auxiliar, inspeção, NR-1, PCMSO e LTCAT; sem escolha,
  vale o padrão marcado na Equipe técnica (`equipe.padrao`). Padrões atuais: técnico de
  segurança responsável por PGR/inspeção/NR-1, técnica auxiliar no PGR, médico do
  trabalho em PCMSO/LTCAT. Os nomes ficam no banco, não no código.
- **Padrão dos laudos:** PGR, PCMSO, LTCAT e NR-1 seguem o padrão de referência "Evolue"
  (estrutura, tabelas e textos em `src/reports/*-texts.ts`, `evolue.ts`), mantendo a capa
  própria da Futuro Facilite.
- **eSocial** (`src/lib/esocial/`): leiaute S-1.3 (NT 07/2026). Gera XML **não assinado**
  de S-2240 e S-2220 e a planilha; validado contra os XSDs oficiais. Tabelas 24 e 27
  embutidas em `tabelas.ts`. O S-2240 exige CPF do responsável pelos registros ambientais
  (signatário do LTCAT) cadastrado na Equipe.
- **Comercial:** orçamento com preços editáveis por orçamento (variam por condomínio),
  valor à vista e a prazo (acréscimo % configurável, padrão 20%, 1 entrada + 11). Ao
  aprovar escolhe-se a forma de pagamento e gera-se o contrato. Textos padrão em
  `src/reports/comercial-texts.ts`; dados da empresa, serviços, condições e cláusulas são
  editáveis em Configurações (tabelas `config_empresa` e `servicos`).
- **Etapas:** nenhum módulo é bloqueado por etapa; a tela Atendimento só sugere a
  próxima ação.

## Stack

- Vite + React 19 + TypeScript strict (`noUnusedLocals`, `verbatimModuleSyntax`),
  react-router (HashRouter), @tanstack/react-query, lucide-react (versão fixada),
  fonte Plus Jakarta Sans.
- Supabase (Postgres + Auth PKCE + Storage bucket privado `fotos`).
- Documentos: HTML gerado por `DocBuilder` (`src/reports/layout.ts`) e paginado com
  Paged.js (`src/reports/paginate.ts`, carregado sob demanda). Páginas nomeadas: capa,
  pretexto, paisagem, corpo. CSS de cada documento importado com `?raw`.
- `src/lib/legacy.ts` converte as linhas do banco no formato que os geradores de
  documento esperam (`buildDocContext`).

## Banco de dados

- Migrações em `supabase/migrations/NNNN_nome.sql`, numeradas em sequência. **Não há
  CLI**: o usuário cola o SQL no SQL Editor do Supabase. Escreva migrações idempotentes
  (`if not exists`, `drop policy if exists`).
- "Automatically expose new tables" está **desligado**: toda tabela nova precisa de
  `grant` explícito para `authenticated`, `revoke` de `anon`, RLS ligada e políticas
  com `public.is_member()` / `public.is_admin()`.
- Tabelas filhas do condomínio usam `condominio_id ... on delete cascade` e são lidas
  por `useChildren('<tabela>', condoId)` em `src/lib/db.ts` (adicione a tabela ao tipo
  `ChildTable`). Tipos em `src/lib/types.ts`.
- Edge function `supabase/functions/admin-users` está escrita mas ainda não publicada.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173 (login fica salvo por porta)
npm run build    # tsc -b && vite build — precisa passar antes de commitar
```

Variáveis em `.env.local` (não versionado): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`.

## Publicação

`git push` na `main` dispara `.github/workflows/deploy.yml` e publica no GitHub Pages:
https://futurofacilitetreinamentos.github.io/futuro-facilite-sst-app/
As variáveis do Supabase do build ficam em Settings → Variables do repositório.

## Cuidados

- O repositório é **público**: nunca commitar `.env.local`, senhas, nem CPF/RG de pessoas
  reais (equipe, síndicos, representante legal). Esses dados são digitados nas telas e
  ficam só no banco.
- Contas de usuário são criadas pelo administrador no painel do Supabase.
- Para testar com dados, crie um condomínio de teste (CNPJ válido de teste:
  11.222.333/0001-81) e apague-o ao final; a exclusão remove os dados ligados.
- Mantenha o estilo do código existente: componentes de `src/components/ui`, tokens de
  `src/index.css`, comentários curtos em português.
