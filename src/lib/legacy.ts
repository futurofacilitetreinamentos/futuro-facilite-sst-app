// Converte os dados do banco para o formato que os geradores de documentos
// (portados da V8) esperam: tudo em string e relações por nome.
import { useQuery } from '@tanstack/react-query'
import type { DocContext, LegacyInspection, LegacyProject } from '../reports/types'
import { must, supabase } from './supabase'
import { signedUrls } from './db'
import type {
  Agendamento, Condominio, DrpsResposta, Equipe, Funcao, Ghe, Inspecao, Risco, Setor,
} from './types'

const s = (v: unknown) => (v == null ? '' : String(v))

export interface CondoBundle {
  condo: Condominio
  setores: Setor[]
  funcoes: Funcao[]
  ghes: Ghe[]
  riscos: Risco[]
  agenda: Agendamento[]
  inspecoes: Inspecao[]
  drps: DrpsResposta[]
  equipe: Equipe[]
}

export async function fetchBundle(condoId: string): Promise<CondoBundle> {
  const by = <T>(table: string, order = 'created_at', ascending = true) =>
    supabase.from(table).select('*').eq('condominio_id', condoId).order(order, { ascending })
      .then((r) => must(r) as T[])
  const [condo, setores, funcoes, ghesRaw, riscos, agenda, inspecoes, drps, equipe] = await Promise.all([
    supabase.from('condominios').select('*').eq('id', condoId).single().then((r) => must(r) as Condominio),
    by<Setor>('setores'),
    by<Funcao>('funcoes'),
    supabase.from('ghes').select('*, ghe_funcoes(funcao_id)').eq('condominio_id', condoId).order('created_at')
      .then((r) => must(r) as (Omit<Ghe, 'funcao_ids'> & { ghe_funcoes: { funcao_id: string }[] })[]),
    by<Risco>('riscos'),
    by<Agendamento>('agendamentos', 'data', false),
    by<Inspecao>('inspecoes', 'created_at', false),
    by<DrpsResposta>('drps_respostas'),
    supabase.from('equipe').select('*').order('nome').then((r) => must(r) as Equipe[]),
  ])
  const ghes = ghesRaw.map(({ ghe_funcoes, ...g }) => ({ ...g, funcao_ids: ghe_funcoes.map((x) => x.funcao_id) }))
  return { condo, setores, funcoes, ghes, riscos, agenda, inspecoes, drps, equipe }
}

export function toLegacyProject(b: CondoBundle): LegacyProject {
  const { condo: c, equipe } = b
  const setorNome = (id: string | null) => b.setores.find((x) => x.id === id)?.nome ?? ''
  const funcaoNome = (id: string | null) => b.funcoes.find((x) => x.id === id)?.nome ?? ''
  const gheNome = (id: string | null) => b.ghes.find((x) => x.id === id)?.nome ?? ''
  const sst = equipe.find((m) => m.id === c.resp_sst_id)
  const med = equipe.find((m) => m.id === c.medico_id)
  const eng = equipe.find((m) => m.id === c.engenheiro_id)
  return {
    id: c.id,
    drpsToken: c.drps_token,
    salvoEm: new Date(c.updated_at).toLocaleString('pt-BR'),
    empresa: {
      razaoSocial: c.razao_social,
      nomeFantasia: c.nome_fantasia,
      cnpj: c.cnpj,
      cnae: c.cnae,
      grauRisco: c.grau_risco,
      numTrabalhadores: s(c.num_trabalhadores),
      endereco: c.endereco,
      responsavelEmpresa: c.responsavel_empresa,
      contatoEmpresa: c.contato_empresa,
      emailEmpresa: c.email_empresa,
      dataElaboracao: s(c.data_elaboracao),
      atividadeEmpresa: c.atividade_empresa,
      respSst: sst?.nome ?? '',
      funcaoRespSst: sst ? sst.funcao || 'Técnico de Segurança do Trabalho' : '',
      regSst: sst?.registro ?? '',
      respSstId: sst?.id ?? '',
      medicoTrabalho: med?.nome ?? '',
      crmMedico: med ? [med.registro, med.rqe].filter(Boolean).join(' / ') : '',
      medicoId: med?.id ?? '',
      engSeguranca: eng?.nome ?? '',
      creaEng: eng?.registro ?? '',
      engId: eng?.id ?? '',
    },
    setores: b.setores.map((x) => ({ nome: x.nome, ambiente: x.ambiente, descricao: x.descricao })),
    funcoes: b.funcoes.map((x) => ({
      nome: x.nome, setor: setorNome(x.setor_id), quantidade: s(x.quantidade), cbo: x.cbo, atividades: x.atividades,
    })),
    ghe: b.ghes.map((g) => ({
      nome: g.nome, setor: setorNome(g.setor_id), descricao: g.descricao,
      funcoes: g.funcao_ids.map(funcaoNome).filter(Boolean).join(', '),
    })),
    riscos: b.riscos.map((r) => ({
      ghe: gheNome(r.ghe_id), funcao: funcaoNome(r.funcao_id), grupo: r.grupo, perigo: r.perigo, fonte: r.fonte,
      dano: r.dano, controles: r.controles, prob: s(r.prob), sev: s(r.sev), acao: r.acao,
      responsavel: r.responsavel, prazo: s(r.prazo), status: r.status,
    })),
    agenda: b.agenda.map((a) => ({
      id: a.id, data: a.data, hora: s(a.hora).slice(0, 5), tecnico: a.tecnico, obs: a.obs, status: a.status,
    })),
  }
}

export function toLegacyInspection(i: Inspecao, c: Condominio, urls: Record<string, string>): LegacyInspection {
  const url = (p: string | null) => (p ? urls[p] ?? '' : '')
  return {
    id: i.id,
    numero: s(i.numero),
    condominioId: c.id,
    agendaId: s(i.agendamento_id),
    condominio: c.nome_fantasia || c.razao_social,
    cnpj: c.cnpj,
    endereco: c.endereco,
    sindica: c.responsavel_empresa,
    telefone: c.contato_empresa,
    emailCondominio: c.email_empresa,
    dataVisita: i.data_visita,
    tecnico: i.tecnico,
    objetivo: i.objetivo,
    totalEmpregados: i.total_empregados,
    proprios: i.proprios,
    terceirizados: i.terceirizados,
    funcoes: i.funcoes,
    jornadas: i.jornadas,
    conclusao: i.conclusao,
    recomendacoes: i.recomendacoes,
    assinaturaSindica: i.assinatura_sindica,
    assinaturaTecnico: i.assinatura_tecnico,
    fotoCapa: url(i.foto_capa),
    checklist: Object.fromEntries(
      Object.entries(i.checklist).map(([k, it]) => [k, { ...it, photos: it.photos.map(url).filter(Boolean) }]),
    ),
    salvoEm: new Date(i.updated_at).toLocaleString('pt-BR'),
  }
}

export async function buildDocContext(condoId: string): Promise<DocContext> {
  const b = await fetchBundle(condoId)
  const paths = b.inspecoes.flatMap((i) => [i.foto_capa, ...Object.values(i.checklist).flatMap((c) => c.photos)])
  const urls = await signedUrls(paths.filter(Boolean) as string[])
  return {
    project: toLegacyProject(b),
    inspections: b.inspecoes.map((i) => toLegacyInspection(i, b.condo, urls)),
    drps: b.drps.map((d) => ({
      funcao: d.funcao, setor: d.setor, ts: d.created_at,
      answers: Object.fromEntries(Object.entries(d.answers).map(([k, v]) => [Number(k), Number(v)])),
    })),
    equipe: b.equipe,
    assetsBase: new URL(import.meta.env.BASE_URL + 'docs-assets/', window.location.href).href,
  }
}

/** Contexto dos documentos do condomínio ativo (recarrega sempre que a tela abre). */
export function useDocContext(condoId: string | null | undefined) {
  return useQuery({
    queryKey: ['doc-context', condoId],
    enabled: Boolean(condoId),
    staleTime: 0,
    queryFn: () => buildDocContext(condoId!),
  })
}
