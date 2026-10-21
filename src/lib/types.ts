// Linhas das tabelas do banco (ver supabase/migrations/0001_init.sql e 0002_campos_laudos.sql)

export type Role = 'admin' | 'tecnico'

export interface Profile {
  id: string
  email: string
  nome: string
  cpf: string
  nascimento: string | null
  role: Role
  ativo: boolean
}

export type EquipeTipo = 'sst' | 'medico' | 'engenheiro'

export interface Equipe {
  id: string
  tipo: EquipeTipo
  nome: string
  funcao: string
  registro: string
  rqe: string
  telefone: string
  email: string
}

export interface Condominio {
  id: string
  razao_social: string
  nome_fantasia: string
  cnpj: string
  cnae: string
  grau_risco: string
  num_trabalhadores: number | null
  endereco: string
  responsavel_empresa: string
  contato_empresa: string
  email_empresa: string
  data_elaboracao: string | null
  atividade_empresa: string
  resp_sst_id: string | null
  medico_id: string | null
  engenheiro_id: string | null
  drps_token: string
  legacy_id: string | null
  updated_at: string
  cep: string
  cidade_uf: string
  /** Quem assina o LTCAT */
  ltcat_rt: LtcatRt
}

export type LtcatRt = 'engenheiro' | 'medico'

export interface Setor {
  id: string
  condominio_id: string
  nome: string
  ambiente: string
  descricao: string
}

export interface Funcao {
  id: string
  condominio_id: string
  setor_id: string | null
  nome: string
  quantidade: number
  cbo: string
  atividades: string
  carga_horaria: string
}

export interface Ghe {
  id: string
  condominio_id: string
  setor_id: string | null
  nome: string
  descricao: string
  funcao_ids: string[]
  /** Numeração do GHE (GHE 01, 02…); null = posição na lista */
  numero: number | null
  tipo_atividade: string
  descricao_ambiente: string
  parecer_insalubridade: string
  parecer_periculosidade: string
  parecer_aposentadoria: string
  atividades_perigosas: string
}

export const GRUPOS_RISCO = [
  'Físico',
  'Químico',
  'Biológico',
  'Ergonômico',
  'Acidente',
  'Psicossocial relacionado ao trabalho',
  'Perigo',
] as const

export const STATUS_RISCO = ['Pendente', 'Em andamento', 'Concluído'] as const

export interface Risco {
  id: string
  condominio_id: string
  ghe_id: string | null
  funcao_id: string | null
  grupo: (typeof GRUPOS_RISCO)[number]
  perigo: string
  fonte: string
  dano: string
  controles: string
  prob: number
  sev: number
  acao: string
  responsavel: string
  prazo: string | null
  status: (typeof STATUS_RISCO)[number]
  cod_esocial: string
  meio_propagacao: string
  tecnica_analise: string
  nivel_exposicao: string
  controles_adm: string
  controles_epc: string
  controles_epi: string
  indicadores_saude: string
  prioridade: Prioridade | ''
  recursos: string
  onde: string
  forma_afericao: string
  habitualidade: string
  epc_eficaz: boolean | null
  epi_eficaz: boolean | null
  nr15_anexo: string
  grau_insalubridade: string
  nr16_anexo: string
  anexo_iv_codigo: string
  aposentadoria_anos: number | null
  medicao: Medicao | null
}

export type Prioridade = 'A' | 'B' | 'C' | 'D'

/** Prioridade das ações do plano (PGR, tabela de parâmetros de prioridade) */
export const PRIORIDADES: { value: Prioridade; label: string }[] = [
  { value: 'A', label: 'A — Crítico / emergencial' },
  { value: 'B', label: 'B — Primária' },
  { value: 'C', label: 'C — Secundária' },
  { value: 'D', label: 'D — Terciária' },
]

export const HABITUALIDADES = ['Habitual e permanente', 'Intermitente', 'Eventual'] as const
export const GRAUS_INSALUBRIDADE = ['Mínimo', 'Médio', 'Máximo'] as const
export const TECNICAS_ANALISE = ['Qualitativa', 'Quantitativa'] as const

/** Medição quantitativa de um agente (riscos.medicao, jsonb) */
export interface Medicao {
  agente?: string
  tecnica?: string
  equipamento?: string
  data?: string
  resultado?: string
  limite?: string
  unidade?: string
}

export type DocumentoRevisao = 'pgr' | 'pcmso' | 'ltcat' | 'nr1'

export const DOCUMENTOS_REVISAO: { value: DocumentoRevisao; label: string }[] = [
  { value: 'pgr', label: 'PGR' },
  { value: 'pcmso', label: 'PCMSO' },
  { value: 'ltcat', label: 'LTCAT' },
  { value: 'nr1', label: 'NR-1 / DRPS' },
]

export interface DocRevisao {
  id: string
  condominio_id: string
  documento: DocumentoRevisao
  numero: string
  data: string | null
  itens: string
}

export type EpiStatus = 'existente' | 'recomendado'

export interface Epi {
  id: string
  condominio_id: string
  ghe_id: string | null
  funcao_id: string | null
  nome: string
  ca: string
  validade_ca: string | null
  eficaz: boolean | null
  /** Chave do catálogo (EPI_CATALOGO) ou '' */
  imagem: string
  status: EpiStatus
}

/** Imagens disponíveis em public/docs-assets/epi */
export const EPI_CATALOGO: { key: string; label: string; file: string }[] = [
  { key: 'luva', label: 'Luva nitrílica', file: 'luva.jpg' },
  { key: 'luva-latex', label: 'Luva de procedimento (látex / vinil)', file: 'luva-latex.jpg' },
  { key: 'pff2', label: 'Respirador PFF2', file: 'pff2.jpg' },
  { key: 'bota', label: 'Bota / calçado antiderrapante', file: 'bota.png' },
  { key: 'bone', label: 'Boné árabe (proteção solar)', file: 'bone.png' },
  { key: 'oculos', label: 'Óculos de proteção', file: 'oculos.jpg' },
  { key: 'protetor', label: 'Protetor auditivo', file: 'protetor.jpg' },
]

export type AgendaStatus = 'agendada' | 'realizada' | 'cancelada'

export interface Agendamento {
  id: string
  condominio_id: string
  data: string
  hora: string | null
  tecnico: string
  obs: string
  status: AgendaStatus
}

export type ItemStatus = 'Pendente' | 'Conforme' | 'Não conforme' | 'Não se aplica'
export type ItemRisco = 'Baixo' | 'Médio' | 'Alto' | 'Crítico'

export interface ChecklistItem {
  titulo: string
  status: ItemStatus
  obs: string
  acao: string
  risco: ItemRisco | ''
  prazo: string
  responsavel: string
  photos: string[] // caminhos no bucket "fotos"
}

export interface Inspecao {
  id: string
  numero: string | null
  condominio_id: string
  agendamento_id: string | null
  data_visita: string
  tecnico: string
  objetivo: string
  total_empregados: string
  proprios: string
  terceirizados: string
  funcoes: string
  jornadas: string
  conclusao: string
  recomendacoes: string
  assinatura_sindica: string
  assinatura_tecnico: string
  foto_capa: string | null
  checklist: Record<string, ChecklistItem>
  created_at: string
  updated_at: string
}

export interface DrpsResposta {
  id: string
  condominio_id: string
  funcao: string
  setor: string
  answers: Record<string, number>
  created_at: string
}
