// S-2240 — Condições Ambientais do Trabalho - Agentes Nocivos (evtExpRisco).
// Leiaute eSocial S-1.3 (NT 07/2026 rev. 20/10/2026), XSD evtExpRisco v_S_01_03_00
// (pacote de esquemas de 26/10/2026; idêntico ao de 01/07/2026) e MOS S-1.3
// consolidado até a NO S-1.3 12/2026. Ordem dos elementos = ordem do XSD.
import type { Epi, Equipe, Ghe, Risco } from '../types'
import { signatario } from '../signatarios'
import { TABELA_24 } from './tabelas'
import { dataIso, decimal, digitos, cpfValido, fmtData, idEvento, numero, somaDias, texto, ufValida } from './util'
import { el, grp, toXml } from './xml'
import type { XmlNode } from './xml'
import {
  NS_S2240, aviso, dedupe, empregador, erro, ideEmpregador, ideEvento, ideVinculo, nomeArquivo, numeroConselho, temErro, vinculoFuncao,
} from './validacao'
import type { EpiCompl, EsocialDados, EventoBase, Opcoes, Problema } from './validacao'

/** Tabela 24: ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999. */
export const COD_AUSENCIA = '09.01.001'

/** Códigos que exigem {dscAgNoc} (validação do campo no leiaute S-1.3). */
const EXIGE_DSC = new Set([
  '01.01.001', '01.02.001', '01.03.001', '01.04.001', '01.05.001', '01.06.001', '01.07.001', '01.08.001', '01.09.001', '01.10.001',
  '01.12.001', '01.13.001', '01.14.001', '01.15.001', '01.16.001', '01.17.001', '01.18.001', '05.01.001',
])
/** Códigos com {limTol} obrigatório (e exclusivo) quando quantitativo: sílica livre e calor. */
const EXIGE_LIMTOL = new Set(['01.18.001', '02.01.014'])

const GRUPOS_AGENTE = new Set(['Físico', 'Químico', 'Biológico'])

/** Domínio de {unMed} (XSD evtExpRisco, valores 1–30). */
export const UN_MED: { v: string; label: string }[] = [
  { v: '1', label: 'dose diária de ruído' }, { v: '2', label: 'dB (linear)' }, { v: '3', label: 'dB(C)' }, { v: '4', label: 'dB(A)' },
  { v: '5', label: 'm/s²' }, { v: '6', label: 'm/s^1,75' }, { v: '7', label: 'ppm' }, { v: '8', label: 'mg/m³' },
  { v: '9', label: 'f/cm³' }, { v: '10', label: 'ºC' }, { v: '11', label: 'm/s' }, { v: '12', label: 'porcentual' },
  { v: '13', label: 'lux' }, { v: '14', label: 'ufc/m³' }, { v: '15', label: 'dose diária' }, { v: '16', label: 'dose mensal' },
  { v: '17', label: 'dose trimestral' }, { v: '18', label: 'dose anual' }, { v: '19', label: 'W/m²' }, { v: '20', label: 'A/m' },
  { v: '21', label: 'mT' }, { v: '22', label: 'μT' }, { v: '23', label: 'mA' }, { v: '24', label: 'kV/m' }, { v: '25', label: 'V/m' },
  { v: '26', label: 'J/m²' }, { v: '27', label: 'mJ/cm²' }, { v: '28', label: 'mSv' }, { v: '29', label: 'mppdc' },
  { v: '30', label: 'UR (%)' },
]

/** Unidade digitada na medição → código {unMed}; null quando não reconhecida. */
export function unMed(unidade: string, codAgNoc = ''): string | null {
  const u = unidade.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')
    .replace(/²/g, '2').replace(/³/g, '3').replace(/[º°]/g, 'o')
  if (!u) return null
  if (/^\d+$/.test(u) && Number(u) >= 1 && Number(u) <= 30) return String(Number(u))
  if (/^db\(?a\)?$|^dba$/.test(u)) return '4'
  if (/^db\(?c\)?$|^dbc$/.test(u)) return '3'
  if (/^db(\(?lin(ear)?\)?)?$/.test(u)) return '2'
  if (/dose/.test(u)) {
    if (/mensal/.test(u)) return '16'
    if (/trimes/.test(u)) return '17'
    if (/anual/.test(u)) return '18'
    return codAgNoc === '02.01.001' || /ruido/.test(u) ? '1' : '15'
  }
  if (/^m\/s(2|\^2|\*\*2)$/.test(u)) return '5'
  if (/^m\/s\^?1[,.]75$/.test(u)) return '6'
  if (u === 'ppm') return '7'
  if (/^mg\/m3$/.test(u)) return '8'
  if (/^f(ibras?)?\/cm3$/.test(u)) return '9'
  if (/^o?c$|^graus?celsius$|^ibutg/.test(u)) return '10'
  if (u === 'm/s') return '11'
  if (/^ur|umidade/.test(u)) return '30'
  if (u === '%' || /^porcent/.test(u)) return '12'
  if (/^(lux|lx)$/.test(u)) return '13'
  if (/^ufc\/m3$/.test(u)) return '14'
  if (/^w\/m2$/.test(u)) return '19'
  if (u === 'a/m') return '20'
  if (u === 'mt') return '21'
  if (/^(ut|μt|µt|microtesla)$/.test(u)) return '22'
  if (u === 'ma') return '23'
  if (u === 'kv/m') return '24'
  if (u === 'v/m') return '25'
  if (u === 'j/m2') return '26'
  if (u === 'mj/cm2') return '27'
  if (u === 'msv') return '28'
  if (u === 'mppdc') return '29'
  return null
}

export interface AgenteS2240 {
  codAgNoc: string
  /** descrição da Tabela 24 (para a prévia/planilha) */
  descricaoTabela: string
  dscAgNoc: string
  tpAval: '' | '1' | '2'
  intConc: string
  limTol: string
  unMed: string
  tecMedicao: string
  utilizEPC: '' | '0' | '1' | '2'
  eficEpc: '' | 'S' | 'N'
  utilizEPI: '' | '0' | '1' | '2'
  eficEpi: '' | 'S' | 'N'
  cas: string[]
  /** riscos do inventário que originaram o agente */
  origem: string[]
}

export interface ResponsavelReg {
  nome: string
  cpf: string
  ideOC: '' | '1' | '4' | '9'
  dscOC: string
  nrOC: string
  ufOC: string
}

export interface EventoS2240 extends EventoBase {
  tipo: 'S-2240'
  dtIniCondicao: string
  setor: string
  ghes: string[]
  atividades: string
  agentes: AgenteS2240[]
  resp: ResponsavelReg | null
}

export interface OpcoesS2240 extends Opcoes {
  /** data de referência (elaboração do LTCAT/PGR); dtIniCondicao = a mais recente entre ela e a admissão */
  dataBase: string
  epiCompl: EpiCompl
  /** contador compartilhado para o sequencial do Id */
  seq: { n: number }
}

const norm = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
/** O texto de controles cita o EPI pelo nome (ou o nome contém o texto). */
const cita = (controles: string, epi: string) => {
  const c = norm(controles)
  const e = norm(epi)
  return Boolean(c && e) && (c.includes(e) || e.includes(c))
}

const sn = (b: boolean | null | undefined): '' | 'S' | 'N' => (b === true ? 'S' : b === false ? 'N' : '')

/** Riscos do trabalhador: os dos GHEs da função; risco sem GHE segue a função (mesma regra do PGR/LTCAT). */
export function riscosDoTrabalhador(riscos: Risco[], funcaoId: string | null, ghes: Ghe[]): Risco[] {
  if (!funcaoId) return []
  const ids = new Set(ghes.map((g) => g.id))
  return riscos.filter((r) => (r.ghe_id ? ids.has(r.ghe_id) : r.funcao_id === funcaoId))
}

/**
 * O EPI protege contra o agente? Pelo capítulo da Tabela 24 (01 químico, 02 físico, 03 biológico)
 * e pelo nome do EPI. Serve só para escolher os CAs quando o risco não cita os EPIs.
 */
export function epiProtegeContra(codAgNoc: string, nomeEpi: string): boolean {
  const n = nomeEpi.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (codAgNoc === '02.01.001') return /auricular|auditiv|abafador|concha|plug|tampao/.test(n) // ruído
  if (codAgNoc.startsWith('02.')) return /bone|chapeu|protetor solar|filtro solar|manga|roupa|vestimenta|oculos|luva/.test(n) // calor, radiação, vibração, frio…
  if (codAgNoc.startsWith('01.')) return /luva|respirador|mascara|pff|oculos|avental|bota|creme|protetor facial|viseira/.test(n) // químico
  if (codAgNoc.startsWith('03.')) return /luva|respirador|mascara|pff|oculos|avental|bota|viseira/.test(n) // biológico
  return false
}

export function episDoTrabalhador(epis: Epi[], funcaoId: string | null, ghes: Ghe[]): Epi[] {
  if (!funcaoId) return []
  const ids = new Set(ghes.map((g) => g.id))
  return epis.filter((e) => e.status === 'existente' && (e.ghe_id ? ids.has(e.ghe_id) : e.funcao_id === funcaoId))
}

/** Responsável pelos registros ambientais = quem assina o LTCAT. */
export function responsavelRegistros(d: EsocialDados): { resp: ResponsavelReg | null; membro: Equipe | null } {
  const m = signatario('ltcat', d.condo, d.equipe).membro
  if (!m) return { resp: null, membro: null }
  const ideOC = m.tipo === 'medico' ? '1' : m.tipo === 'engenheiro' ? '4' : '9'
  const sigla = /^[A-Za-z]{2,10}/.exec(String(m.registro ?? '').trim())?.[0]?.toUpperCase() ?? ''
  return {
    membro: m,
    resp: {
      nome: m.nome,
      cpf: digitos(m.cpf),
      ideOC,
      dscOC: ideOC === '9' ? texto(sigla || 'MTE', 20) : '',
      nrOC: numeroConselho(m.registro, 14),
      ufOC: ufValida(m.uf_conselho) ?? '',
    },
  }
}

function epcEpiNode(a: AgenteS2240, compl: EpiCompl): XmlNode | null {
  if (a.codAgNoc === COD_AUSENCIA) return null
  const epiCompl = a.utilizEPI === '2'
    ? grp('epiCompl', [
      el('medProtecao', sn(compl.medProtecao)), el('condFuncto', sn(compl.condFuncto)), el('usoInint', sn(compl.usoInint)),
      el('przValid', sn(compl.przValid)), el('periodicTroca', sn(compl.periodicTroca)), el('higienizacao', sn(compl.higienizacao)),
    ])
    : null
  return grp('epcEpi', [
    el('utilizEPC', a.utilizEPC),
    a.utilizEPC === '2' ? el('eficEpc', a.eficEpc) : null,
    el('utilizEPI', a.utilizEPI),
    a.utilizEPI === '2' ? el('eficEpi', a.eficEpi) : null,
    ...(a.utilizEPI === '2' ? a.cas.slice(0, 50).map((ca) => grp('epi', [el('docAval', ca)])) : []),
    epiCompl,
  ])
}

export function xmlS2240(ev: EventoS2240, op: OpcoesS2240, raiz: string, cnpj: string): string {
  const vinc = ideVinculo(ev.trabalhador).node
  const r = ev.resp!
  const soAusencia = ev.agentes.every((a) => a.codAgNoc === COD_AUSENCIA)
  const root: XmlNode = {
    n: 'eSocial',
    a: { xmlns: NS_S2240 },
    c: [
      grp('evtExpRisco', [
        ideEvento(op),
        ideEmpregador(raiz),
        vinc,
        grp('infoExpRisco', [
          el('dtIniCondicao', ev.dtIniCondicao),
          grp('infoAmb', [el('localAmb', '1'), el('dscSetor', ev.setor), el('tpInsc', '1'), el('nrInsc', cnpj)]),
          grp('infoAtiv', [el('dscAtivDes', ev.atividades)]),
          ...ev.agentes.map((a) => grp('agNoc', [
            el('codAgNoc', a.codAgNoc),
            el('dscAgNoc', a.dscAgNoc),
            el('tpAval', a.tpAval),
            a.tpAval === '1' ? el('intConc', a.intConc) : null,
            a.tpAval === '1' ? el('limTol', a.limTol) : null,
            a.tpAval === '1' ? el('unMed', a.unMed) : null,
            a.tpAval === '1' ? el('tecMedicao', a.tecMedicao) : null,
            epcEpiNode(a, op.epiCompl),
          ])),
          grp('respReg', [
            el('cpfResp', r.cpf),
            // ideOC/nrOC/ufOC: obrigatórios se houver agente diferente de 09.01.001; informados também na ausência quando cadastrados
            el('ideOC', r.ideOC && (r.nrOC || !soAusencia) ? r.ideOC : ''),
            r.ideOC === '9' ? el('dscOC', r.dscOC) : null,
            el('nrOC', r.nrOC),
            el('ufOC', r.ufOC),
          ]),
        ]),
      ], { Id: ev.id }),
    ],
  }
  return toXml(root)
}

/** Monta os agentes nocivos de um conjunto de riscos (agNoc). */
function agentesDe(
  nome: string, riscos: Risco[], epis: Epi[], compl: EpiCompl, problemas: Problema[],
): AgenteS2240[] {
  const porCodigo = new Map<string, AgenteS2240>()
  for (const r of riscos) {
    if (!GRUPOS_AGENTE.has(r.grupo)) continue
    const rotulo = `${r.grupo} — ${r.perigo || 'sem descrição'}`
    const cod = String(r.cod_esocial ?? '').trim()
    if (!cod) {
      problemas.push(aviso(`${nome}: risco "${rotulo}" sem código da Tabela 24 — não entra no S-2240. Se for agente nocivo do Anexo IV, informe o código no risco.`, 'riscos'))
      continue
    }
    if (!TABELA_24[cod]) {
      problemas.push(erro(`${nome}: risco "${rotulo}" com código "${cod}" que não existe na Tabela 24 do eSocial.`, 'riscos'))
      continue
    }
    if (cod === COD_AUSENCIA) continue
    const ag: AgenteS2240 = {
      codAgNoc: cod, descricaoTabela: TABELA_24[cod], dscAgNoc: '', tpAval: '2', intConc: '', limTol: '', unMed: '', tecMedicao: '',
      utilizEPC: '1', eficEpc: '', utilizEPI: '1', eficEpi: '', cas: [], origem: [r.perigo || rotulo],
    }
    if (EXIGE_DSC.has(cod)) {
      ag.dscAgNoc = texto(r.perigo, 100)
      if (!ag.dscAgNoc) problemas.push(erro(`${nome}: o código ${cod} exige a descrição do agente (campo "perigo" do risco).`, 'riscos'))
    }
    // Critério de avaliação: quantitativo quando marcado ou quando há medição com resultado
    const m = r.medicao
    const quant = r.tecnica_analise === 'Quantitativa' || Boolean(m && String(m.resultado ?? '').trim())
    if (quant) {
      ag.tpAval = '1'
      const v = numero(m?.resultado)
      if (v === null) problemas.push(erro(`${nome}: agente ${cod} (${r.perigo}) é quantitativo, mas a medição não tem resultado numérico.`, 'riscos'))
      else if (v < 0 || v > 999999.9999) problemas.push(erro(`${nome}: resultado da medição de ${cod} fora do intervalo aceito (0 a 999999,9999).`, 'riscos'))
      else ag.intConc = decimal(v)
      const un = unMed(String(m?.unidade ?? ''), cod)
      if (!un) problemas.push(erro(`${nome}: unidade de medida "${m?.unidade ?? ''}" do agente ${cod} não corresponde a nenhuma unidade do eSocial (ex.: dB(A), mg/m³, ppm, ºC, m/s²).`, 'riscos'))
      else ag.unMed = un
      ag.tecMedicao = texto(m?.tecnica, 40)
      if (!ag.tecMedicao) problemas.push(erro(`${nome}: informe na medição do agente ${cod} a técnica/norma utilizada (ex.: NHO 01).`, 'riscos'))
      if (EXIGE_LIMTOL.has(cod)) {
        const lt = numero(m?.limite)
        if (lt === null) problemas.push(erro(`${nome}: o código ${cod} exige o limite de tolerância calculado na medição.`, 'riscos'))
        else ag.limTol = decimal(lt)
      }
      const lt = numero(m?.limite)
      if (v !== null && lt !== null && v < lt) {
        problemas.push(aviso(`${nome}: medição de ${cod} (${m?.resultado}) abaixo do limite (${m?.limite}). Pelo MOS (S-2240, item 3.5) o registro só é obrigatório a partir do nível de ação — confirme com o responsável técnico.`, 'riscos'))
      }
    }
    // EPC
    if (String(r.controles_epc ?? '').trim() || r.epc_eficaz !== null) {
      ag.utilizEPC = '2'
      ag.eficEpc = sn(r.epc_eficaz)
      if (!ag.eficEpc) problemas.push(erro(`${nome}: informe no risco "${rotulo}" se o EPC é eficaz.`, 'riscos'))
    }
    // EPI: os EPIs existentes do GHE/função; se o campo "controles EPI" do risco cita algum deles, só os citados
    if (String(r.controles_epi ?? '').trim() || r.epi_eficaz !== null || epis.length) {
      ag.utilizEPI = '2'
      // 1º os EPIs citados no risco; senão, os compatíveis com o agente (ex.: ruído → protetor auditivo);
      // só sem nenhum compatível ficam todos os EPIs do GHE/função
      const citados = epis.filter((e) => cita(r.controles_epi, e.nome))
      const compativeis = citados.length ? [] : epis.filter((e) => epiProtegeContra(cod, e.nome))
      const usados = citados.length ? citados : compativeis.length ? compativeis : epis
      const eficEpis = usados.map((e) => e.eficaz)
      ag.eficEpi = sn(r.epi_eficaz ?? (eficEpis.length && eficEpis.every((x) => x === true) ? true : eficEpis.some((x) => x === false) ? false : null))
      if (!ag.eficEpi) problemas.push(erro(`${nome}: informe no risco "${rotulo}" (ou nos EPIs) se o EPI é eficaz.`, 'riscos'))
      ag.cas = [...new Set(usados.map((e) => texto(e.ca, 255)).filter(Boolean))]
      if (!ag.cas.length) problemas.push(erro(`${nome}: o agente ${cod} usa EPI, mas nenhum EPI existente do GHE/função tem CA cadastrado.`, 'epis'))
      if (ag.cas.length > 50) problemas.push(aviso(`${nome}: mais de 50 CAs; só os 50 primeiros entram no XML.`, 'epis'))
      const semCa = usados.filter((e) => !texto(e.ca, 255))
      if (semCa.length) problemas.push(aviso(`${nome}: EPI(s) sem CA não entram no XML: ${semCa.map((e) => e.nome).join(', ')}.`, 'epis'))
      if (!citados.length && !compativeis.length && epis.length > 1) problemas.push(aviso(`${nome}: todos os EPIs do GHE/função foram ligados ao agente ${cod}; para filtrar, cite os EPIs no campo "Controles — EPI" do risco.`, 'riscos'))
    }
    const chave = cod + '|' + ag.dscAgNoc.toLowerCase()
    const ja = porCodigo.get(chave)
    if (ja) {
      ja.origem.push(...ag.origem)
      if (ja.tpAval !== '1' && ag.tpAval === '1') porCodigo.set(chave, { ...ag, origem: ja.origem })
      problemas.push(aviso(`${nome}: o agente ${cod} aparece em mais de um risco; foi informado uma vez${ag.tpAval === '1' ? ' (com a medição)' : ''}.`, 'riscos'))
    } else porCodigo.set(chave, ag)
  }
  const lista = [...porCodigo.values()]
  if (lista.some((a) => a.utilizEPI === '2') && Object.values(compl).some((v) => v === null)) {
    problemas.push(erro(`${nome}: responda os requisitos de EPI das NR-06/NR-09 (painel "Requisitos de EPI" desta página).`, 'esocial'))
  }
  return lista
}

export function gerarS2240(d: EsocialDados, op: OpcoesS2240): EventoS2240[] {
  const emp = empregador(d.condo)
  const { resp, membro } = responsavelRegistros(d)
  const respProblemas: Problema[] = []
  if (!membro) respProblemas.push(erro('Nenhum responsável pelo LTCAT definido (responsável pelos registros ambientais).', 'condominio'))
  else if (resp) {
    if (!resp.cpf) respProblemas.push(erro(`Responsável pelo LTCAT (${resp.nome}) sem CPF cadastrado.`, 'equipe'))
    else if (!cpfValido(resp.cpf)) respProblemas.push(erro(`CPF do responsável pelo LTCAT (${resp.nome}) inválido.`, 'equipe'))
  }
  const base = dataIso(op.dataBase)
  const limite = somaDias(op.hoje, 30)
  const ativos = d.trabalhadores.filter((t) => !dataIso(t.data_demissao) || !base || dataIso(t.data_demissao) >= base)
  return ativos.map((t): EventoS2240 => {
    const nome = t.nome || 'Trabalhador sem nome'
    const problemas: Problema[] = [...emp.problemas]
    const vinc = ideVinculo(t)
    problemas.push(...vinc.problemas)
    const { funcao, ghes, setor } = vinculoFuncao(d, t)
    if (!funcao) problemas.push(erro(`${nome}: sem função cadastrada.`, 'trabalhadores'))
    else if (d.ghes.length && !ghes.length) problemas.push(aviso(`${nome}: a função "${funcao.nome}" não está em nenhum GHE; usados só os riscos ligados diretamente à função.`, 'ghe'))
    // dtIniCondicao: a mais recente entre a admissão e a data de referência
    const adm = dataIso(t.data_admissao)
    if (!adm) problemas.push(aviso(`${nome}: sem data de admissão; a data de início da condição não pode ser anterior à admissão.`, 'trabalhadores'))
    const dtIni = [adm, base].filter(Boolean).sort().pop() ?? ''
    if (!dtIni) problemas.push(erro(`${nome}: defina a data de referência (início da condição).`, 'esocial'))
    else if (dtIni > limite) problemas.push(erro(`${nome}: início da condição (${fmtData(dtIni)}) não pode ser posterior a 30 dias da data atual.`, 'esocial'))
    // ambiente e atividades
    const dscSetor = texto(setor?.nome, 100)
    if (funcao && !dscSetor) problemas.push(erro(`${nome}: a função "${funcao.nome}" não tem setor (dscSetor).`, 'funcoes'))
    let atividades = texto(funcao?.atividades, 999)
    if (funcao && !atividades) {
      atividades = texto(ghes.map((g) => g.tipo_atividade || g.descricao).filter(Boolean).join('; '), 999)
      if (atividades) problemas.push(aviso(`${nome}: a função "${funcao.nome}" não tem atividades; usada a descrição do GHE.`, 'funcoes'))
      else problemas.push(erro(`${nome}: descreva as atividades da função "${funcao.nome}" (dscAtivDes).`, 'funcoes'))
    }
    // agentes nocivos
    const riscos = riscosDoTrabalhador(d.riscos, funcao?.id ?? null, ghes)
    const epis = episDoTrabalhador(d.epis, funcao?.id ?? null, ghes)
    let agentes = funcao ? agentesDe(nome, riscos, epis, op.epiCompl, problemas) : []
    if (!agentes.length) {
      agentes = [{
        codAgNoc: COD_AUSENCIA, descricaoTabela: TABELA_24[COD_AUSENCIA], dscAgNoc: '', tpAval: '', intConc: '', limTol: '', unMed: '',
        tecMedicao: '', utilizEPC: '', eficEpc: '', utilizEPI: '', eficEpi: '', cas: [], origem: [],
      }]
    }
    if (agentes.length > 999) problemas.push(erro(`${nome}: mais de 999 agentes nocivos.`, 'riscos'))
    // responsável
    problemas.push(...respProblemas)
    const temAgente = agentes.some((a) => a.codAgNoc !== COD_AUSENCIA)
    if (resp && temAgente) {
      if (!resp.nrOC) problemas.push(erro(`Responsável pelo LTCAT (${resp.nome}) sem número de registro no conselho.`, 'equipe'))
      if (!resp.ufOC) problemas.push(erro(`Responsável pelo LTCAT (${resp.nome}) sem UF do conselho.`, 'equipe'))
    }
    const seq = ++op.seq.n
    const ev: EventoS2240 = {
      tipo: 'S-2240',
      chave: t.id,
      trabalhador: t,
      funcao,
      problemas: dedupe(problemas),
      xml: null,
      arquivo: nomeArquivo('S-2240', t.cpf, dtIni),
      id: emp.raiz.length === 8 ? idEvento(emp.raiz, op.gerado, seq) : '',
      dtIniCondicao: dtIni,
      setor: dscSetor,
      ghes: ghes.map((g) => g.nome),
      atividades,
      agentes,
      resp,
    }
    if (!temErro(ev.problemas)) ev.xml = xmlS2240(ev, op, emp.raiz, emp.cnpj)
    return ev
  })
}


/** Rótulos para a prévia/planilha. */
export const TP_AVAL_LABEL: Record<string, string> = { '1': 'Quantitativa', '2': 'Qualitativa', '': '' }
export const UTILIZ_LABEL: Record<string, string> = { '0': 'Não se aplica', '1': 'Não', '2': 'Sim', '': '' }
export const unMedLabel = (v: string) => UN_MED.find((u) => u.v === v)?.label ?? ''
export const IDE_OC_LABEL: Record<string, string> = { '1': 'CRM', '4': 'CREA', '9': 'Outro', '': '' }

