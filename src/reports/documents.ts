// Barrel of the document generators (kept so existing imports keep working).
// Per-document modules:
//   layout.ts       page model: DocBuilder (sections, headings, sumário), captions
//   common.ts       shared data helpers and sections (cover, revisões, resp. técnica, GHE, EPI, DRPS…)
//   pgr-doc.ts, pcmso-doc.ts, ltcat-doc.ts, nr1-doc.ts, inspecao-doc.ts
//   views.ts        readiness, blockingReason, buildDoc, planoAcao, summaries
//   paginate.ts     browser-only Paged.js pagination (+ doc.css)
// NOTE: no CSS is imported here, so this module also runs outside Vite (tsx / node).
export { buildPGR } from './pgr-doc';
export { buildPCMSO } from './pcmso-doc';
export { buildLTCAT } from './ltcat-doc';
export { buildNR1 } from './nr1-doc';
export { buildInspecao } from './inspecao-doc';
export { latestInspection, checklistValues, EPI_ITENS } from './common';
export {
  hasCadastro,
  readiness,
  blockingReason,
  buildDoc,
  planoAcao,
  pgrSummary,
  pcmsoPlan,
  pcmsoSummary,
  ltcatPlan,
  ltcatSummary,
  drpsSummary,
} from './views';
export type { DocId, DocReadiness, PlanoAcaoRow, PgrSummary, PcmsoSummary, LtcatSummary, DrpsSummary, DrpsRespondent } from './views';
