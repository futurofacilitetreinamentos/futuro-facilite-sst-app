// Cálculos e montagem dos dados da área comercial (orçamentos e contratos).
// Funções puras: sem React nem Supabase, para poder testar isoladamente.
import { CLAUSULAS_CONTRATO_PADRAO, CONDICOES_PROPOSTA_PADRAO } from '../reports/comercial-texts'
import type { ClienteComercial, ContratoDocData, PropostaDocData } from '../reports/comercial-types'
import { formatCpf, onlyDigits } from './cpf'
import type {
  ClausulaContrato, Condominio, ConfigEmpresa, Contrato, ItemProposta, Proposta, Servico, StatusContrato, StatusProposta,
} from './types'

// ---------------------------------------------------------------------------
// Números
// ---------------------------------------------------------------------------

/** Arredonda para centavos (meio para cima, sem o erro de ponto flutuante de 1.005 * 100). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  const sign = n < 0 ? -1 : 1
  const cents = Math.round(Number((Math.abs(n) * 100).toFixed(6)))
  return (sign * cents) / 100 || 0
}

/** Lê número digitado ("52,50", "52.5", "") — inválido ou vazio vira 0. */
export function parseNum(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v ?? '').trim()
  if (!s) return 0
  // "1.234,56" (pt-BR) ou "1234.56"
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(norm)
  return Number.isFinite(n) ? n : 0
}

/** Inteiro >= min (vazio/ inválido = fallback). */
export function parseIntMin(v: string | number | null | undefined, fallback: number, min = 0): number {
  const n = Math.trunc(parseNum(v))
  if (String(v ?? '').trim() === '' || !Number.isFinite(n)) return fallback
  return Math.max(min, n)
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
/** R$ 1.234,56 */
export const fmtBRL = (n: number) => BRL.format(round2(n))

export function itemTotal(quantidade: number, precoUnit: number): number {
  return round2(quantidade * precoUnit)
}

export function subtotal(itens: Pick<ItemProposta, 'quantidade' | 'preco_unit'>[]): number {
  return round2(itens.reduce((s, i) => s + itemTotal(i.quantidade, i.preco_unit), 0))
}

/** Valor à vista = subtotal − desconto (nunca negativo). */
export function valorAvista(sub: number, desconto: number): number {
  return Math.max(0, round2(sub - desconto))
}

/** Valor a prazo = à vista × (1 + pct/100), em centavos. */
export function valorPrazo(avista: number, acrescimoPct: number): number {
  return round2(avista * (1 + acrescimoPct / 100))
}

/** Valor de cada parcela (total ÷ parcelas, em centavos). */
export function valorParcela(total: number, parcelas: number): number {
  return parcelas > 0 ? round2(total / parcelas) : round2(total)
}

export interface Totais {
  subtotal: number
  desconto: number
  avista: number
  prazo: number
  parcelas: number
  parcela: number
}

export function calcTotais(
  itens: Pick<ItemProposta, 'quantidade' | 'preco_unit'>[], desconto: number, acrescimoPct: number, parcelas: number,
): Totais {
  const sub = subtotal(itens)
  const avista = valorAvista(sub, desconto)
  const prazo = valorPrazo(avista, acrescimoPct)
  const n = Math.max(1, Math.trunc(parcelas) || 1)
  return { subtotal: sub, desconto: round2(desconto), avista, prazo, parcelas: n, parcela: valorParcela(prazo, n) }
}

// ---------------------------------------------------------------------------
// Datas (ISO yyyy-mm-dd, sem fuso)
// ---------------------------------------------------------------------------

export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** data + dias (ISO). Data inválida devolve ''. */
export function addDays(iso: string, dias: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  if (!m) return ''
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Math.trunc(dias || 0)))
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

/** Valores da migração 0006 — usados enquanto a linha de configuração não carrega/existe. */
export const CONFIG_PADRAO: ConfigEmpresa = {
  id: 1,
  razao_social: 'FUTURO FACILITE PRESTAÇÃO DE SERVIÇO E APOIO LTDA',
  nome_fantasia: 'Futuro Facilite Treinamentos',
  cnpj: '57.717.005/0001-57',
  endereco: 'QS 401, Conjunto G, Lote 06/07, Sala 303, Samambaia Norte, Brasília/DF',
  cep: '72.319-527',
  cidade_uf: 'Brasília/DF',
  representante_nome: '',
  representante_rg: '',
  representante_cpf: '',
  email: 'futurofacilite@gmail.com',
  telefone: '(61) 98585-0519',
  acrescimo_prazo_pct: 20,
  parcelas_prazo: 12,
  validade_proposta_dias: 30,
  dia_vencimento: 10,
  vigencia_meses: 12,
  foro: 'Circunscrição Judiciária de Brasília/DF',
  condicoes_proposta: null,
  clausulas_contrato: null,
}

/** Normaliza a linha do banco (numeric pode vir como string) e preenche ausências com o padrão. */
export function normConfig(c: Partial<ConfigEmpresa> | null | undefined): ConfigEmpresa {
  const b = { ...CONFIG_PADRAO, ...(c ?? {}) } as ConfigEmpresa
  return {
    ...b,
    acrescimo_prazo_pct: parseNum(b.acrescimo_prazo_pct),
    parcelas_prazo: parseIntMin(b.parcelas_prazo, CONFIG_PADRAO.parcelas_prazo, 1),
    validade_proposta_dias: parseIntMin(b.validade_proposta_dias, CONFIG_PADRAO.validade_proposta_dias, 0),
    dia_vencimento: parseIntMin(b.dia_vencimento, CONFIG_PADRAO.dia_vencimento, 1),
    vigencia_meses: parseIntMin(b.vigencia_meses, CONFIG_PADRAO.vigencia_meses, 1),
  }
}

/** Condições da proposta: específicas do orçamento → configuração → padrão do sistema. */
export function resolveCondicoes(propria: string[] | null | undefined, config: ConfigEmpresa | null | undefined): string[] {
  return propria ?? config?.condicoes_proposta ?? CONDICOES_PROPOSTA_PADRAO
}

/** Cláusulas do contrato: cópia do contrato → configuração → padrão do sistema. */
export function resolveClausulas(
  propria: ClausulaContrato[] | null | undefined, config: ConfigEmpresa | null | undefined,
): ClausulaContrato[] {
  return propria ?? config?.clausulas_contrato ?? CLAUSULAS_CONTRATO_PADRAO
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

/** Item de orçamento a partir de um serviço da tabela (quantidade = colaboradores se for por colaborador). */
export function itemFromServico(s: Servico, colaboradores: number): ItemProposta {
  const quantidade = s.unidade === 'por_colaborador' ? Math.max(0, colaboradores) : 1
  const preco_unit = round2(parseNum(s.preco))
  return {
    servico_id: s.id,
    nome: s.nome,
    descricao_proposta: s.descricao_proposta,
    descricao_contrato: s.descricao_contrato,
    unidade: s.unidade,
    quantidade,
    preco_unit,
    total: itemTotal(quantidade, preco_unit),
  }
}

/** Recalcula o total gravado de cada item. */
export function withTotals(itens: ItemProposta[]): ItemProposta[] {
  return itens.map((i) => {
    const quantidade = parseNum(i.quantidade)
    const preco_unit = round2(parseNum(i.preco_unit))
    return { ...i, quantidade, preco_unit, total: itemTotal(quantidade, preco_unit) }
  })
}

/** Itens do objeto do contrato: descricao_contrato de cada item, separada por ';', sem vazios nem repetidos. */
export function servicosContrato(itens: Pick<ItemProposta, 'descricao_contrato' | 'nome'>[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const i of itens) {
    for (const parte of (i.descricao_contrato ?? '').split(';')) {
      const t = parte.trim()
      const k = t.toLowerCase()
      if (t && !seen.has(k)) {
        seen.add(k)
        out.push(t)
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Contrato a partir do orçamento
// ---------------------------------------------------------------------------

export type FormaPagamento = 'avista' | 'prazo'

export interface ValoresContrato {
  valor_total: number
  parcelas: number
  valor_parcela: number
}

/** À vista → 1 × valor à vista; a prazo → parcelas × (valor a prazo ÷ parcelas). */
export function valoresDaForma(p: Pick<Proposta, 'valor_avista' | 'valor_prazo' | 'parcelas'>, forma: FormaPagamento): ValoresContrato {
  if (forma === 'avista') {
    const v = round2(parseNum(p.valor_avista))
    return { valor_total: v, parcelas: 1, valor_parcela: v }
  }
  const n = Math.max(1, Math.trunc(parseNum(p.parcelas)) || 1)
  const v = round2(parseNum(p.valor_prazo))
  return { valor_total: v, parcelas: n, valor_parcela: valorParcela(v, n) }
}

export type ContratoNovo = Omit<Contrato, 'id' | 'numero'>

export function contratoFromProposta(p: Proposta, forma: FormaPagamento, config: ConfigEmpresa | null | undefined): ContratoNovo {
  const c = normConfig(config)
  return {
    condominio_id: p.condominio_id,
    proposta_id: p.id,
    data_assinatura: null,
    vigencia_meses: c.vigencia_meses,
    colaboradores: Math.max(0, Math.trunc(parseNum(p.colaboradores))),
    servicos: servicosContrato(p.itens ?? []),
    ...valoresDaForma(p, forma),
    dia_vencimento: c.dia_vencimento,
    clausulas: null,
    status: 'rascunho',
    observacoes: '',
  }
}

// ---------------------------------------------------------------------------
// Dados dos documentos (PDF)
// ---------------------------------------------------------------------------

type CondoComercial = Pick<
  Condominio,
  'razao_social' | 'nome_fantasia' | 'cnpj' | 'endereco' | 'cep' | 'cidade_uf' | 'responsavel_empresa' | 'email_empresa' | 'contato_empresa'
> & { sindico_cpf?: string }

export function clienteFromCondo(c: CondoComercial): ClienteComercial {
  const cpf = onlyDigits(c.sindico_cpf)
  return {
    razaoSocial: c.razao_social ?? '',
    nomeFantasia: c.nome_fantasia ?? '',
    cnpj: c.cnpj ?? '',
    endereco: c.endereco ?? '',
    cep: c.cep ?? '',
    cidadeUf: c.cidade_uf ?? '',
    sindicoNome: c.responsavel_empresa ?? '',
    sindicoCpf: cpf.length === 11 ? formatCpf(cpf) : (c.sindico_cpf ?? ''),
    email: c.email_empresa ?? '',
    telefone: c.contato_empresa ?? '',
  }
}

export function buildPropostaDocData(
  p: Proposta, config: ConfigEmpresa | null | undefined, condo: CondoComercial, assetsBase: string,
): PropostaDocData {
  const empresa = normConfig(config)
  const validade = p.validade || addDays(p.data, empresa.validade_proposta_dias)
  return {
    assetsBase,
    empresa,
    cliente: clienteFromCondo(condo),
    numero: p.numero || 'Rascunho',
    data: p.data,
    validade,
    colaboradores: parseNum(p.colaboradores),
    itens: withTotals(p.itens ?? []),
    desconto: round2(parseNum(p.desconto)),
    valorAvista: round2(parseNum(p.valor_avista)),
    acrescimoPct: parseNum(p.acrescimo_pct),
    parcelas: Math.max(1, Math.trunc(parseNum(p.parcelas)) || 1),
    valorPrazo: round2(parseNum(p.valor_prazo)),
    condicoes: resolveCondicoes(p.condicoes, config),
    observacoes: p.observacoes ?? '',
  }
}

export function buildContratoDocData(
  c: Contrato, config: ConfigEmpresa | null | undefined, condo: CondoComercial, assetsBase: string,
): ContratoDocData {
  return {
    assetsBase,
    empresa: normConfig(config),
    cliente: clienteFromCondo(condo),
    numero: c.numero || 'Rascunho',
    dataAssinatura: c.data_assinatura ?? '',
    vigenciaMeses: parseIntMin(c.vigencia_meses, CONFIG_PADRAO.vigencia_meses, 1),
    colaboradores: parseNum(c.colaboradores),
    servicos: c.servicos ?? [],
    valorTotal: round2(parseNum(c.valor_total)),
    parcelas: Math.max(1, Math.trunc(parseNum(c.parcelas)) || 1),
    valorParcela: round2(parseNum(c.valor_parcela)),
    diaVencimento: parseIntMin(c.dia_vencimento, CONFIG_PADRAO.dia_vencimento, 1),
    clausulas: resolveClausulas(c.clausulas, config),
  }
}

/** Dados que faltam e saem como "________" no contrato (aviso, não bloqueia). */
export function pendenciasContrato(condo: CondoComercial, config: ConfigEmpresa | null | undefined): string[] {
  const out: string[] = []
  if (!condo.cnpj?.trim()) out.push('CNPJ do condomínio')
  if (!condo.endereco?.trim()) out.push('endereço do condomínio')
  if (!condo.responsavel_empresa?.trim()) out.push('nome do síndico')
  if (!onlyDigits(condo.sindico_cpf)) out.push('CPF do síndico')
  const c = config ?? null
  if (!c?.representante_nome?.trim()) out.push('nome do representante legal da contratada')
  if (!c?.representante_rg?.trim()) out.push('RG do representante legal')
  if (!onlyDigits(c?.representante_cpf)) out.push('CPF do representante legal')
  return out
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export const STATUS_PROPOSTA: Record<StatusProposta, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: '' },
  enviada: { label: 'Enviada', cls: 'warn' },
  aprovada: { label: 'Aprovada', cls: 'ok' },
  recusada: { label: 'Recusada', cls: 'bad' },
}

export const STATUS_CONTRATO: Record<StatusContrato, { label: string; cls: string }> = {
  rascunho: { label: 'Rascunho', cls: '' },
  emitido: { label: 'Emitido', cls: 'warn' },
  assinado: { label: 'Assinado', cls: 'ok' },
  encerrado: { label: 'Encerrado', cls: '' },
}
