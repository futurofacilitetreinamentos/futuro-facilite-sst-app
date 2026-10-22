// Tipos e regras comuns aos eventos S-2240 e S-2220 (leiautes eSocial S-1.3,
// NT 07/2026 rev. 20/10/2026; XSD v_S_01_03_00 de 26/10/2026 — idênticos aos de
// 01/07/2026 para evtExpRisco e evtMonit).
import type { Aso, Condominio, Epi, Equipe, Funcao, Ghe, Risco, Setor, Trabalhador } from '../types'
import { UFS, cnpjNormalizado, cnpjValido, cpfValido, digitos, texto } from './util'
import { el, grp } from './xml'
import type { XmlNode } from './xml'

export const VERSAO_LEIAUTE = 'S-1.3 (NT 07/2026 rev. 20/10/2026; XSD v_S_01_03_00)'
export const NS_S2240 = 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00'
export const NS_S2220 = 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00'
/** verProc (1–20 caracteres): versão do aplicativo emissor. */
export const VER_PROC = 'FuturoFaciliteSST-1'

/** Onde o usuário corrige o dado (rota do app). */
export type Onde = 'condominio' | 'trabalhadores' | 'funcoes' | 'setores' | 'ghe' | 'riscos' | 'epis' | 'equipe' | 'asos' | 'esocial'

export const ONDE_LABEL: Record<Onde, string> = {
  condominio: 'Condomínio',
  trabalhadores: 'Trabalhadores',
  funcoes: 'Funções',
  setores: 'Setores',
  ghe: 'GHE',
  riscos: 'Riscos',
  epis: 'EPIs',
  equipe: 'Equipe técnica',
  asos: 'ASOs',
  esocial: 'esta página',
}

export interface Problema {
  nivel: 'erro' | 'aviso'
  msg: string
  onde: Onde
}

export const erro = (msg: string, onde: Onde): Problema => ({ nivel: 'erro', msg, onde })
export const aviso = (msg: string, onde: Onde): Problema => ({ nivel: 'aviso', msg, onde })

/** Requisitos das NR-06 e NR-09 (grupo epiCompl), respondidos pelo usuário na página. */
export interface EpiCompl {
  medProtecao: boolean | null
  condFuncto: boolean | null
  usoInint: boolean | null
  przValid: boolean | null
  periodicTroca: boolean | null
  higienizacao: boolean | null
}

export const EPI_COMPL_PERGUNTAS: { key: keyof EpiCompl; label: string }[] = [
  { key: 'medProtecao', label: 'Foi tentada a implementação de medidas de proteção coletiva, administrativas ou de organização, optando-se pelo EPI por inviabilidade técnica, insuficiência ou interinidade, ou em caráter complementar ou emergencial?' },
  { key: 'condFuncto', label: 'Foram observadas as condições de funcionamento do EPI ao longo do tempo, conforme especificação técnica do fabricante, ajustadas às condições de campo?' },
  { key: 'usoInint', label: 'Foi observado o uso ininterrupto do EPI ao longo do tempo, conforme especificação técnica do fabricante, ajustadas às condições de campo?' },
  { key: 'przValid', label: 'Foi observado o prazo de validade do CA no momento da compra do EPI?' },
  { key: 'periodicTroca', label: 'É observada a periodicidade de troca definida pelo fabricante e/ou programas ambientais, comprovada mediante recibo assinado pelo usuário?' },
  { key: 'higienizacao', label: 'É observada a higienização conforme orientação do fabricante?' },
]

export const EPI_COMPL_VAZIO: EpiCompl = {
  medProtecao: null, condFuncto: null, usoInint: null, przValid: null, periodicTroca: null, higienizacao: null,
}

/** Dados do condomínio usados na exportação (linhas do banco, sem conversão). */
export interface EsocialDados {
  condo: Condominio
  setores: Setor[]
  funcoes: Funcao[]
  ghes: Ghe[]
  riscos: Risco[]
  epis: Epi[]
  equipe: Equipe[]
  trabalhadores: Trabalhador[]
  asos: Aso[]
}

export interface Opcoes {
  /** 1 = Produção, 2 = Produção restrita */
  tpAmb: '1' | '2'
  /** momento da geração (entra no Id do evento) */
  gerado: Date
  /** data de hoje (AAAA-MM-DD), para as validações de data */
  hoje: string
}

export type TipoEvento = 'S-2240' | 'S-2220'

export interface EventoBase {
  tipo: TipoEvento
  /** chave estável da linha (trabalhador ou ASO) */
  chave: string
  trabalhador: Trabalhador
  funcao: Funcao | null
  problemas: Problema[]
  /** XML gerado; null quando há erro impeditivo */
  xml: string | null
  arquivo: string
  id: string
}

export function dedupe(p: Problema[]): Problema[] {
  const vistos = new Set<string>()
  return p.filter((x) => (vistos.has(x.nivel + x.msg) ? false : (vistos.add(x.nivel + x.msg), true)))
}

export const temErro = (p: Problema[]) => p.some((x) => x.nivel === 'erro')

/** Empregador: raiz do CNPJ (8 posições) — S-1000 nrInsc, exceto naturezas jurídicas de órgãos públicos (não é o caso de condomínio). */
export function empregador(condo: Condominio): { raiz: string; cnpj: string; problemas: Problema[] } {
  const cnpj = cnpjNormalizado(condo.cnpj)
  const problemas: Problema[] = []
  if (!cnpj) problemas.push(erro('CNPJ do condomínio não cadastrado.', 'condominio'))
  else if (!cnpjValido(cnpj)) problemas.push(erro(`CNPJ do condomínio inválido (${condo.cnpj}).`, 'condominio'))
  return { raiz: cnpj.slice(0, 8), cnpj, problemas }
}

export function ideEvento(op: Opcoes): XmlNode {
  return grp('ideEvento', [el('indRetif', '1'), el('tpAmb', op.tpAmb), el('procEmi', '1'), el('verProc', VER_PROC)])!
}

export function ideEmpregador(raiz: string): XmlNode {
  return grp('ideEmpregador', [el('tpInsc', '1'), el('nrInsc', raiz)])!
}

/** ideVinculo: cpfTrab + matrícula; codCateg só para TSVE sem matrícula (categoria fora de 1XX). */
export function ideVinculo(t: Trabalhador): { node: XmlNode; problemas: Problema[] } {
  const problemas: Problema[] = []
  const cpf = digitos(t.cpf)
  const nome = t.nome || 'trabalhador sem nome'
  if (!cpf) problemas.push(erro(`${nome}: CPF não cadastrado.`, 'trabalhadores'))
  else if (!cpfValido(cpf)) problemas.push(erro(`${nome}: CPF inválido (${t.cpf}).`, 'trabalhadores'))
  const matricula = texto(t.matricula, 30)
  const categ = digitos(t.categoria)
  let codCateg = ''
  if (!matricula) {
    if (!categ || categ.startsWith('1')) {
      problemas.push(erro(`${nome}: matrícula não cadastrada (use a mesma matrícula do S-2200 enviado pela contabilidade).`, 'trabalhadores'))
    } else if (!/^\d{3}$/.test(categ)) {
      problemas.push(erro(`${nome}: código de categoria (Tabela 01) inválido: ${t.categoria}.`, 'trabalhadores'))
    } else codCateg = categ
  }
  return { node: grp('ideVinculo', [el('cpfTrab', cpf), el('matricula', matricula), el('codCateg', codCateg)])!, problemas }
}

/** Número do conselho sem a sigla/UF ("CRM-SP 12345" → "12345"), até `max` caracteres. */
export function numeroConselho(registro: string, max: number): string {
  const t = String(registro ?? '').toUpperCase().replace(/RQE.*$/, '')
    .replace(/\b(CRM|CREA|CRQ|CFT|CRT|MTE|CONFEA)\b/g, ' ')
    .replace(new RegExp(`\\b(${UFS.join('|')})\\b`, 'g'), ' ')
  let r = (/[0-9][0-9A-Z.-]*/.exec(t)?.[0] ?? '').replace(/[.-]+$/, '')
  if (r.length > max) r = r.replace(/[^A-Z0-9]/g, '')
  return r.slice(0, max)
}

export const nomeArquivo = (tipo: TipoEvento, cpf: string, data: string, extra = '') =>
  `${tipo}_${digitos(cpf) || 'sem-cpf'}_${data || 'sem-data'}${extra ? '_' + extra : ''}.xml`

/** Funções e GHEs do trabalhador (mesma relação usada no PGR/LTCAT: lista explícita ghe_funcoes). */
export function vinculoFuncao(d: EsocialDados, t: Trabalhador) {
  const funcao = d.funcoes.find((f) => f.id === t.funcao_id) ?? null
  const ghes = funcao ? d.ghes.filter((g) => g.funcao_ids.includes(funcao.id)) : []
  const setor = d.setores.find((s) => s.id === (funcao?.setor_id ?? ghes.find((g) => g.setor_id)?.setor_id ?? null)) ?? null
  return { funcao, ghes, setor }
}
