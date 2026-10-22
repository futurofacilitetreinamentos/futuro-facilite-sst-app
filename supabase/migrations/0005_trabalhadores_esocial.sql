-- Futuro Facilite SST — trabalhadores, ASOs e treinamentos (base para os eventos S-2240 e S-2220)
-- Execute no Supabase DEPOIS do 0004: SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez.

begin;

-- Profissionais: CPF e UF do conselho entram no eSocial (responsável pelos registros / médico do ASO)
alter table public.equipe
  add column if not exists cpf text not null default '',
  add column if not exists uf_conselho text not null default '';

-- Trabalhadores do condomínio
create table if not exists public.trabalhadores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  funcao_id uuid references public.funcoes(id) on delete set null,
  nome text not null,
  cpf text not null default '',            -- só dígitos
  matricula text not null default '',
  categoria text not null default '101',   -- eSocial tabela 01 (101 = empregado geral)
  sexo text not null default '' check (sexo in ('', 'M', 'F')),
  data_nascimento date,
  data_admissao date,
  data_demissao date,                      -- preenchida = desligado
  observacoes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists trabalhadores_condominio_idx on public.trabalhadores (condominio_id);
create unique index if not exists trabalhadores_cpf_unico on public.trabalhadores (condominio_id, cpf) where cpf <> '';

-- ASOs realizados (evento S-2220)
create table if not exists public.asos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  trabalhador_id uuid not null references public.trabalhadores(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('admissional','periodico','retorno','mudanca_risco','demissional','monitoracao')),
  resultado text not null default 'apto' check (resultado in ('apto','inapto')),
  medico_id uuid references public.equipe(id) on delete set null,
  medico_nome text not null default '',
  medico_crm text not null default '',
  medico_uf text not null default '',
  -- [{codigo, nome, data, ordem: 'referencial'|'sequencial', resultado: 'normal'|'alterado'|'estavel'|'agravamento'|''}]
  exames jsonb not null default '[]'::jsonb,
  arquivo text,                            -- PDF do ASO no bucket "fotos"
  observacoes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists asos_condominio_idx on public.asos (condominio_id);
create index if not exists asos_trabalhador_idx on public.asos (trabalhador_id);

-- Treinamentos de NR por trabalhador
create table if not exists public.treinamentos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  trabalhador_id uuid not null references public.trabalhadores(id) on delete cascade,
  nr text not null default '',             -- ex.: 'NR-06', 'NR-35'
  titulo text not null default '',
  data date,
  validade date,
  carga_horaria text not null default '',
  instrutor text not null default '',
  arquivo text,                            -- certificado no bucket "fotos"
  observacoes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists treinamentos_condominio_idx on public.treinamentos (condominio_id);

alter table public.trabalhadores enable row level security;
alter table public.asos enable row level security;
alter table public.treinamentos enable row level security;

drop policy if exists "membros acessam" on public.trabalhadores;
create policy "membros acessam" on public.trabalhadores for all using (public.is_member()) with check (public.is_member());
drop policy if exists "membros acessam" on public.asos;
create policy "membros acessam" on public.asos for all using (public.is_member()) with check (public.is_member());
drop policy if exists "membros acessam" on public.treinamentos;
create policy "membros acessam" on public.treinamentos for all using (public.is_member()) with check (public.is_member());

revoke all on public.trabalhadores, public.asos, public.treinamentos from anon;
grant select, insert, update, delete on public.trabalhadores, public.asos, public.treinamentos to authenticated;

commit;

notify pgrst, 'reload schema';
