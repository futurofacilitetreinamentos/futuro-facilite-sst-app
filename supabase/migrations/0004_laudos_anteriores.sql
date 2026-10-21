-- Futuro Facilite SST — laudos do ano anterior (de outra empresa) e medições aproveitadas
-- Execute no Supabase DEPOIS do 0003: SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez.

begin;

-- PDFs dos laudos anteriores; o arquivo fica no bucket privado "fotos" (pasta <condomínio>/anteriores/)
create table if not exists public.docs_anteriores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  tipo text not null default 'pgr' check (tipo in ('pgr','pcmso','ltcat','nr1','outro')),
  empresa text not null default '',
  responsavel text not null default '',
  registro text not null default '',
  data_emissao date,
  validade date,
  arquivo text,                  -- caminho no bucket "fotos"
  nome_arquivo text not null default '',
  observacoes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists docs_anteriores_condominio_idx on public.docs_anteriores (condominio_id);

-- Medições quantitativas tiradas dos laudos anteriores; ligadas a um risco do inventário,
-- entram no LTCAT novo (quando o risco não tem medição própria) citando a fonte.
create table if not exists public.medicoes_anteriores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  doc_id uuid references public.docs_anteriores(id) on delete set null,
  risco_id uuid references public.riscos(id) on delete set null,
  ghe_id uuid references public.ghes(id) on delete set null,
  funcao_id uuid references public.funcoes(id) on delete set null,
  agente text not null default '',
  tecnica text not null default '',
  equipamento text not null default '',
  data date,
  resultado text not null default '',
  limite text not null default '',
  unidade text not null default '',
  observacoes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists medicoes_anteriores_condominio_idx on public.medicoes_anteriores (condominio_id);

alter table public.docs_anteriores enable row level security;
alter table public.medicoes_anteriores enable row level security;

drop policy if exists "membros acessam" on public.docs_anteriores;
create policy "membros acessam" on public.docs_anteriores for all
  using (public.is_member()) with check (public.is_member());
drop policy if exists "membros acessam" on public.medicoes_anteriores;
create policy "membros acessam" on public.medicoes_anteriores for all
  using (public.is_member()) with check (public.is_member());

revoke all on public.docs_anteriores, public.medicoes_anteriores from anon;
grant select, insert, update, delete on public.docs_anteriores, public.medicoes_anteriores to authenticated;

commit;

notify pgrst, 'reload schema';
