// Importação / exportação da lista de trabalhadores em planilha (colar do Excel/Sheets ou arquivo .csv)
import { formatCpf, onlyDigits, validCpf } from './cpf'
import type { Funcao, Trabalhador } from './types'

// ---------------------------------------------------------------------------
// Categorias do eSocial (Tabela 01 — Categorias de trabalhadores, leiaute S-1.x) mais usadas em condomínio
// ---------------------------------------------------------------------------

export const CATEGORIAS_ESOCIAL: { value: string; label: string }[] = [
  { value: '101', label: '101 — Empregado (geral)' },
  { value: '102', label: '102 — Empregado: trabalhador rural por pequeno prazo' },
  { value: '103', label: '103 — Empregado: aprendiz' },
  { value: '104', label: '104 — Empregado: doméstico' },
  { value: '105', label: '105 — Empregado: contrato por prazo determinado (Lei 9.601/98)' },
  { value: '106', label: '106 — Trabalhador temporário (Lei 6.019/74)' },
  { value: '111', label: '111 — Empregado: contrato intermitente' },
  { value: '701', label: '701 — Contribuinte individual: autônomo' },
  { value: '721', label: '721 — Contribuinte individual: diretor não empregado, com FGTS' },
  { value: '722', label: '722 — Contribuinte individual: diretor não empregado, sem FGTS' },
  { value: '901', label: '901 — Estagiário' },
]

export const categoriaLabel = (c: string) => CATEGORIAS_ESOCIAL.find((x) => x.value === c)?.label ?? c

// ---------------------------------------------------------------------------
// Texto: decodificação, delimitador e leitura de CSV/TSV
// ---------------------------------------------------------------------------

/** Decodifica um arquivo .csv: UTF-8 (com ou sem BOM); se não for UTF-8 válido, Latin-1/Windows-1252 (Excel antigo). */
export function decodeBytes(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes)
  }
  return stripBom(text)
}

export const stripBom = (t: string) => (t.charCodeAt(0) === 0xfeff ? t.slice(1) : t)

/** Tab (colado do Excel/Sheets) > ponto e vírgula (CSV do Excel em português) > vírgula. */
export function detectDelimiter(text: string): '\t' | ';' | ',' {
  const first = firstLine(text)
  const count = (ch: string) => {
    let n = 0, q = false
    for (const c of first) {
      if (c === '"') q = !q
      else if (!q && c === ch) n++
    }
    return n
  }
  const tabs = count('\t'), semis = count(';'), commas = count(',')
  if (tabs > 0 && tabs >= semis && tabs >= commas) return '\t'
  if (semis > 0 && semis >= commas) return ';'
  if (commas > 0) return ','
  return '\t'
}

function firstLine(text: string) {
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') q = !q
    else if (!q && (c === '\n' || c === '\r')) return text.slice(0, i)
  }
  return text
}

/** Lê texto delimitado com aspas no padrão CSV ("" = aspas literal; quebras de linha dentro de aspas). */
export function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else q = false
      } else cell += c
      continue
    }
    if (c === '"' && cell.trim() === '') { q = true; cell = ''; continue }
    if (c === delim) { row.push(cell); cell = ''; continue }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
      continue
    }
    cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''))
}

/** minúsculas, sem acento, só letras/números separados por um espaço */
export function normalizeKey(s: string) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Colunas
// ---------------------------------------------------------------------------

export type Coluna =
  | 'nome' | 'cpf' | 'matricula' | 'funcao' | 'categoria' | 'sexo'
  | 'data_nascimento' | 'data_admissao' | 'data_demissao' | 'observacoes'

/** Cabeçalho do modelo/exportação (nessa ordem) e apelidos aceitos na importação. */
export const COLUNAS: { key: Coluna; header: string; aliases: string[] }[] = [
  { key: 'nome', header: 'Nome', aliases: ['nome', 'nome completo', 'trabalhador', 'empregado', 'colaborador', 'funcionario', 'nome do trabalhador', 'nome do empregado', 'nome do funcionario'] },
  { key: 'cpf', header: 'CPF', aliases: ['cpf', 'cpf do trabalhador', 'n cpf', 'no cpf', 'numero cpf', 'numero do cpf'] },
  { key: 'matricula', header: 'Matrícula', aliases: ['matricula', 'registro', 'mat', 'n matricula', 'no matricula', 'codigo', 'cod'] },
  { key: 'funcao', header: 'Função', aliases: ['funcao', 'cargo', 'cargo funcao', 'funcao cargo', 'ocupacao'] },
  { key: 'categoria', header: 'Categoria eSocial', aliases: ['categoria', 'categoria esocial', 'cod categoria', 'codigo categoria', 'categoria do trabalhador'] },
  { key: 'sexo', header: 'Sexo', aliases: ['sexo', 'genero'] },
  { key: 'data_nascimento', header: 'Data de nascimento', aliases: ['nascimento', 'data de nascimento', 'data nascimento', 'dt nascimento', 'dt nasc', 'data nasc', 'nasc'] },
  { key: 'data_admissao', header: 'Data de admissão', aliases: ['admissao', 'data de admissao', 'data admissao', 'dt admissao', 'admitido em'] },
  { key: 'data_demissao', header: 'Data de desligamento', aliases: ['desligamento', 'data de desligamento', 'data desligamento', 'demissao', 'data de demissao', 'data demissao', 'dt demissao', 'dt desligamento', 'rescisao', 'data de rescisao'] },
  { key: 'observacoes', header: 'Observações', aliases: ['observacoes', 'observacao', 'obs'] },
]

const ALIAS = new Map<string, Coluna>()
for (const c of COLUNAS) for (const a of c.aliases) ALIAS.set(a, c.key)

export function colunaDoCabecalho(h: string): Coluna | null {
  const k = normalizeKey(h)
  return ALIAS.get(k) ?? ALIAS.get(k.replace(/^(n|no|num|numero) /, '')) ?? null
}

// ---------------------------------------------------------------------------
// Valores
// ---------------------------------------------------------------------------

const iso = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  if (y < 1900 || y > 2100) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** dd/mm/aaaa (ou dd-mm-aaaa, dd.mm.aaaa, ano com 2 dígitos) e aaaa-mm-dd. undefined = vazio; null = inválida. */
export function parseData(v: string): string | null | undefined {
  const s = v.trim()
  if (!s) return undefined
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s)
  if (m) {
    let y = +m[3]
    if (m[3].length === 2) y += y > (new Date().getFullYear() % 100) ? 1900 : 2000
    return iso(y, +m[2], +m[1])
  }
  return null
}

export function parseSexo(v: string): '' | 'M' | 'F' | null {
  const k = normalizeKey(v)
  if (!k) return ''
  if (['m', 'masc', 'masculino', 'h', 'homem'].includes(k)) return 'M'
  if (['f', 'fem', 'feminino', 'mulher'].includes(k)) return 'F'
  return null
}

/** "101", "101 - Empregado", "Empregado - geral"… Vazio = 101. */
export function parseCategoria(v: string): string | null {
  const s = v.trim()
  if (!s) return '101'
  const m = /^(\d{3})\b/.exec(s)
  if (m) return m[1]
  const k = normalizeKey(s)
  if (k.includes('aprendiz')) return '103'
  if (k.includes('domestic')) return '104'
  if (k.includes('temporario')) return '106'
  if (k.includes('intermitente')) return '111'
  if (k.includes('estagi')) return '901'
  if (k.includes('autonomo')) return '701'
  if (k.includes('empregado') || k.includes('clt')) return '101'
  return null
}

/** Só dígitos; CPFs com 9–10 dígitos (Excel corta os zeros à esquerda) são completados. */
export function parseCpf(v: string): { cpf: string; completado: boolean } {
  let d = onlyDigits(v)
  let completado = false
  if (d.length >= 9 && d.length < 11) { d = d.padStart(11, '0'); completado = true }
  return { cpf: d, completado }
}

// ---------------------------------------------------------------------------
// Leitura da planilha
// ---------------------------------------------------------------------------

export interface LinhaPlanilha {
  /** número da linha na planilha (cabeçalho = 1) */
  linha: number
  valores: Partial<Record<Coluna, string>>
}

export interface Planilha {
  delimitador: '\t' | ';' | ','
  cabecalho: string[]
  /** índice da coluna da planilha → campo */
  mapa: (Coluna | null)[]
  ignoradas: string[]
  linhas: LinhaPlanilha[]
}

export function lerPlanilha(texto: string): Planilha {
  const t = stripBom(texto)
  const delimitador = detectDelimiter(t)
  const [cab = [], ...resto] = parseDelimited(t, delimitador)
  const usadas = new Set<Coluna>()
  const mapa = cab.map((h) => {
    const c = colunaDoCabecalho(h)
    if (!c || usadas.has(c)) return null
    usadas.add(c)
    return c
  })
  const linhas = resto.map((r, i) => {
    const valores: Partial<Record<Coluna, string>> = {}
    mapa.forEach((c, j) => { if (c && r[j] !== undefined) valores[c] = r[j] })
    return { linha: i + 2, valores }
  })
  return { delimitador, cabecalho: cab, mapa, ignoradas: cab.filter((_, j) => !mapa[j] && cab[j] !== ''), linhas }
}

// ---------------------------------------------------------------------------
// Análise: o que cada linha vai fazer no banco
// ---------------------------------------------------------------------------

export type TrabalhadorCampos = Omit<Trabalhador, 'id' | 'condominio_id'>

export interface LinhaAnalisada {
  linha: number
  nome: string
  cpf: string
  acao: 'novo' | 'atualizar' | 'erro'
  /** trabalhador existente que será atualizado */
  existenteId?: string
  erros: string[]
  avisos: string[]
  /** nome da função como veio na planilha */
  funcaoTexto: string
  /** função encontrada no cadastro (null = não encontrada ou vazia) */
  funcaoId: string | null
  /** campos lidos (só os preenchidos na planilha) */
  campos: Partial<TrabalhadorCampos>
}

export interface Analise {
  linhas: LinhaAnalisada[]
  /** nomes de funções da planilha que não existem no cadastro (sem repetir) */
  funcoesFaltando: string[]
  faltaColunaNome: boolean
}

export const chaveFuncao = (nome: string) => normalizeKey(nome)

export function analisarPlanilha(p: Planilha, existentes: Trabalhador[], funcoes: Funcao[]): Analise {
  const faltaColunaNome = !p.mapa.includes('nome')
  const porCpf = new Map(existentes.filter((t) => t.cpf).map((t) => [t.cpf, t]))
  const porMatricula = new Map(existentes.filter((t) => t.matricula).map((t) => [normalizeKey(t.matricula), t]))
  const funcaoPorChave = new Map(funcoes.map((f) => [chaveFuncao(f.nome), f]))
  const cpfsVistos = new Map<string, number>()
  const faltando = new Map<string, string>()

  const linhas = p.linhas.map((l): LinhaAnalisada => {
    const v = l.valores
    const erros: string[] = []
    const avisos: string[] = []
    const campos: Partial<TrabalhadorCampos> = {}
    const nome = (v.nome ?? '').replace(/\s+/g, ' ').trim()
    if (!nome) erros.push('Sem nome')
    else campos.nome = nome

    const { cpf, completado } = parseCpf(v.cpf ?? '')
    if (cpf) {
      if (!validCpf(cpf)) erros.push(`CPF inválido (${v.cpf})`)
      else {
        const antes = cpfsVistos.get(cpf)
        if (antes) erros.push(`CPF repetido na planilha (linha ${antes})`)
        else cpfsVistos.set(cpf, l.linha)
        if (completado) avisos.push('CPF completado com zeros à esquerda')
        campos.cpf = cpf
      }
    } else if (v.cpf?.trim()) erros.push(`CPF inválido (${v.cpf})`)

    const matricula = (v.matricula ?? '').trim()
    if (matricula) campos.matricula = matricula

    for (const k of ['data_nascimento', 'data_admissao', 'data_demissao'] as const) {
      const d = parseData(v[k] ?? '')
      if (d === null) erros.push(`Data inválida em ${COLUNAS.find((c) => c.key === k)!.header.toLowerCase()} (${v[k]})`)
      else if (d) campos[k] = d
    }
    if (campos.data_admissao && campos.data_demissao && campos.data_demissao < campos.data_admissao) {
      erros.push('Desligamento antes da admissão')
    }

    if (v.sexo !== undefined) {
      const s = parseSexo(v.sexo)
      if (s === null) avisos.push(`Sexo não reconhecido (${v.sexo}), ignorado`)
      else if (s) campos.sexo = s
    }

    if (v.categoria !== undefined && v.categoria.trim()) {
      const c = parseCategoria(v.categoria)
      if (c === null) avisos.push(`Categoria não reconhecida (${v.categoria}), ignorada`)
      else campos.categoria = c
    }

    const obs = (v.observacoes ?? '').trim()
    if (obs) campos.observacoes = obs

    const funcaoTexto = (v.funcao ?? '').replace(/\s+/g, ' ').trim()
    let funcaoId: string | null = null
    if (funcaoTexto) {
      const f = funcaoPorChave.get(chaveFuncao(funcaoTexto))
      if (f) funcaoId = f.id
    }

    // CPF identifica o trabalhador; sem CPF, a matrícula
    const existente = (campos.cpf && porCpf.get(campos.cpf)) || (!campos.cpf && matricula ? porMatricula.get(normalizeKey(matricula)) : undefined)
    if (existente && !campos.cpf && existente.cpf) avisos.push('Encontrado pela matrícula')

    return {
      linha: l.linha, nome, cpf: campos.cpf ?? '', erros, avisos, funcaoTexto, funcaoId, campos,
      acao: erros.length ? 'erro' : existente ? 'atualizar' : 'novo',
      existenteId: existente?.id,
    }
  })

  // Duas linhas sem CPF apontando para a mesma matrícula existente: só a primeira atualiza
  const atualizados = new Set<string>()
  for (const l of linhas) {
    if (l.acao !== 'atualizar' || !l.existenteId) continue
    if (atualizados.has(l.existenteId)) { l.acao = 'erro'; l.erros.push('Trabalhador já atualizado por outra linha') }
    else atualizados.add(l.existenteId)
  }

  for (const l of linhas) {
    if (l.acao === 'erro' || !l.funcaoTexto || l.funcaoId) continue
    const k = chaveFuncao(l.funcaoTexto)
    if (!faltando.has(k)) faltando.set(k, l.funcaoTexto)
  }

  return { linhas, funcoesFaltando: [...faltando.values()], faltaColunaNome }
}

/**
 * Monta o registro a gravar. Novo: campos da planilha + padrões. Atualização: só os campos preenchidos
 * na planilha (não apaga o que já está cadastrado).
 */
export function registroParaGravar(
  l: LinhaAnalisada, condominioId: string, funcaoIdCriada: string | null,
): Record<string, unknown> {
  const funcao_id = l.funcaoId ?? funcaoIdCriada
  if (l.acao === 'atualizar') {
    return { ...l.campos, ...(funcao_id ? { funcao_id } : {}) }
  }
  return {
    condominio_id: condominioId,
    nome: l.campos.nome ?? l.nome,
    cpf: l.campos.cpf ?? '',
    matricula: l.campos.matricula ?? '',
    categoria: l.campos.categoria ?? '101',
    sexo: l.campos.sexo ?? '',
    data_nascimento: l.campos.data_nascimento ?? null,
    data_admissao: l.campos.data_admissao ?? null,
    data_demissao: l.campos.data_demissao ?? null,
    observacoes: l.campos.observacoes ?? '',
    funcao_id,
  }
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

const fmtData = (iso: string | null) => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function celula(v: string, delim: string) {
  let s = v
  // evita que o Excel interprete o texto como fórmula
  if (/^[=+@]/.test(s)) s = "'" + s
  return /["\r\n]/.test(s) || s.includes(delim) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV com ponto e vírgula e BOM UTF-8 (abre direto no Excel em português). */
export function gerarCsv(linhas: string[][], delim = ';') {
  return '﻿' + linhas.map((r) => r.map((c) => celula(c, delim)).join(delim)).join('\r\n') + '\r\n'
}

export const cabecalhoModelo = () => COLUNAS.map((c) => c.header)

export function csvModelo() {
  return gerarCsv([cabecalhoModelo()])
}

export function csvTrabalhadores(lista: Trabalhador[], funcoes: Funcao[]) {
  const nomeFuncao = new Map(funcoes.map((f) => [f.id, f.nome]))
  return gerarCsv([
    cabecalhoModelo(),
    ...lista.map((t) => [
      t.nome, t.cpf ? formatCpf(t.cpf) : '', t.matricula, (t.funcao_id && nomeFuncao.get(t.funcao_id)) || '', t.categoria, t.sexo,
      fmtData(t.data_nascimento), fmtData(t.data_admissao), fmtData(t.data_demissao), t.observacoes,
    ]),
  ])
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
