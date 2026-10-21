-- Futuro Facilite SST — quem assina cada documento
-- Execute no Supabase DEPOIS do 0002: SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado mais de uma vez.
--
-- equipe.padrao: documentos que o profissional assina por padrão
--   ('pgr', 'pgr_aux', 'inspecao', 'nr1', 'pcmso', 'ltcat').
-- condominios.*_id: escolha específica do condomínio; vazio = usa o padrão da equipe.
--   resp_sst_id   = PGR (responsável)        [já existia]
--   aux_sst_id    = PGR (auxiliou na elaboração)
--   inspecao_rt_id = relatório de inspeção
--   nr1_rt_id     = NR-1 / DRPS
--   medico_id     = PCMSO                     [já existia]
--   ltcat_rt_id   = LTCAT (médico ou engenheiro)

alter table public.equipe
  add column if not exists padrao text[] not null default '{}';

alter table public.condominios
  add column if not exists aux_sst_id uuid references public.equipe(id) on delete set null,
  add column if not exists inspecao_rt_id uuid references public.equipe(id) on delete set null,
  add column if not exists nr1_rt_id uuid references public.equipe(id) on delete set null,
  add column if not exists ltcat_rt_id uuid references public.equipe(id) on delete set null;

-- Atualiza o cache da API para enxergar as colunas novas imediatamente.
notify pgrst, 'reload schema';
