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
  /** Documentos que assina por padrão (migração 0003); ver lib/signatarios.ts */
  padrao?: string[]
  /** CPF (só dígitos) e UF do conselho, usados no eSocial (migração 0005) */
  cpf?: string
  uf_conselho?: string
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
  /** Assinantes escolhidos para este condomínio (migração 0003); vazio = padrão da equipe */
  aux_sst_id: string | null
  inspecao_rt_id: string | null
  nr1_rt_id: string | null
  ltcat_rt_id: string | null
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

export type TipoDocAnterior = 'pgr' | 'pcmso' | 'ltcat' | 'nr1' | 'outro'

export const TIPOS_DOC_ANTERIOR: { value: TipoDocAnterior; label: string }[] = [
  { value: 'pgr', label: 'PGR' },
  { value: 'pcmso', label: 'PCMSO' },
  { value: 'ltcat', label: 'LTCAT' },
  { value: 'nr1', label: 'NR-1 / DRPS' },
  { value: 'outro', label: 'Outro' },
]

/** Laudo emitido antes, normalmente por outra empresa (migração 0004). */
export interface DocAnterior {
  id: string
  condominio_id: string
  tipo: TipoDocAnterior
  empresa: string
  responsavel: string
  registro: string
  data_emissao: string | null
  validade: string | null
  /** caminho no bucket "fotos" */
  arquivo: string | null
  nome_arquivo: string
  observacoes: string
}

/** Medição quantitativa aproveitada de um laudo anterior (migração 0004). */
export interface MedicaoAnterior {
  id: string
  condominio_id: string
  doc_id: string | null
  risco_id: string | null
  ghe_id: string | null
  funcao_id: string | null
  agente: string
  tecnica: string
  equipamento: string
  data: string | null
  resultado: string
  limite: string
  unidade: string
  observacoes: string
}

/** Trabalhador do condomínio (migração 0005). data_demissao preenchida = desligado. */
export interface Trabalhador {
  id: string
  condominio_id: string
  funcao_id: string | null
  nome: string
  /** só dígitos */
  cpf: string
  matricula: string
  /** eSocial tabela 01 (101 = empregado geral) */
  categoria: string
  sexo: '' | 'M' | 'F'
  data_nascimento: string | null
  data_admissao: string | null
  data_demissao: string | null
  observacoes: string
}

export type TipoAso = 'admissional' | 'periodico' | 'retorno' | 'mudanca_risco' | 'demissional' | 'monitoracao'

export const TIPOS_ASO: { value: TipoAso; label: string; esocial: string }[] = [
  { value: 'admissional', label: 'Admissional', esocial: '0' },
  { value: 'periodico', label: 'Periódico', esocial: '1' },
  { value: 'retorno', label: 'Retorno ao trabalho', esocial: '2' },
  { value: 'mudanca_risco', label: 'Mudança de risco', esocial: '3' },
  { value: 'monitoracao', label: 'Monitoração pontual', esocial: '4' },
  { value: 'demissional', label: 'Demissional', esocial: '9' },
]

export interface ExameAso {
  /** eSocial tabela 27 */
  codigo: string
  nome: string
  data: string
  ordem: 'referencial' | 'sequencial'
  resultado: '' | 'normal' | 'alterado' | 'estavel' | 'agravamento'
}

/** ASO realizado (migração 0005) — evento S-2220. */
export interface Aso {
  id: string
  condominio_id: string
  trabalhador_id: string
  data: string
  tipo: TipoAso
  resultado: 'apto' | 'inapto'
  medico_id: string | null
  medico_nome: string
  medico_crm: string
  medico_uf: string
  exames: ExameAso[]
  /** PDF do ASO no bucket "fotos" */
  arquivo: string | null
  observacoes: string
}

/** Treinamento de NR por trabalhador (migração 0005). */
export interface Treinamento {
  id: string
  condominio_id: string
  trabalhador_id: string
  nr: string
  titulo: string
  data: string | null
  validade: string | null
  carga_horaria: string
  instrutor: string
  arquivo: string | null
  observacoes: string
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
