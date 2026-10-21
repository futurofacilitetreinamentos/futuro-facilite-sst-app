// Formato da biblioteca padrão de condomínio (funções, riscos e EPIs típicos).
// O conteúdo fica em biblioteca.ts; a tela "Montar pelo modelo" grava a partir dele.
import type { GRUPOS_RISCO, Prioridade } from './types'

export interface BibSetor {
  /** chave estável, ex. 'portaria' */
  id: string
  nome: string
  ambiente: string
  descricao: string
}

export interface BibRisco {
  grupo: (typeof GRUPOS_RISCO)[number]
  perigo: string
  fonte: string
  dano: string
  /** probabilidade e severidade sugeridas (1–5); o técnico revisa na visita */
  prob: number
  sev: number
  controlesAdm: string
  controlesEpc: string
  controlesEpi: string
  acao: string
  prioridade?: Prioridade
  indicadoresSaude?: string
  /** só códigos conferidos na tabela 24 do eSocial; vazio quando não houver certeza */
  codEsocial?: string
  meioPropagacao?: string
  habitualidade?: string
}

export interface BibEpi {
  nome: string
  /** chave do EPI_CATALOGO (imagem), quando houver */
  imagem?: string
}

export interface BibFuncao {
  /** chave estável, ex. 'porteiro' */
  id: string
  nome: string
  /** CBO conferido (formato 0000-00) */
  cbo: string
  /** id do BibSetor */
  setor: string
  atividades: string
  /** sugestão; o técnico confirma (ex.: "12x36 — 44h semanais") */
  cargaHoraria: string
  /** nome sugerido do GHE; funções com o mesmo nome de GHE ficam no mesmo grupo */
  ghe: string
  riscos: BibRisco[]
  epis: BibEpi[]
  /** marcada por padrão na tela (as mais comuns em condomínio) */
  comum?: boolean
}

export interface Biblioteca {
  versao: string
  setores: BibSetor[]
  funcoes: BibFuncao[]
  /** de onde veio cada informação (para revisão técnica) */
  fontes: string[]
}
