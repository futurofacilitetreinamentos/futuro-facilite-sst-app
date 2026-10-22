// Prazos de saúde e segurança: periodicidade do ASO (NR-7) e validade de treinamentos.
// Funções puras (sem React / Supabase) para serem testadas isoladamente.
//
// Regras do ASO periódico (NR-7, redação de 2020/2022, item 7.5.8):
//  - expostos a riscos ocupacionais do PGR (ou doentes crônicos): anual, ou intervalo menor a
//    critério do médico — no app vem do PCMSO: periodicidade do exame clínico (0295) do bloco da
//    função (Anual 12 meses, Semestral 6, Bienal 24);
//  - demais empregados: a cada 2 anos (o PCMSO já marca "Bienal" quando a função não tem risco).
//  - a regra antiga por idade (menores de 18 e maiores de 45 anos = anual) saiu da NR-7 em 2020;
//    não é aplicada aqui. O médico pode encurtar o prazo no próprio PCMSO.
//  - sem periodicidade reconhecível, usa 12 meses (o mais conservador entre os usuais).
// O prazo conta a partir do último ASO que inclui exame clínico completo: admissional, periódico,
// retorno ao trabalho ou mudança de risco. Monitoração pontual não reinicia o prazo.
// Depois do demissional, ou com o trabalhador desligado, não há próximo periódico.
import type { Aso, ExameAso, Trabalhador } from './types'
import type { PcmsoExame, PcmsoPlan } from '../reports/pcmso'

export const MESES_PADRAO = 12
/** Janela de aviso: "vence em N dias" quando faltam até 30 dias. */
export const JANELA_AVISO_DIAS = 30

const DAY = 86_400_000

export function hojeISO(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function parse(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1)
}

/** Soma meses a uma data ISO; o dia é limitado ao último dia do mês (31/01 + 1 = 28/02). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12), nm = total % 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** Dias de `de` até `ate` (positivo = no futuro). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((parse(ate) - parse(de)) / DAY)
}

/** 'Anual' 12 · 'Semestral' 6 · 'Bienal' 24 · outro texto → 12. */
export function mesesDoPeriodo(periodo: string | null | undefined): number {
  const p = String(periodo || '').toLowerCase()
  if (p.includes('semest')) return 6
  if (p.includes('bien') || p.includes('2 anos')) return 24
  if (p.includes('anual')) return 12
  return MESES_PADRAO
}

const CLINICO = '0295'

/** Exames do PCMSO para uma função (pelo nome). Sem função ou fora do plano: só o bloco único, se houver. */
export function examesDaFuncao(plan: PcmsoPlan | null | undefined, funcaoNome: string | null | undefined): PcmsoExame[] {
  if (!plan) return []
  const f = funcaoNome ? plan.byFunc.find((x) => x.funcao === funcaoNome) : undefined
  if (f) return f.exames
  return plan.byFunc.length === 1 ? plan.byFunc[0].exames : []
}

/** Meses entre periódicos de uma função: periodicidade do exame clínico no PCMSO (padrão 12). */
export function mesesPeriodico(plan: PcmsoPlan | null | undefined, funcaoNome: string | null | undefined): number {
  const exames = examesDaFuncao(plan, funcaoNome)
  const clinico = exames.find((e) => e.esocial === CLINICO) ?? exames[0]
  return clinico ? mesesDoPeriodo(clinico.periodo) : MESES_PADRAO
}

/** Trabalhador desligado: data de demissão preenchida e já alcançada. */
export function desligado(t: Pick<Trabalhador, 'data_demissao'>, hoje = hojeISO()): boolean {
  return Boolean(t.data_demissao && t.data_demissao.slice(0, 10) <= hoje)
}

const REINICIA: Aso['tipo'][] = ['admissional', 'periodico', 'retorno', 'mudanca_risco']

export type StatusAsoKey = 'em_dia' | 'vencendo' | 'vencido' | 'sem_admissional' | 'encerrado'

export interface StatusAso {
  key: StatusAsoKey
  /** Último ASO (qualquer tipo), o mais recente pela data */
  ultimo: Aso | null
  /** Data do próximo periódico (null = não se aplica) */
  proximo: string | null
  /** Dias até o próximo periódico (negativo = vencido) */
  dias: number | null
  meses: number
  label: string
  /** classe do badge: ok | warn | bad | '' */
  cls: 'ok' | 'warn' | 'bad' | ''
}

const porData = (a: Aso, b: Aso) => b.data.localeCompare(a.data)

/**
 * Situação do ASO de um trabalhador. Sem nenhum ASO registrado = "sem admissional"
 * (com histórico já registrado, assume-se que o admissional foi feito antes do sistema).
 */
export function statusAso(
  t: Pick<Trabalhador, 'id' | 'data_demissao'>, asos: Aso[], meses: number, hoje = hojeISO(), janela = JANELA_AVISO_DIAS,
): StatusAso {
  const dele = asos.filter((a) => a.trabalhador_id === t.id && a.data).sort(porData)
  const ultimo = dele[0] ?? null
  const base = { ultimo, meses }
  if (desligado(t, hoje) || ultimo?.tipo === 'demissional') {
    return { ...base, key: 'encerrado', proximo: null, dias: null, label: ultimo?.tipo === 'demissional' ? 'demissional realizado' : 'desligado', cls: '' }
  }
  if (!ultimo) return { ...base, key: 'sem_admissional', proximo: null, dias: null, label: 'sem admissional', cls: 'bad' }
  const ref = dele.find((a) => REINICIA.includes(a.tipo)) ?? ultimo
  const proximo = addMonths(ref.data, meses)
  const dias = diasEntre(hoje, proximo)
  if (dias < 0) return { ...base, key: 'vencido', proximo, dias, label: `vencido há ${-dias} dia${dias === -1 ? '' : 's'}`, cls: 'bad' }
  if (dias <= janela) return { ...base, key: 'vencendo', proximo, dias, label: dias === 0 ? 'vence hoje' : `vence em ${dias} dia${dias === 1 ? '' : 's'}`, cls: 'warn' }
  return { ...base, key: 'em_dia', proximo, dias, label: 'em dia', cls: 'ok' }
}

/** Chave de um exame para comparar entre ASOs: código da tabela 27, senão o nome. */
const exameKey = (e: Pick<ExameAso, 'codigo' | 'nome'>) => (e.codigo || e.nome).trim().toLowerCase()

/**
 * Exames de um novo ASO a partir do plano do PCMSO. A primeira vez que o exame é feito pelo
 * trabalhador é "referencial"; as seguintes, "sequencial" (eSocial S-2220, ordExame 1/2).
 * Exames do tipo admissional/periódico/demissional seguem a coluna "tipos" do PCMSO (A/P/D…).
 */
export function examesIniciais(
  plano: PcmsoExame[], data: string, tipo: Aso['tipo'], anteriores: Aso[], trabalhadorId: string, ignorarAsoId?: string,
): ExameAso[] {
  const letra: Record<Aso['tipo'], string> = { admissional: 'A', periodico: 'P', retorno: 'R', mudanca_risco: 'M', demissional: 'D', monitoracao: '' }
  const l = letra[tipo]
  const doTipo = plano.filter((e) => !l || !e.tipos || e.tipos.split('/').map((x) => x.trim()).includes(l))
  const lista = doTipo.length ? doTipo : plano
  return lista.map((e) => ({
    codigo: e.esocial, nome: e.exame, data,
    ordem: ordemExame({ codigo: e.esocial, nome: e.exame }, data, anteriores, trabalhadorId, ignorarAsoId),
    resultado: '',
  }))
}

export function ordemExame(
  exame: Pick<ExameAso, 'codigo' | 'nome'>, data: string, anteriores: Aso[], trabalhadorId: string, ignorarAsoId?: string,
): ExameAso['ordem'] {
  const k = exameKey(exame)
  const feito = anteriores.some((a) =>
    a.trabalhador_id === trabalhadorId && a.id !== ignorarAsoId && (!data || !a.data || a.data <= data) &&
    (a.exames ?? []).some((x) => exameKey(x) === k),
  )
  return feito ? 'sequencial' : 'referencial'
}

// ---------------------------------------------------------------------------
// Treinamentos
// ---------------------------------------------------------------------------

export const NRS_TREINAMENTO: { value: string; label: string; titulo: string }[] = [
  { value: 'NR-01', label: 'NR-01 — Integração / ordem de serviço', titulo: 'Integração de segurança e ordem de serviço' },
  { value: 'NR-05', label: 'NR-05 — CIPA / designado', titulo: 'Designado da CIPA' },
  { value: 'NR-06', label: 'NR-06 — EPI', titulo: 'Uso, guarda e conservação de EPI' },
  { value: 'NR-10', label: 'NR-10 — Eletricidade', titulo: 'Segurança em instalações e serviços em eletricidade' },
  { value: 'NR-12', label: 'NR-12 — Máquinas e equipamentos', titulo: 'Segurança em máquinas e equipamentos' },
  { value: 'NR-17', label: 'NR-17 — Ergonomia', titulo: 'Ergonomia' },
  { value: 'NR-18', label: 'NR-18 — Construção / obras', titulo: 'Segurança em obras e reformas' },
  { value: 'NR-23', label: 'NR-23 — Incêndio / brigada', titulo: 'Prevenção e combate a incêndio / brigada' },
  { value: 'NR-33', label: 'NR-33 — Espaço confinado', titulo: 'Trabalhador autorizado e vigia em espaço confinado' },
  { value: 'NR-35', label: 'NR-35 — Trabalho em altura', titulo: 'Trabalho em altura' },
  { value: 'outro', label: 'Outro', titulo: '' },
]

/**
 * Validade SUGERIDA (meses) por NR — o técnico confirma no formulário:
 *  NR-35 treinamento periódico a cada 2 anos; NR-10 reciclagem bienal (10.8.8.2);
 *  NR-33 treinamento periódico anual; NR-05 mandato anual da CIPA / designado.
 * As demais NRs não têm prazo fixo de reciclagem (refazer em mudança de função, de
 * procedimento, após acidente ou retorno de afastamento) — fica em branco.
 */
export const VALIDADE_SUGERIDA_MESES: Record<string, number> = { 'NR-35': 24, 'NR-10': 24, 'NR-33': 12, 'NR-05': 12 }

export function validadeSugerida(nr: string, data: string | null | undefined): string | null {
  const m = VALIDADE_SUGERIDA_MESES[nr]
  return m && data ? addMonths(data, m) : null
}

export type StatusValidadeKey = 'valido' | 'vencendo' | 'vencido' | 'sem_validade'

export interface StatusValidade { key: StatusValidadeKey; dias: number | null; label: string; cls: 'ok' | 'warn' | 'bad' | '' }

/** Validade genérica (treinamento, CA de EPI, laudo). */
export function statusValidade(validade: string | null | undefined, hoje = hojeISO(), janela = JANELA_AVISO_DIAS): StatusValidade {
  if (!validade) return { key: 'sem_validade', dias: null, label: 'sem validade', cls: '' }
  const dias = diasEntre(hoje, validade.slice(0, 10))
  if (dias < 0) return { key: 'vencido', dias, label: `vencido há ${-dias} dia${dias === -1 ? '' : 's'}`, cls: 'bad' }
  if (dias <= janela) return { key: 'vencendo', dias, label: dias === 0 ? 'vence hoje' : `vence em ${dias} dia${dias === 1 ? '' : 's'}`, cls: 'warn' }
  return { key: 'valido', dias, label: 'válido', cls: 'ok' }
}
