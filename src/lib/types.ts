// Linhas das tabelas do banco (ver supabase/migrations/0001_init.sql)

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
}

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
}

export interface Ghe {
  id: string
  condominio_id: string
  setor_id: string | null
  nome: string
  descricao: string
  funcao_ids: string[]
}

export const GRUPOS_RISCO = [
  'Físico',
  'Químico',
  'Biológico',
  'Ergonômico',
  'Acidente',
  'Psicossocial relacionado ao trabalho',
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
}

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
