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
  /** Profissional que "auxiliou na elaboração" (PGR). */
  auxSst?: string;
  funcaoAuxSst?: string;
  regAuxSst?: string;
  /** Responsável pelo relatório de inspeção (vazio = respSst). */
  inspRt?: string;
  funcaoInspRt?: string;
  regInspRt?: string;
  /** Responsável pelo NR-1 / DRPS (vazio = respSst). */
  nr1Rt?: string;
  funcaoNr1Rt?: string;
  regNr1Rt?: string;
  /** Quem assina o LTCAT (médico ou engenheiro); vazio = regra antiga por ltcatRt. */
  ltcatNome?: string;
  ltcatFuncao?: string;
  ltcatRegistro?: string;
  medicoTrabalho?: string;
  /** "registro / rqe" as composed by legacy applyEquipePick. */
  crmMedico?: string;
  medicoId?: string;
  engSeguranca?: string;
  creaEng?: string;
  engId?: string;
  /** CEP, e.g. "70000-000". */
  cep?: string;
  /** City-UF for the date/place line, e.g. "Brasília-DF" (fallback "Brasília-DF"). */
  cidadeUf?: string;
  /** Who signs the LTCAT (default 'engenheiro'). */
  ltcatRt?: 'engenheiro' | 'medico';
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
  /** e.g. "44h semanais (12x36)". */
  cargaHoraria?: string;
}

export interface LegacyGhe {
  nome?: string;
  /** Setor.nome */
  setor?: string;
  /** Free text list of function names, e.g. "Porteiro, Zelador". */
  funcoes?: string;
  descricao?: string;
  /** GHE numbering (GHE 01, 02…); absent = position in the list. */
  numero?: number;
  tipoAtividade?: string;
  /** Override of setor.ambiente/descricao. */
  descricaoAmbiente?: string;
  /** Manual overrides of the automatic LTCAT conclusions ('' = automatic). */
  parecerInsalubridade?: string;
  parecerPericulosidade?: string;
  parecerAposentadoria?: string;
  /** NR-16 hazardous activities description; '' = "Não identificadas". */
  atividadesPerigosas?: string;
}

export type LegacyRiscoGrupo =
  | 'Físico'
  | 'Químico'
  | 'Biológico'
  | 'Ergonômico'
  | 'Acidente'
  | 'Psicossocial relacionado ao trabalho'
  | 'Perigo';

/** Quantitative measurement of an agent (riscos.medicao). */
export interface LegacyMedicao {
  agente?: string;
  /** Methodology, e.g. "NHO-01 dosimetria". */
  tecnica?: string;
  equipamento?: string;
  /** ISO date */
  data?: string;
  resultado?: string;
  limite?: string;
  unidade?: string;
  /** Origem quando aproveitada de laudo anterior, ex. "Empresa X, laudo de 10/03/2025". */
  fonte?: string;
}

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
  /** eSocial Tabela 24, e.g. '01.01.021'. */
  codEsocial?: string;
  meioPropagacao?: string;
  /** 'Qualitativa' (default) | 'Quantitativa' */
  tecnicaAnalise?: string;
  nivelExposicao?: string;
  /** Existing controls split; when all empty use `controles` as general text. */
  controlesAdm?: string;
  controlesEpc?: string;
  controlesEpi?: string;
  indicadoresSaude?: string;
  /** Action plan priority. */
  prioridade?: 'A' | 'B' | 'C' | 'D' | '';
  recursos?: string;
  onde?: string;
  formaAfericao?: string;
  /** 'Habitual e permanente' | 'Intermitente' | 'Eventual' */
  habitualidade?: string;
  /** null = não avaliado */
  epcEficaz?: boolean | null;
  epiEficaz?: boolean | null;
  /** e.g. 'Anexo 1' */
  nr15Anexo?: string;
  /** 'Mínimo' | 'Médio' | 'Máximo' | '' */
  grauInsalubridade?: string;
  nr16Anexo?: string;
  /** Decreto 3.048 Anexo IV code, e.g. '2.0.1'. */
  anexoIvCodigo?: string;
  /** 15 | 20 | 25 | null */
  aposentadoriaAnos?: number | null;
  medicao?: LegacyMedicao | null;
}

/** Document revision row (doc_revisoes). */
export interface LegacyRevisao {
  /** 'pgr' | 'pcmso' | 'ltcat' | 'nr1' */
  documento?: string;
  /** e.g. '001' */
  numero?: string;
  /** ISO date */
  data?: string;
  itens?: string;
}

/** EPI record (epis). */
export interface LegacyEpi {
  /** Ghe.nome */
  ghe?: string;
  /** Funcao.nome */
  funcao?: string;
  nome?: string;
  ca?: string;
  /** ISO date */
  validadeCa?: string;
  /** undefined = não avaliado */
  eficaz?: boolean;
  /** Catalog key in docs-assets/epi (e.g. 'luva', 'pff2', 'bota') or ''. */
  imagem?: string;
  status?: 'existente' | 'recomendado';
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
  /** Empty/absent → generators print revision 001 with dataElaboracao. */
  revisoes?: LegacyRevisao[];
  /** Empty/absent → generators keep the regex/catalog behaviour. */
  epis?: LegacyEpi[];
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
