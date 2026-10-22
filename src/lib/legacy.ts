// Converte os dados do banco para o formato que os geradores de documentos
// (portados da V8) esperam: tudo em string e relações por nome.
import { useQuery } from '@tanstack/react-query'
import type { DocContext, LegacyInspection, LegacyMedicao, LegacyProject } from '../reports/types'
import { must, supabase } from './supabase'
import { signedUrls } from './db'
import { signatario } from './signatarios'
import type {
  Agendamento, Condominio, DocAnterior, DocRevisao, MedicaoAnterior, Trabalhador, DrpsResposta, Epi, Equipe, Funcao, Ghe, Inspecao, Medicao, Risco, Setor,
} from './types'

const s = (v: unknown) => (v == null ? '' : String(v))
const bool = (v: unknown) => (typeof v === 'boolean' ? v : null)
const int = (v: unknown) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.trunc(Number(v)))

function medicao(m: Medicao | null | undefined): LegacyMedicao | null {
  if (!m || typeof m !== 'object') return null
  const out: LegacyMedicao = {
    agente: s(m.agente), tecnica: s(m.tecnica), equipamento: s(m.equipamento), data: s(m.data).slice(0, 10),
    resultado: s(m.resultado), limite: s(m.limite), unidade: s(m.unidade),
  }
  return Object.values(out).some(Boolean) ? out : null
}

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
  revisoes: DocRevisao[]
  epis: Epi[]
  docsAnteriores: DocAnterior[]
  medicoesAnteriores: MedicaoAnterior[]
  trabalhadores: Trabalhador[]
}

/** Medição aproveitada de laudo anterior, com a fonte para citar no documento. */
function medicaoAnterior(m: MedicaoAnterior, docs: DocAnterior[]): LegacyMedicao {
  const doc = docs.find((d) => d.id === m.doc_id)
  const quando = doc?.data_emissao ? ` de ${doc.data_emissao.slice(8, 10)}/${doc.data_emissao.slice(5, 7)}/${doc.data_emissao.slice(0, 4)}` : ''
  const fonte = doc ? `${doc.empresa || 'laudo anterior'}${doc.tipo ? `, ${doc.tipo.toUpperCase()}` : ''}${quando}` : 'laudo anterior'
  return {
    agente: m.agente, tecnica: m.tecnica, equipamento: m.equipamento, data: s(m.data).slice(0, 10),
    resultado: m.resultado, limite: m.limite, unidade: m.unidade, fonte,
  }
}

export async function fetchBundle(condoId: string): Promise<CondoBundle> {
  const by = <T>(table: string, order = 'created_at', ascending = true) =>
    supabase.from(table).select('*').eq('condominio_id', condoId).order(order, { ascending })
      .then((r) => must(r) as T[])
  // Tabelas do 0002: se a migração ainda não foi aplicada, os documentos saem sem elas.
  const optional = <T>(table: string) =>
    supabase.from(table).select('*').eq('condominio_id', condoId).order('created_at').then((r) => {
      if (r.error) { console.warn(`Tabela ${table} indisponível (migrações 0002/0004 aplicadas?):`, r.error.message); return [] as T[] }
      return (r.data ?? []) as T[]
    })
  const [condo, setores, funcoes, ghesRaw, riscos, agenda, inspecoes, drps, equipe, revisoes, epis, docsAnteriores, medicoesAnteriores, trabalhadores] = await Promise.all([
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
    optional<DocRevisao>('doc_revisoes'),
    optional<Epi>('epis'),
    optional<DocAnterior>('docs_anteriores'),
    optional<MedicaoAnterior>('medicoes_anteriores'),
    optional<Trabalhador>('trabalhadores'),
  ])
  const ghes = ghesRaw.map(({ ghe_funcoes, ...g }) => ({ ...g, funcao_ids: ghe_funcoes.map((x) => x.funcao_id) }))
  return { condo, setores, funcoes, ghes, riscos, agenda, inspecoes, drps, equipe, revisoes, epis, docsAnteriores, medicoesAnteriores, trabalhadores }
}

export function toLegacyProject(b: CondoBundle): LegacyProject {
  const { condo: c, equipe } = b
  const setorNome = (id: string | null) => b.setores.find((x) => x.id === id)?.nome ?? ''
  const funcaoNome = (id: string | null) => b.funcoes.find((x) => x.id === id)?.nome ?? ''
  const gheNome = (id: string | null) => b.ghes.find((x) => x.id === id)?.nome ?? ''
  // quem assina cada documento: escolha do condomínio, senão o padrão da equipe
  const sst = signatario('pgr', c, equipe).membro
  const aux = signatario('pgr_aux', c, equipe).membro
  const insp = signatario('inspecao', c, equipe).membro
  const nr1 = signatario('nr1', c, equipe).membro
  const med = signatario('pcmso', c, equipe).membro
  const lt = signatario('ltcat', c, equipe).membro
  const eng = equipe.find((m) => m.id === c.engenheiro_id)
  const funcaoSst = (m: Equipe | null) => (m ? m.funcao || 'Técnico de Segurança do Trabalho' : '')
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
      funcaoRespSst: funcaoSst(sst),
      regSst: sst?.registro ?? '',
      respSstId: sst?.id ?? '',
      auxSst: aux?.nome ?? '',
      funcaoAuxSst: funcaoSst(aux),
      regAuxSst: aux?.registro ?? '',
      inspRt: insp?.nome ?? '',
      funcaoInspRt: funcaoSst(insp),
      regInspRt: insp?.registro ?? '',
      nr1Rt: nr1?.nome ?? '',
      funcaoNr1Rt: funcaoSst(nr1),
      regNr1Rt: nr1?.registro ?? '',
      ltcatNome: lt?.nome ?? '',
      ltcatFuncao: lt?.funcao ?? '',
      ltcatRegistro: lt ? [lt.registro, lt.tipo === 'medico' ? lt.rqe : ''].filter(Boolean).join(' / ') : '',
      medicoTrabalho: med?.nome ?? '',
      crmMedico: med ? [med.registro, med.rqe].filter(Boolean).join(' / ') : '',
      medicoId: med?.id ?? '',
      engSeguranca: eng?.nome ?? '',
      creaEng: eng?.registro ?? '',
      engId: eng?.id ?? '',
      cep: s(c.cep),
      cidadeUf: s(c.cidade_uf),
      ltcatRt: lt ? (lt.tipo === 'medico' ? 'medico' : 'engenheiro') : c.ltcat_rt === 'medico' ? 'medico' : 'engenheiro',
    },
    setores: b.setores.map((x) => ({ nome: x.nome, ambiente: x.ambiente, descricao: x.descricao })),
    funcoes: b.funcoes.map((x) => ({
      nome: x.nome, setor: setorNome(x.setor_id), quantidade: s(x.quantidade), cbo: x.cbo, atividades: x.atividades,
      cargaHoraria: s(x.carga_horaria),
    })),
    ghe: b.ghes.map((g) => ({
      nome: g.nome, setor: setorNome(g.setor_id), descricao: g.descricao,
      funcoes: g.funcao_ids.map(funcaoNome).filter(Boolean).join(', '),
      numero: int(g.numero) ?? undefined,
      tipoAtividade: s(g.tipo_atividade),
      descricaoAmbiente: s(g.descricao_ambiente),
      parecerInsalubridade: s(g.parecer_insalubridade),
      parecerPericulosidade: s(g.parecer_periculosidade),
      parecerAposentadoria: s(g.parecer_aposentadoria),
      atividadesPerigosas: s(g.atividades_perigosas),
    })),
    riscos: b.riscos.map((r) => ({
      ghe: gheNome(r.ghe_id), funcao: funcaoNome(r.funcao_id), grupo: r.grupo, perigo: r.perigo, fonte: r.fonte,
      dano: r.dano, controles: r.controles, prob: s(r.prob), sev: s(r.sev), acao: r.acao,
      responsavel: r.responsavel, prazo: s(r.prazo), status: r.status,
      codEsocial: s(r.cod_esocial), meioPropagacao: s(r.meio_propagacao), tecnicaAnalise: s(r.tecnica_analise),
      nivelExposicao: s(r.nivel_exposicao), controlesAdm: s(r.controles_adm), controlesEpc: s(r.controles_epc),
      controlesEpi: s(r.controles_epi), indicadoresSaude: s(r.indicadores_saude),
      prioridade: (['A', 'B', 'C', 'D'] as const).find((x) => x === r.prioridade) ?? '',
      recursos: s(r.recursos), onde: s(r.onde), formaAfericao: s(r.forma_afericao), habitualidade: s(r.habitualidade),
      epcEficaz: bool(r.epc_eficaz), epiEficaz: bool(r.epi_eficaz),
      nr15Anexo: s(r.nr15_anexo), grauInsalubridade: s(r.grau_insalubridade), nr16Anexo: s(r.nr16_anexo),
      anexoIvCodigo: s(r.anexo_iv_codigo), aposentadoriaAnos: int(r.aposentadoria_anos),
      // medição própria do risco; sem ela, a medição aproveitada de laudo anterior ligada a ele
      medicao: medicao(r.medicao) ?? (() => {
        const ant = b.medicoesAnteriores.find((m) => m.risco_id === r.id)
        return ant ? medicaoAnterior(ant, b.docsAnteriores) : null
      })(),
    })),
    agenda: b.agenda.map((a) => ({
      id: a.id, data: a.data, hora: s(a.hora).slice(0, 5), tecnico: a.tecnico, obs: a.obs, status: a.status,
    })),
    revisoes: [...b.revisoes]
      .sort((x, y) => x.documento.localeCompare(y.documento) || x.numero.localeCompare(y.numero, 'pt-BR', { numeric: true }))
      .map((r) => ({ documento: r.documento, numero: r.numero, data: s(r.data).slice(0, 10), itens: r.itens })),
    epis: b.epis.map((e) => ({
      ghe: gheNome(e.ghe_id), funcao: funcaoNome(e.funcao_id), nome: e.nome, ca: s(e.ca),
      validadeCa: s(e.validade_ca).slice(0, 10), eficaz: bool(e.eficaz) ?? undefined, imagem: s(e.imagem),
      status: e.status === 'recomendado' ? 'recomendado' : 'existente',
    })),
    trabalhadores: b.trabalhadores.map((t) => ({
      id: t.id, nome: t.nome, cpf: s(t.cpf), matricula: s(t.matricula), funcao: funcaoNome(t.funcao_id),
      admissao: s(t.data_admissao).slice(0, 10), nascimento: s(t.data_nascimento).slice(0, 10), demissao: s(t.data_demissao).slice(0, 10),
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
