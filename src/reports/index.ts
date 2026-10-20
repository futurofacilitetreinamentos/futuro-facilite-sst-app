// Public API of the document generators.
// The stylesheet is imported here (not in documents.ts) so the pure modules can
// also run outside Vite (e.g. `npx tsx`). Import from 'src/reports' in the app.
import './report.css';

export type * from './types';

export {
  buildPGR,
  buildPCMSO,
  buildLTCAT,
  buildNR1,
  buildInspecao,
  buildDoc,
  readiness,
  blockingReason,
  hasCadastro,
  latestInspection,
  checklistValues,
  planoAcao,
  pgrSummary,
  pcmsoPlan,
  pcmsoSummary,
  ltcatPlan,
  ltcatSummary,
  drpsSummary,
  EPI_ITENS,
} from './documents';
export type {
  DocId,
  DocReadiness,
  PlanoAcaoRow,
  PgrSummary,
  PcmsoSummary,
  LtcatSummary,
  DrpsSummary,
  DrpsRespondent,
} from './documents';

export { printDoc } from './print';
export type { PrintOptions } from './print';

export { riskLevel, riskScore, te, teNome, pd, pdNome, gr, grNome, grByScore, GR_MATRIX } from './risk';
export type { RiskLevel, RiskLevelLabel, RiskLevelClass, TeCode, PdCode, GrCode } from './risk';

export { mesAno, mesAnoCapa, dataExtenso, grupoLetra, groups, PGR_TEXTS, PCMSO_TEXTS, LTCAT_TEXTS, NR1_TEXTS } from './evolue';
export type { GheGroup, GrupoLetra } from './evolue';

export {
  SCALE,
  TOPICS,
  INV,
  QUESTIONS,
  FONTES,
  AGRAVOS,
  scoreDrps,
  questionGravidadeNum,
  gravidadeColetiva,
  corrected,
  gravidade,
  topicAvg,
  toSpreadsheetScale,
  emptyTopics,
  nColabs,
} from './drps';
export type { DrpsBundle, DrpsTopicResult, DrpsTopic, DrpsQuestion, DrpsScaleOption, Gravidade } from './drps';

export { CHECKLIST, CHECKLIST_SIZE, checklistItems } from './checklist';
export type { ChecklistSection, ChecklistItemDef } from './checklist';

export { pcmsoPlanFor, PCMSO_BASE } from './pcmso';
export type { PcmsoPlan, PcmsoFuncaoPlan, PcmsoExame } from './pcmso';

export { ltcatPlanFor, isAgente } from './ltcat';
export type { LtcatPlan, LtcatAgente } from './ltcat';

export { esc, fmt } from './html';
