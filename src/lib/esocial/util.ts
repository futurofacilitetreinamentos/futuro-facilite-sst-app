// Utilitários do módulo eSocial: documentos (CPF/CNPJ), datas, textos e o
// identificador do evento (REGRA_VALIDA_ID_EVENTO, leiautes S-1.3).

import { formatCpf, onlyDigits, validCpf } from '../cpf'

export const digitos = (v: unknown) => onlyDigits(v == null ? '' : String(v))

/** CPF válido (reaproveita lib/cpf.ts). */
export const cpfValido = (v: string) => validCpf(v)

/** CNPJ normalizado: 14 posições, as 12 primeiras podem ser alfanuméricas (CNPJ alfanumérico, IN RFB 2.229/2024). */
export const cnpjNormalizado = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** CNPJ válido, numérico ou alfanumérico (valor de cada caractere = código ASCII − 48). */
export function cnpjValido(v: string): boolean {
  const c = cnpjNormalizado(v)
  if (!/^[A-Z0-9]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false
  const val = (ch: string) => ch.charCodeAt(0) - 48
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let soma = 0
    for (let i = 0; i < n; i++) soma += val(c[i]) * pesos[i]
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13])
}

export const fmtCpf = (v: string) => (onlyDigits(v).length === 11 ? formatCpf(v) : v)

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export function ufValida(v: string | null | undefined): string | null {
  const u = String(v ?? '').trim().toUpperCase()
  return (UFS as readonly string[]).includes(u) ? u : null
}

/** Texto em uma linha, sem caracteres de controle, cortado em `max` caracteres. */
export function texto(v: unknown, max: number): string {
  // eslint-disable-next-line no-control-regex -- remove caracteres de controle, proibidos no XML
  const t = String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max).trimEnd() : t
}

/** Data ISO (AAAA-MM-DD) ou ''. */
export function dataIso(v: unknown): string {
  const t = String(v ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t + 'T00:00:00Z')) ? t : ''
}

export function hojeIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function somaDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export const fmtData = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

/** Número em texto pt-BR ("85,2", "1.234,5") → number, ou null. */
export function numero(v: unknown): number | null {
  let t = String(v ?? '').trim().replace(/\s/g, '')
  if (!t) return null
  const m = /[-+]?[\d.,]+/.exec(t)
  if (!m) return null
  t = m[0]
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Decimal do leiaute (até 4 casas, ponto decimal). */
export function decimal(n: number): string {
  return String(Math.round(n * 10000) / 10000)
}

/**
 * Id do evento — REGRA_VALIDA_ID_EVENTO (leiautes S-1.3):
 * "ID" + T (1 = CNPJ) + 14 posições (CNPJ raiz de 8 posições, completado com zeros à direita)
 * + AAAAMMDDHHMMSS da geração + sequencial de 5 dígitos.
 */
export function idEvento(nrInscEmpregador: string, gerado: Date, seq: number): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  const quando = `${gerado.getFullYear()}${p(gerado.getMonth() + 1)}${p(gerado.getDate())}${p(gerado.getHours())}${p(gerado.getMinutes())}${p(gerado.getSeconds())}`
  return `ID1${nrInscEmpregador.padEnd(14, '0')}${quando}${p(seq % 100000, 5)}`
}
