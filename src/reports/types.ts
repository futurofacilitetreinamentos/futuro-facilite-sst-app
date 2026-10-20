// Input shapes for the document generators. They mirror the legacy V8
// (vanilla JS / localStorage) records one-to-one: every field is a string as in
// the legacy app, and relations are made by *name* (e.g. Risco.ghe === Ghe.nome,
// Funcao.setor === Setor.nome). Fields are optional because legacy records were
// frequently partial; the generators fall back to the same defaults as legacy.

/** Cadastro do condomínio (legacy `project.empresa`, see app.js `empFields`). */
export interface LegacyEmpresa {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  cnae?: string;
  grauRisco?: string;
  numTrabalhadores?: string;
  endereco?: string;
  responsavelEmpresa?: string;
  contatoEmpresa?: string;
  emailEmpresa?: string;
  /** ISO date `YYYY-MM-DD`. */
  dataElaboracao?: string;
  atividadeEmpresa?: string;
  /** Responsável SST (nome). */
  respSst?: string;
  funcaoRespSst?: string;
  regSst?: string;
  /** Equipe id of the selected SST professional. */
  respSstId?: string;
  medicoTrabalho?: string;
  /** "registro / rqe" as composed by legacy applyEquipePick. */
  crmMedico?: string;
  medicoId?: string;
  engSeguranca?: string;
  creaEng?: string;
  engId?: string;
}

export interface LegacySetor {
  nome?: string;
  ambiente?: string;
  descricao?: string;
}

export interface LegacyFuncao {
  nome?: string;
  /** Setor.nome */
  setor?: string;
  quantidade?: string;
  cbo?: string;
  atividades?: string;
}

export interface LegacyGhe {
  nome?: string;
  /** Setor.nome */
  setor?: string;
  /** Free text list of function names, e.g. "Porteiro, Zelador". */
  funcoes?: string;
  descricao?: string;
}

export type LegacyRiscoGrupo =
  | 'Físico'
  | 'Químico'
  | 'Biológico'
  | 'Ergonômico'
  | 'Acidente'
  | 'Psicossocial relacionado ao trabalho';

export interface LegacyRisco {
  /** Ghe.nome */
  ghe?: string;
  /** Funcao.nome */
  funcao?: string;
  /** One of LegacyRiscoGrupo in practice, but free text in legacy. */
  grupo?: string;
  perigo?: string;
  fonte?: string;
  dano?: string;
  controles?: string;
  /** Probabilidade 1–5 (string in legacy). */
  prob?: string;
  /** Severidade 1–5 (string in legacy). */
  sev?: string;
  acao?: string;
  responsavel?: string;
  /** ISO date */
  prazo?: string;
  /** 'Pendente' | 'Em andamento' | 'Concluído' */
  status?: string;
}

export interface LegacyAgenda {
  id?: string;
  /** ISO date */
  data?: string;
  hora?: string;
  tecnico?: string;
  obs?: string;
  /** 'agendada' | 'realizada' | 'cancelada' */
  status?: string;
  inspecaoId?: string;
  useNext?: boolean;
}

export interface LegacyProject {
  id: string;
  drpsToken?: string;
  salvoEm?: string;
  empresa: LegacyEmpresa;
  setores: LegacySetor[];
  funcoes: LegacyFuncao[];
  ghe: LegacyGhe[];
  riscos: LegacyRisco[];
  agenda: LegacyAgenda[];
}

/** 'Conforme' | 'Não conforme' | 'Não se aplica' | 'Pendente' */
export type LegacyChecklistStatus = string;

export interface LegacyChecklistItem {
  titulo?: string;
  status?: LegacyChecklistStatus;
  obs?: string;
  acao?: string;
  /** 'Baixo' | 'Médio' | 'Alto' | 'Crítico' */
  risco?: string;
  /** ISO date */
  prazo?: string;
  responsavel?: string;
  /** Image URLs (http(s) or data:). */
  photos?: string[];
}

/** Inspection report record (legacy V7 `ff_sst_v7_reports` shape). */
export interface LegacyInspection {
  id?: string;
  numero?: string;
  condominioId?: string;
  agendaId?: string;
  condominio?: string;
  cnpj?: string;
  endereco?: string;
  sindica?: string;
  telefone?: string;
  emailCondominio?: string;
  /** ISO date */
  dataVisita?: string;
  tecnico?: string;
  objetivo?: string;
  totalEmpregados?: string;
  proprios?: string;
  terceirizados?: string;
  funcoes?: string;
  jornadas?: string;
  conclusao?: string;
  recomendacoes?: string;
  assinaturaSindica?: string;
  assinaturaTecnico?: string;
  /** Image URL (http(s) or data:), '' when absent. */
  fotoCapa?: string;
  /** Keyed item_0 … item_38 (insertion order = checklist order). */
  checklist?: Record<string, LegacyChecklistItem>;
  salvoEm?: string;
}

/** One DRPS questionnaire answer set. answers: question number (1–50) → 1–5. */
export interface LegacyDrpsResponse {
  funcao?: string;
  setor?: string;
  answers: Record<number, number>;
  /** ISO timestamp */
  ts?: string;
}

export type LegacyEquipeTipo = 'sst' | 'medico' | 'engenheiro';

export interface LegacyEquipe {
  id: string;
  tipo: LegacyEquipeTipo | string;
  nome: string;
  funcao?: string;
  registro?: string;
  rqe?: string;
  telefone?: string;
  email?: string;
}

export interface DocContext {
  project: LegacyProject;
  /** Inspections of this project, newest first (legacy `V8Storage.inspections(id)`). */
  inspections: LegacyInspection[];
  /** DRPS responses of this project. */
  drps: LegacyDrpsResponse[];
  equipe: LegacyEquipe[];
  /** URL prefix for docs-assets, e.g. `import.meta.env.BASE_URL + 'docs-assets/'`. Must end with '/'. */
  assetsBase: string;
  /** Optional "today" used when dataElaboracao is empty (defaults to new Date()). */
  today?: Date;
}
