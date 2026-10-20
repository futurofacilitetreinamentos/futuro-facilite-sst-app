-- Futuro Facilite SST — esquema inicial
-- Execute no Supabase: SQL Editor > New query > cole este arquivo > Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Usuários do sistema (perfil ligado ao auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null default '',
  cpf text not null default '',
  nascimento date,
  role text not null default 'tecnico' check (role in ('admin','tecnico')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
-- O papel é sempre 'tecnico'; um admin promove pelo app (ou SQL no primeiro acesso).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and ativo);
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and ativo and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Equipe técnica (responsáveis SST, médicos, engenheiros)
-- ---------------------------------------------------------------------------
create table public.equipe (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('sst','medico','engenheiro')),
  nome text not null,
  funcao text not null default '',
  registro text not null default '',
  rqe text not null default '',
  telefone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Condomínios (organizações atendidas)
-- ---------------------------------------------------------------------------
create table public.condominios (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null default '',
  cnpj text not null default '',
  cnae text not null default '',
  grau_risco text not null default '',
  num_trabalhadores integer,
  endereco text not null default '',
  responsavel_empresa text not null default '',
  contato_empresa text not null default '',
  email_empresa text not null default '',
  data_elaboracao date,
  atividade_empresa text not null default '',
  resp_sst_id uuid references public.equipe(id) on delete set null,
  medico_id uuid references public.equipe(id) on delete set null,
  engenheiro_id uuid references public.equipe(id) on delete set null,
  drps_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null,
  ambiente text not null default '',
  descricao text not null default '',
  created_at timestamptz not null default now()
);

create table public.funcoes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  setor_id uuid references public.setores(id) on delete set null,
  nome text not null,
  quantidade integer not null default 0,
  cbo text not null default '',
  atividades text not null default '',
  created_at timestamptz not null default now()
);

create table public.ghes (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  setor_id uuid references public.setores(id) on delete set null,
  nome text not null,
  descricao text not null default '',
  created_at timestamptz not null default now()
);

create table public.ghe_funcoes (
  ghe_id uuid not null references public.ghes(id) on delete cascade,
  funcao_id uuid not null references public.funcoes(id) on delete cascade,
  primary key (ghe_id, funcao_id)
);

create table public.riscos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  ghe_id uuid references public.ghes(id) on delete set null,
  funcao_id uuid references public.funcoes(id) on delete set null,
  grupo text not null check (grupo in ('Físico','Químico','Biológico','Ergonômico','Acidente','Psicossocial relacionado ao trabalho')),
  perigo text not null default '',
  fonte text not null default '',
  dano text not null default '',
  controles text not null default '',
  prob smallint not null check (prob between 1 and 5),
  sev smallint not null check (sev between 1 and 5),
  acao text not null default '',
  responsavel text not null default '',
  prazo date,
  status text not null default 'Pendente' check (status in ('Pendente','Em andamento','Concluído')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Agenda e inspeções
-- ---------------------------------------------------------------------------
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  data date not null,
  hora time,
  tecnico text not null default '',
  obs text not null default '',
  status text not null default 'agendada' check (status in ('agendada','realizada','cancelada')),
  created_at timestamptz not null default now()
);

create table public.numeracao_inspecao (
  ano integer primary key,
  ultimo integer not null default 0
);

create table public.inspecoes (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  data_visita date not null default current_date,
  tecnico text not null default '',
  objetivo text not null default '',
  total_empregados text not null default '',
  proprios text not null default '',
  terceirizados text not null default '',
  funcoes text not null default '',
  jornadas text not null default '',
  conclusao text not null default '',
  recomendacoes text not null default '',
  assinatura_sindica text not null default '',
  assinatura_tecnico text not null default '',
  foto_capa text,              -- caminho no bucket "fotos"
  checklist jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Número SST-AAAA-NNNN atribuído só quando a inspeção é salva (sem lacunas por rascunho).
create function public.assign_inspecao_numero() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from new.data_visita)::integer;
  n integer;
begin
  if new.numero is null then
    insert into numeracao_inspecao (ano, ultimo) values (y, 1)
      on conflict (ano) do update set ultimo = numeracao_inspecao.ultimo + 1
      returning ultimo into n;
    -- pula números já usados (ex.: relatórios importados da V8)
    while exists (select 1 from inspecoes where numero = 'SST-' || y || '-' || lpad(n::text, 4, '0')) loop
      update numeracao_inspecao set ultimo = ultimo + 1 where ano = y returning ultimo into n;
    end loop;
    new.numero := 'SST-' || y || '-' || lpad(n::text, 4, '0');
  end if;
  return new;
end $$;

create trigger inspecao_numero before insert on public.inspecoes
  for each row execute function public.assign_inspecao_numero();

-- Ao salvar uma inspeção ligada a um agendamento, marca-o como realizado.
create function public.mark_agenda_done() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.agendamento_id is not null then
    update agendamentos set status = 'realizada' where id = new.agendamento_id;
  end if;
  return new;
end $$;

create trigger inspecao_agenda after insert or update of agendamento_id on public.inspecoes
  for each row execute function public.mark_agenda_done();

create function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

create trigger condominios_touch before update on public.condominios
  for each row execute function public.touch_updated_at();
create trigger inspecoes_touch before update on public.inspecoes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- DRPS (questionário psicossocial NR-1) — respostas anônimas dos trabalhadores
-- ---------------------------------------------------------------------------
create table public.drps_respostas (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  funcao text not null default '',
  setor text not null default '',
  answers jsonb not null,      -- {"1": 1..5, ..., "50": 1..5}
  created_at timestamptz not null default now()
);

-- Formulário público: devolve só o nome do condomínio e as listas de setores/funções.
create function public.drps_form_info(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', coalesce(nullif(c.nome_fantasia, ''), c.razao_social),
    'setores', coalesce((select jsonb_agg(s.nome order by s.nome) from setores s where s.condominio_id = c.id), '[]'::jsonb),
    'funcoes', coalesce((select jsonb_agg(f.nome order by f.nome) from funcoes f where f.condominio_id = c.id), '[]'::jsonb)
  )
  from condominios c where c.drps_token = p_token;
$$;

create function public.submit_drps(p_token text, p_funcao text, p_setor text, p_answers jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  k integer;
  v integer;
begin
  select id into cid from condominios where drps_token = p_token;
  if cid is null then
    raise exception 'Link inválido';
  end if;
  for k in 1..50 loop
    v := (p_answers->>k::text)::integer;
    if v is null or v < 1 or v > 5 then
      raise exception 'Resposta % inválida', k;
    end if;
  end loop;
  insert into drps_respostas (condominio_id, funcao, setor, answers)
  values (cid, left(coalesce(p_funcao, ''), 120), left(coalesce(p_setor, ''), 120), p_answers);
  return true;
end $$;

revoke all on function public.drps_form_info(text) from public;
revoke all on function public.submit_drps(text, text, text, jsonb) from public;
grant execute on function public.drps_form_info(text) to anon, authenticated;
grant execute on function public.submit_drps(text, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Segurança (RLS): só usuários ativos da equipe acessam os dados
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.equipe enable row level security;
alter table public.condominios enable row level security;
alter table public.setores enable row level security;
alter table public.funcoes enable row level security;
alter table public.ghes enable row level security;
alter table public.ghe_funcoes enable row level security;
alter table public.riscos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.inspecoes enable row level security;
alter table public.numeracao_inspecao enable row level security;
alter table public.drps_respostas enable row level security;

create policy "membros leem perfis" on public.profiles for select using (public.is_member());
create policy "admin altera perfis" on public.profiles for update using (public.is_admin());
create policy "usuario altera o proprio nome" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid())
              and ativo = (select ativo from public.profiles where id = auth.uid()));
create policy "admin exclui perfis" on public.profiles for delete using (public.is_admin() and id <> auth.uid());

do $$
declare t text;
begin
  foreach t in array array['equipe','condominios','setores','funcoes','ghes','ghe_funcoes','riscos','agendamentos','inspecoes','drps_respostas'] loop
    execute format('create policy "membros acessam" on public.%I for all using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Permissões explícitas (o projeto não expõe tabelas novas automaticamente).
-- Visitantes sem login (anon) não acessam tabela nenhuma: só as duas funções
-- do formulário DRPS liberadas acima. Usuários logados passam pelas regras RLS.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.profiles, public.equipe, public.condominios, public.setores, public.funcoes, public.ghes,
  public.ghe_funcoes, public.riscos, public.agendamentos, public.inspecoes, public.drps_respostas
  to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Armazenamento de fotos das inspeções (bucket privado)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false)
  on conflict (id) do nothing;

create policy "membros leem fotos" on storage.objects for select
  using (bucket_id = 'fotos' and public.is_member());
create policy "membros enviam fotos" on storage.objects for insert
  with check (bucket_id = 'fotos' and public.is_member());
create policy "membros apagam fotos" on storage.objects for delete
  using (bucket_id = 'fotos' and public.is_member());
