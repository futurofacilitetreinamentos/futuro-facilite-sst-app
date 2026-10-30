-- Futuro Facilite SST — área comercial: dados da empresa, tabela de serviços, orçamentos e contratos
-- Execute no Supabase DEPOIS do 0005: SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez.

begin;

-- CPF do síndico (qualificação do CONTRATANTE no contrato)
alter table public.condominios
  add column if not exists sindico_cpf text not null default '';

-- Dados da CONTRATADA e parâmetros comerciais (uma única linha, id = 1)
create table if not exists public.config_empresa (
  id integer primary key default 1 check (id = 1),
  razao_social text not null default 'FUTURO FACILITE PRESTAÇÃO DE SERVIÇO E APOIO LTDA',
  nome_fantasia text not null default 'Futuro Facilite Treinamentos',
  cnpj text not null default '57.717.005/0001-57',
  endereco text not null default 'QS 401, Conjunto G, Lote 06/07, Sala 303, Samambaia Norte, Brasília/DF',
  cep text not null default '72.319-527',
  cidade_uf text not null default 'Brasília/DF',
  representante_nome text not null default '',
  representante_rg text not null default '',
  representante_cpf text not null default '',
  email text not null default 'futurofacilite@gmail.com',
  telefone text not null default '(61) 98585-0519',
  acrescimo_prazo_pct numeric(6,2) not null default 20,
  parcelas_prazo integer not null default 12,
  validade_proposta_dias integer not null default 30,
  dia_vencimento integer not null default 10,
  vigencia_meses integer not null default 12,
  foro text not null default 'Circunscrição Judiciária de Brasília/DF',
  condicoes_proposta jsonb,      -- null = texto padrão do sistema
  clausulas_contrato jsonb,      -- null = cláusulas padrão do sistema
  updated_at timestamptz not null default now()
);
insert into public.config_empresa (id) values (1) on conflict (id) do nothing;

-- Tabela de serviços com preço padrão
create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao_proposta text not null default '',   -- linha em "Serviços inclusos" da proposta
  descricao_contrato text not null default '',   -- item do objeto (Cláusula Primeira) do contrato
  unidade text not null default 'fixo' check (unidade in ('fixo','por_colaborador')),
  preco numeric(12,2) not null default 0,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Numeração dos documentos comerciais (PROP-AAAA-NNNN / CT-AAAA-NNNN)
create table if not exists public.numeracao_docs (
  tipo text not null,
  ano integer not null,
  ultimo integer not null default 0,
  primary key (tipo, ano)
);

create or replace function public.proximo_numero(p_tipo text, p_prefixo text, p_data date) returns text
language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from coalesce(p_data, current_date))::integer;
  n integer;
begin
  insert into numeracao_docs (tipo, ano, ultimo) values (p_tipo, y, 1)
    on conflict (tipo, ano) do update set ultimo = numeracao_docs.ultimo + 1
    returning ultimo into n;
  return p_prefixo || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;

-- Orçamentos (propostas comerciais)
create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  numero text unique,
  data date not null default current_date,
  validade date,
  colaboradores integer not null default 0,
  -- [{servico_id, nome, descricao_proposta, descricao_contrato, unidade, quantidade, preco_unit, total}]
  itens jsonb not null default '[]'::jsonb,
  desconto numeric(12,2) not null default 0,
  valor_avista numeric(12,2) not null default 0,
  acrescimo_pct numeric(6,2) not null default 20,
  parcelas integer not null default 12,
  valor_prazo numeric(12,2) not null default 0,
  forma_escolhida text check (forma_escolhida in ('avista','prazo')),
  condicoes jsonb,               -- null = condições da configuração
  observacoes text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aprovada','recusada')),
  enviada_em date,
  aprovada_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists propostas_condominio_idx on public.propostas (condominio_id);

create or replace function public.numerar_proposta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.numero is null then new.numero := proximo_numero('proposta', 'PROP', new.data); end if;
  return new;
end $$;
drop trigger if exists proposta_numero on public.propostas;
create trigger proposta_numero before insert on public.propostas for each row execute function public.numerar_proposta();

-- Contratos
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  proposta_id uuid references public.propostas(id) on delete set null,
  numero text unique,
  data_assinatura date,
  vigencia_meses integer not null default 12,
  colaboradores integer not null default 0,
  servicos jsonb not null default '[]'::jsonb,   -- itens do objeto (texto)
  valor_total numeric(12,2) not null default 0,
  parcelas integer not null default 1,
  valor_parcela numeric(12,2) not null default 0,
  dia_vencimento integer not null default 10,
  clausulas jsonb,               -- cópia das cláusulas usadas (null = as da configuração)
  status text not null default 'rascunho' check (status in ('rascunho','emitido','assinado','encerrado')),
  observacoes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contratos_condominio_idx on public.contratos (condominio_id);

create or replace function public.numerar_contrato() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.numero is null then new.numero := proximo_numero('contrato', 'CT', coalesce(new.data_assinatura, current_date)); end if;
  return new;
end $$;
drop trigger if exists contrato_numero on public.contratos;
create trigger contrato_numero before insert on public.contratos for each row execute function public.numerar_contrato();

-- Segurança: só a equipe acessa; a tabela de numeração só é usada pelas funções acima
alter table public.config_empresa enable row level security;
alter table public.servicos enable row level security;
alter table public.propostas enable row level security;
alter table public.contratos enable row level security;
alter table public.numeracao_docs enable row level security;

drop policy if exists "membros leem" on public.config_empresa;
create policy "membros leem" on public.config_empresa for select using (public.is_member());
drop policy if exists "admin altera" on public.config_empresa;
create policy "admin altera" on public.config_empresa for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "membros leem" on public.servicos;
create policy "membros leem" on public.servicos for select using (public.is_member());
drop policy if exists "admin altera" on public.servicos;
create policy "admin altera" on public.servicos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "membros acessam" on public.propostas;
create policy "membros acessam" on public.propostas for all using (public.is_member()) with check (public.is_member());
drop policy if exists "membros acessam" on public.contratos;
create policy "membros acessam" on public.contratos for all using (public.is_member()) with check (public.is_member());

revoke all on public.config_empresa, public.servicos, public.propostas, public.contratos, public.numeracao_docs from anon;
grant select, update on public.config_empresa to authenticated;
grant select, insert, update, delete on public.servicos, public.propostas, public.contratos to authenticated;
revoke all on function public.proximo_numero(text, text, date) from public, anon;

-- Serviços iniciais (a partir da proposta modelo de 2026); só entram se a tabela estiver vazia
insert into public.servicos (nome, descricao_proposta, descricao_contrato, unidade, preco, ordem)
select * from (values
  ('Avaliação de Riscos Psicossociais – NR-1', 'Avaliação de Riscos Psicossociais – NR-1', 'Avaliação de Riscos Psicossociais, quando exigida pela legislação vigente', 'por_colaborador', 52.50, 1),
  ('PGR, PCMSO e LTCAT', 'PGR – Programa de Gerenciamento de Riscos; PCMSO – Programa de Controle Médico de Saúde Ocupacional; LTCAT – Laudo Técnico das Condições Ambientais do Trabalho', 'Elaboração e atualização do Programa de Gerenciamento de Riscos – PGR; Elaboração e atualização do Programa de Controle Médico de Saúde Ocupacional – PCMSO; Elaboração e atualização do Laudo Técnico das Condições Ambientais do Trabalho – LTCAT', 'fixo', 1000.00, 2),
  ('Envio das informações de SST ao eSocial', 'Envio das informações obrigatórias de SST ao eSocial', 'Envio dos eventos de SST ao eSocial, quando aplicáveis', 'fixo', 0, 3),
  ('Gestão dos exames ocupacionais periódicos', 'Gestão dos exames ocupacionais periódicos', 'Gestão dos exames ocupacionais periódicos para até {{colaboradores_extenso}} colaboradores ativos', 'por_colaborador', 0, 4),
  ('Suporte técnico', 'Suporte técnico para esclarecimentos relacionados aos documentos emitidos', 'Esclarecimentos técnicos relacionados aos documentos emitidos durante a vigência contratual', 'fixo', 0, 5)
) as v(nome, descricao_proposta, descricao_contrato, unidade, preco, ordem)
where not exists (select 1 from public.servicos);

commit;

notify pgrst, 'reload schema';
