// S-2220 — Monitoramento da Saúde do Trabalhador (evtMonit).
// Leiaute eSocial S-1.3 (NT 07/2026 rev. 20/10/2026), XSD evtMonit v_S_01_03_00
// (pacote de esquemas de 26/10/2026; idêntico ao de 01/07/2026). Ordem = ordem do XSD.
import { TIPOS_ASO } from '../types'
import type { Aso, ExameAso } from '../types'
import { signatario } from '../signatarios'
import { TABELA_27 } from './tabelas'
import { cpfValido, dataIso, digitos, fmtData, idEvento, texto, ufValida } from './util'
import { el, grp, toXml } from './xml'
import type { XmlNode } from './xml'
import { NS_S2220, aviso, dedupe, empregador, erro, ideEmpregador, ideEvento, ideVinculo, nomeArquivo, numeroConselho, temErro, vinculoFuncao } from './validacao'
import type { EsocialDados, EventoBase, Opcoes, Problema } from './validacao'

/** {obsProc} obrigatório para estes procedimentos (validação do leiaute S-1.3). */
const EXIGE_OBS = new Set(['0583', '0998', '0999', '1128', '1230', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '9999'])
/** {ordExame} obrigatório para a audiometria (0281). */
const EXIGE_ORDEM = new Set(['0281'])

const IND_RESULT: Record<ExameAso['resultado'], string> = { '': '', normal: '1', alterado: '2', estavel: '3', agravamento: '4' }
export const IND_RESULT_LABEL: Record<string, string> = { '1': 'Normal', '2': 'Alterado', '3': 'Estável', '4': 'Agravamento', '': '' }

export interface ExameS2220 {
  dtExm: string
  procRealizado: string
  nome: string
  obsProc: string
  ordExame: '' | '1' | '2'
  indResult: string
}

export interface MedicoS2220 { nome: string; crm: string; uf: string }
export interface RespMonit extends MedicoS2220 { cpf: string }

export interface EventoS2220 extends EventoBase {
  tipo: 'S-2220'
  aso: Aso
  tpExameOcup: string
  tipoLabel: string
  dtAso: string
  resAso: '1' | '2'
  exames: ExameS2220[]
  medico: MedicoS2220
  resp: RespMonit | null
}

export interface OpcoesS2220 extends Opcoes {
  seq: { n: number }
}

/** Coordenador do PCMSO (respMonit). Grupo opcional: só entra completo (nome, CRM e UF). */
export function coordenadorPcmso(d: EsocialDados): { resp: RespMonit | null; problemas: Problema[] } {
  const m = signatario('pcmso', d.condo, d.equipe).membro
  if (!m) return { resp: null, problemas: [aviso('Sem médico coordenador do PCMSO definido; o grupo respMonit (opcional) não será enviado.', 'condominio')] }
  const resp: RespMonit = { nome: texto(m.nome, 70), crm: numeroConselho(m.registro, 10), uf: ufValida(m.uf_conselho) ?? '', cpf: digitos(m.cpf) }
  const problemas: Problema[] = []
  if (!resp.crm || !resp.uf || resp.nome.length < 2) {
    problemas.push(aviso(`Coordenador do PCMSO (${m.nome}) sem CRM ou UF do conselho; o grupo respMonit (opcional) não será enviado.`, 'equipe'))
    return { resp: null, problemas }
  }
  if (resp.cpf && !cpfValido(resp.cpf)) {
    problemas.push(aviso(`CPF do coordenador do PCMSO (${m.nome}) inválido; enviado sem CPF (campo opcional).`, 'equipe'))
    resp.cpf = ''
  }
  return { resp, problemas }
}

export function xmlS2220(ev: EventoS2220, op: OpcoesS2220, raiz: string): string {
  const r = ev.resp
  const root: XmlNode = {
    n: 'eSocial',
    a: { xmlns: NS_S2220 },
    c: [
      grp('evtMonit', [
        ideEvento(op),
        ideEmpregador(raiz),
        ideVinculo(ev.trabalhador).node,
        grp('exMedOcup', [
          el('tpExameOcup', ev.tpExameOcup),
          grp('aso', [
            el('dtAso', ev.dtAso),
            el('resAso', ev.resAso),
            ...ev.exames.map((x) => grp('exame', [
              el('dtExm', x.dtExm), el('procRealizado', x.procRealizado), el('obsProc', x.obsProc), el('ordExame', x.ordExame),
              el('indResult', x.indResult),
            ])),
            grp('medico', [el('nmMed', ev.medico.nome), el('nrCRM', ev.medico.crm), el('ufCRM', ev.medico.uf)]),
          ]),
          r ? grp('respMonit', [el('cpfResp', r.cpf), el('nmResp', r.nome), el('nrCRM', r.crm), el('ufCRM', r.uf)]) : null,
        ]),
      ], { Id: ev.id }),
    ],
  }
  return toXml(root)
}

/** Um evento por ASO com data dentro do período [de, ate] (inclusive; vazio = sem limite). */
export function gerarS2220(d: EsocialDados, op: OpcoesS2220, de: string, ate: string): EventoS2220[] {
  const emp = empregador(d.condo)
  const coord = coordenadorPcmso(d)
  const asos = d.asos
    .filter((a) => (!de || a.data >= de) && (!ate || a.data <= ate))
    .sort((a, b) => a.data.localeCompare(b.data))
  return asos.map((a): EventoS2220 => {
    const t = d.trabalhadores.find((x) => x.id === a.trabalhador_id)
    const trabalhador = t ?? {
      id: a.trabalhador_id, condominio_id: a.condominio_id, funcao_id: null, nome: '(trabalhador não encontrado)', cpf: '', matricula: '',
      categoria: '', sexo: '' as const, data_nascimento: null, data_admissao: null, data_demissao: null, observacoes: '',
    }
    const nome = trabalhador.nome || 'Trabalhador sem nome'
    const problemas: Problema[] = [...emp.problemas]
    if (!t) problemas.push(erro(`ASO de ${fmtData(a.data)}: trabalhador não encontrado.`, 'asos'))
    else problemas.push(...ideVinculo(t).problemas)
    const { funcao } = vinculoFuncao(d, trabalhador)

    const tipo = TIPOS_ASO.find((x) => x.value === a.tipo)
    if (!tipo) problemas.push(erro(`${nome}: tipo de ASO inválido (${a.tipo}).`, 'asos'))
    const dtAso = dataIso(a.data)
    if (!dtAso) problemas.push(erro(`${nome}: ASO sem data válida.`, 'asos'))
    else {
      if (dtAso > op.hoje) problemas.push(erro(`${nome}: data do ASO (${fmtData(dtAso)}) posterior à data atual.`, 'asos'))
      const adm = dataIso(trabalhador.data_admissao)
      if (a.tipo !== 'admissional' && adm && dtAso < adm) problemas.push(erro(`${nome}: ASO ${tipo?.label.toLowerCase() ?? ''} de ${fmtData(dtAso)} anterior à admissão (${fmtData(adm)}).`, 'asos'))
    }

    // exames
    const lista = Array.isArray(a.exames) ? a.exames : []
    if (!lista.length) problemas.push(erro(`${nome}: ASO de ${fmtData(dtAso)} sem exames (inclua ao menos a avaliação clínica).`, 'asos'))
    if (lista.length > 99) problemas.push(erro(`${nome}: ASO com mais de 99 exames.`, 'asos'))
    const exames: ExameS2220[] = lista.slice(0, 99).map((x) => {
      const cod = digitos(x.codigo).padStart(4, '0')
      const rot = x.nome || x.codigo || 'exame'
      if (!digitos(x.codigo)) problemas.push(erro(`${nome}: exame "${rot}" sem código da Tabela 27.`, 'asos'))
      else if (!TABELA_27.has(cod)) problemas.push(erro(`${nome}: exame "${rot}" com código ${x.codigo} que não existe na Tabela 27.`, 'asos'))
      const dtExm = dataIso(x.data) || dtAso
      if (dtExm && dtAso && dtExm > dtAso) problemas.push(erro(`${nome}: exame "${rot}" (${fmtData(dtExm)}) posterior à data do ASO.`, 'asos'))
      const obsProc = EXIGE_OBS.has(cod) ? texto(x.nome, 999) : ''
      if (EXIGE_OBS.has(cod) && !obsProc) problemas.push(erro(`${nome}: o procedimento ${cod} exige descrição do exame (obsProc).`, 'asos'))
      const ordExame = EXIGE_ORDEM.has(cod) ? (x.ordem === 'sequencial' ? '2' : x.ordem === 'referencial' ? '1' : '') : ''
      if (EXIGE_ORDEM.has(cod) && !ordExame) problemas.push(erro(`${nome}: audiometria (0281) exige a ordem do exame (referencial/sequencial).`, 'asos'))
      return { dtExm, procRealizado: cod, nome: x.nome, obsProc, ordExame, indResult: IND_RESULT[x.resultado] ?? '' }
    })
    const repetidos = exames.map((x) => x.dtExm + x.procRealizado).filter((k, i, arr) => arr.indexOf(k) !== i)
    if (repetidos.length) problemas.push(erro(`${nome}: exame repetido no mesmo dia (mesmo código e data).`, 'asos'))

    // médico emitente: dados do ASO, senão o cadastro da equipe
    const eq = d.equipe.find((m) => m.id === a.medico_id)
    const medico: MedicoS2220 = {
      nome: texto(a.medico_nome || eq?.nome, 70),
      crm: numeroConselho(a.medico_crm || eq?.registro || '', 10),
      uf: ufValida(a.medico_uf || eq?.uf_conselho) ?? '',
    }
    if (medico.nome.length < 2) problemas.push(erro(`${nome}: ASO de ${fmtData(dtAso)} sem nome do médico emitente.`, 'asos'))
    if (!medico.crm) problemas.push(erro(`${nome}: ASO de ${fmtData(dtAso)} sem CRM do médico emitente.`, 'asos'))
    if (!medico.uf) problemas.push(erro(`${nome}: ASO de ${fmtData(dtAso)} sem UF do CRM do médico emitente.`, 'asos'))

    problemas.push(...coord.problemas)
    const seq = ++op.seq.n
    const ev: EventoS2220 = {
      tipo: 'S-2220',
      chave: a.id,
      trabalhador,
      funcao,
      problemas: dedupe(problemas),
      xml: null,
      arquivo: nomeArquivo('S-2220', trabalhador.cpf, dtAso, a.tipo),
      id: emp.raiz.length === 8 ? idEvento(emp.raiz, op.gerado, seq) : '',
      aso: a,
      tpExameOcup: tipo?.esocial ?? '',
      tipoLabel: tipo?.label ?? a.tipo,
      dtAso,
      resAso: a.resultado === 'inapto' ? '2' : '1',
      exames,
      medico,
      resp: coord.resp,
    }
    if (!temErro(ev.problemas)) ev.xml = xmlS2220(ev, op, emp.raiz)
    return ev
  })
}
