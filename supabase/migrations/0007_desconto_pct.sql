-- Futuro Facilite SST — desconto percentual no orçamento, somado ao desconto em reais
-- Execute no Supabase DEPOIS do 0006: SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez.

begin;

alter table public.propostas
  add column if not exists desconto_pct numeric(6,2) not null default 0;

commit;
