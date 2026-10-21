-- Futuro Facilite SST — campos novos para PGR / LTCAT / PCMSO (padrão de referência)
-- Execute no Supabase DEPOIS do 0001: SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez (colunas/tabelas/políticas só são criadas se faltarem).

begin;

-- ---------------------------------------------------------------------------
-- Condomínios: CEP, cidade/UF da linha de data e quem assina o LTCAT
-- ---------------------------------------------------------------------------
alter table public.condominios
  add column if not exists cep text not null default '',
  add column if not exists cidade_uf text not null default '',
  add column if not exists ltcat_rt text not null default 'engenheiro';

alter table public.condominios drop constraint if exists condominios_ltcat_rt_check;
alter table public.condominios add constraint condominios_ltcat_rt_check
  check (ltcat_rt in ('engenheiro','medico'));

-- ---------------------------------------------------------------------------
-- Funções: carga horária (ex.: "44h semanais (12x36)")
-- ---------------------------------------------------------------------------
alter table public.funcoes
  add column if not exists carga_horaria text not null default '';

-- ---------------------------------------------------------------------------
-- GHE: numeração, tipo de atividade, descrição do ambiente e parecer do LTCAT
-- (os pareceres são textos opcionais que substituem a conclusão automática)
-- ---------------------------------------------------------------------------
alter table public.ghes
  add column if not exists numero integer,
  add column if not exists tipo_atividade text not null default '',
  add column if not exists descricao_ambiente text not null default '',
  add column if not exists parecer_insalubridade text not null default '',
  add column if not exists parecer_periculosidade text not null default '',
  add column if not exists parecer_aposentadoria text not null default '',
  add column if not exists atividades_perigosas text not null default '';

-- ---------------------------------------------------------------------------
-- Riscos: grupo "Perigo", controles detalhados, plano de ação e dados do LTCAT
-- ---------------------------------------------------------------------------
alter table public.riscos drop constraint if exists riscos_grupo_check;
alter table public.riscos add constraint riscos_grupo_check
  check (grupo in ('Físico','Químico','Biológico','Ergonômico','Acidente','Psicossocial relacionado ao trabalho','Perigo'));

alter table public.riscos
  add column if not exists cod_esocial text not null default '',
  add column if not exists meio_propagacao text not null default '',
  add column if not exists tecnica_analise text not null default 'Qualitativa',
  add column if not exists nivel_exposicao text not null default '',
  add column if not exists controles_adm text not null default '',
  add column if not exists controles_epc text not null default '',
  add column if not exists controles_epi text not null default '',
  add column if not exists indicadores_saude text not null default '',
  add column if not exists prioridade text not null default '',
  add column if not exists recursos text not null default '',
  add column if not exists onde text not null default '',
  add column if not exists forma_afericao text not null default '',
  add column if not exists habitualidade text not null default '',
  add column if not exists epc_eficaz boolean,           -- null = não avaliado
  add column if not exists epi_eficaz boolean,           -- null = não avaliado
  add column if not exists nr15_anexo text not null default '',
  add column if not exists grau_insalubridade text not null default '',
  add column if not exists nr16_anexo text not null default '',
  add column if not exists anexo_iv_codigo text not null default '',
  add column if not exists aposentadoria_anos smallint,
  add column if not exists medicao jsonb;                -- {agente, tecnica, equipamento, data, resultado, limite, unidade}

alter table public.riscos drop constraint if exists riscos_prioridade_check;
alter table public.riscos add constraint riscos_prioridade_check
  check (prioridade in ('','A','B','C','D'));
alter table public.riscos drop constraint if exists riscos_aposentadoria_anos_check;
alter table public.riscos add constraint riscos_aposentadoria_anos_check
  check (aposentadoria_anos is null or aposentadoria_anos in (15,20,25));

-- ---------------------------------------------------------------------------
-- Controle de revisões dos documentos (tabela "Revisões" da 2ª página)
-- ---------------------------------------------------------------------------
create table if not exists public.doc_revisoes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  documento text not null check (documento in ('pgr','pcmso','ltcat','nr1')),
  numero text not null default '',
  data date,
  itens text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists doc_revisoes_condominio_idx on public.doc_revisoes (condominio_id);

-- ---------------------------------------------------------------------------
-- EPIs existentes e recomendados (PGR itens 9.1 e 9.2)
-- imagem = chave do catálogo em public/docs-assets/epi (ex.: 'luva', 'pff2') ou vazio
-- ---------------------------------------------------------------------------
create table if not exists public.epis (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  ghe_id uuid references public.ghes(id) on delete set null,
  funcao_id uuid references public.funcoes(id) on delete set null,
  nome text not null,
  ca text not null default '',
  validade_ca date,
  eficaz boolean,                                        -- null = não avaliado
  imagem text not null default '',
  status text not null default 'existente' check (status in ('existente','recomendado')),
  created_at timestamptz not null default now()
);
create index if not exists epis_condominio_idx on public.epis (condominio_id);

-- ---------------------------------------------------------------------------
-- Segurança (RLS) e permissões explícitas das tabelas novas, como no 0001
-- ---------------------------------------------------------------------------
alter table public.doc_revisoes enable row level security;
alter table public.epis enable row level security;

drop policy if exists "membros acessam" on public.doc_revisoes;
create policy "membros acessam" on public.doc_revisoes for all
  using (public.is_member()) with check (public.is_member());
drop policy if exists "membros acessam" on public.epis;
create policy "membros acessam" on public.epis for all
  using (public.is_member()) with check (public.is_member());

revoke all on public.doc_revisoes, public.epis from anon;
grant select, insert, update, delete on public.doc_revisoes, public.epis to authenticated;

commit;

-- Atualiza o cache da API para enxergar as colunas/tabelas novas imediatamente.
notify pgrst, 'reload schema';
