// LTCAT data model: which inventory risks are LTCAT agents (F/Q/B), how each one
// is printed in the exposure-analysis table, and the per-GHE technical opinion
// (insalubridade / periculosidade / aposentadoria especial). The document
// (ltcat-doc.ts), the Resumo and the app summary (views.ts) all read the SAME
// objects built here, so they can never contradict each other.
import type { LegacyEpi, LegacyMedicao, LegacyProject, LegacyRisco } from './types';
import { groups } from './evolue';
import type { GheGroup } from './evolue';
import { gr, pd, te } from './risk';

// ---------------------------------------------------------------------------
// Public shapes (LtcatAgente / LtcatPlan are consumed by views.ts and DocPages.tsx:
// fields may be added, never removed or renamed).
// ---------------------------------------------------------------------------

export type LtcatLetra = 'F' | 'Q' | 'B';

export interface LtcatAgente {
  ghe: string;
  grupo: string;
  agente: string;
  fonte: string;
  dano: string;
  controles: string;
  metodo: string;
  enquadramento: string;
  exposicao: string;
  // --- phase C additions ---
  letra?: LtcatLetra;
  /** eSocial Tabela 24 code as stored ('' when absent). */
  codEsocial?: string;
  meioPropagacao?: string;
  /** Printed "Técnica de análise". */
  tecnica?: string;
  /** Printed "Nível de exposição". */
  nivel?: string;
  /** Effective habitualidade (stored, else derived from TE). */
  habitualidade?: string;
  te?: string;
  pd?: string;
  gr?: string;
  /** "Medidas de controle existentes", one item per line. */
  controlesLista?: string[];
  medicao?: LegacyMedicao | null;
  risco?: LegacyRisco;
}

export type LtcatFator = 'insalubridade' | 'periculosidade' | 'aposentadoria';

export interface LtcatDireito {
  fator: LtcatFator;
  /** Label of the "Fator de direito" cell, e.g. "Aposentadoria especial". */
  rotulo: string;
  /** eSocial code(s) shown next to the label ('' = none). */
  codigo: string;
  /** "Atividades ou operações geradoras do direito" (plain text). */
  atividades: string;
  /** Conclusion paragraph (trusted HTML: built from escaped data + <b>). */
  conclusaoHtml: string;
  /** Short conclusion for the Resumo (trusted HTML). */
  resumoHtml: string;
  /** true / false; null when a manual text does not state it. */
  fazJus: boolean | null;
  /** Conclusion comes from the GHE override field. */
  manual: boolean;
}

export interface LtcatPericulosidadeRow {
  atividade: string;
  area: string;
  tempo: string;
  embasamento: string;
  controles: string[];
}

export interface LtcatGhe {
  /** Printed GHE number (ghe.numero, number in the name, else position). */
  numero: number;
  /** Name without a leading "GHE-01" prefix. */
  nome: string;
  /** "GHE 1: Zeladoria". */
  titulo: string;
  group: GheGroup;
  agentes: LtcatAgente[];
  perigosas: LtcatPericulosidadeRow[];
  ins: LtcatDireito;
  per: LtcatDireito;
  apo: LtcatDireito;
}

export interface LtcatRt {
  tipo: 'engenheiro' | 'medico';
  nome: string;
  /** 'CREA' | 'CRM' */
  conselho: string;
  registro: string;
}

export interface LtcatPlan {
  eng: { nome: string; crea: string };
  sst: { nome: string; reg: string };
  agentes: LtcatAgente[];
  ocupacionais: LegacyRisco[];
  conclusao: string;
  temMedicao: boolean;
  // --- phase C additions ---
  /** Who signs the laudo (empresa.ltcatRt, default engenheiro). */
  rt?: LtcatRt;
  ghes?: LtcatGhe[];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (m) => ESC_MAP[m]);
}

const s = (v: unknown): string => String(v ?? '').trim();

/** eSocial Tabela 24: "Ausência de agente nocivo ou de atividades previstas no Anexo IV do Decreto 3.048/1999". */
export const COD_AUSENCIA = '09.01.001';
/** eSocial Tabela 24: ruído (the only agent code the LTCAT logic relies on). */
export const COD_RUIDO = '02.01.001';

export const LETRA_NOME: Record<LtcatLetra, string> = { F: 'Físico', Q: 'Químico', B: 'Biológico' };

function norm(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Letter by grupo; 'X' = a known non-LTCAT group (ergonômico, acidente, psicossocial, perigo…); '' = unknown/empty. */
function letraGrupo(grupo?: string): LtcatLetra | 'X' | '' {
  const g = norm(s(grupo));
  if (!g) return '';
  if (/quim/.test(g)) return 'Q';
  if (/biol/.test(g)) return 'B';
  if (/fisic/.test(g)) return 'F';
  if (/ergo|acid|psico|perig|mecan|organiz/.test(g)) return 'X';
  return '';
}

function anexoNum(v?: string): number | null {
  const m = /(\d+)/.exec(s(v));
  return m ? Number(m[1]) : null;
}

/** Letter from explicit LTCAT data: eSocial Tabela 24 chapter (01 químicos, 02 físicos, 03 biológicos) or NR-15 annex. */
function letraDados(r: LegacyRisco): LtcatLetra | '' {
  const cod = s(r.codEsocial);
  if (cod && cod !== COD_AUSENCIA) {
    if (cod.startsWith('01')) return 'Q';
    if (cod.startsWith('02')) return 'F';
    if (cod.startsWith('03')) return 'B';
  }
  const n = anexoNum(r.nr15Anexo);
  if (n !== null) {
    if (n >= 1 && n <= 10) return 'F';
    if (n >= 11 && n <= 13) return 'Q';
    if (n === 14) return 'B';
  }
  if (s(r.anexoIvCodigo)) {
    const c = s(r.anexoIvCodigo);
    if (c.startsWith('1')) return 'Q';
    if (c.startsWith('2')) return 'F';
    if (c.startsWith('3')) return 'B';
  }
  return '';
}

/** Last-resort text heuristic (only for risks without a recognised grupo). */
function letraTexto(r: LegacyRisco): LtcatLetra | '' {
  const t = norm([r.perigo, r.fonte].map(s).join(' '));
  if (/ruido|vibrac|radiac|calor\b|frio\b|umidade|pressao anormal/.test(t)) return 'F';
  if (/poeira|fumos?\b|nevoa|vapor|gases?\b|solvente|quimic|domissanit/.test(t)) return 'Q';
  if (/biolog|esgoto|virus|bacteri|fung|residuo|lixo/.test(t)) return 'B';
  return '';
}

/**
 * LTCAT letter of a risk, or null when it is not an LTCAT agent.
 * 1. grupo Físico / Químico / Biológico → that letter.
 * 2. grupo Ergonômico / Acidente / Psicossocial / Perigo → never (they stay in the PGR).
 * 3. grupo empty or unknown → explicit LTCAT data (codEsocial, nr15Anexo, anexoIvCodigo), else text heuristic.
 */
export function letraLtcat(r: LegacyRisco): LtcatLetra | null {
  const g = letraGrupo(r.grupo);
  if (g === 'X') return null;
  if (g) return g;
  return letraDados(r) || letraTexto(r) || null;
}

export function isAgente(r: LegacyRisco): boolean {
  return letraLtcat(r) !== null;
}

function isRuido(r: LegacyRisco): boolean {
  return s(r.codEsocial) === COD_RUIDO || anexoNum(r.nr15Anexo) === 1 || anexoNum(r.nr15Anexo) === 2 || /ru[ií]do/i.test(s(r.perigo));
}

/** Effective habitualidade: stored value, else derived from TE (P → habitual e permanente). */
export function habitualidade(r: LegacyRisco): string {
  const h = s(r.habitualidade);
  if (h) return h;
  const t = te(r.prob);
  return t === 'P' ? 'Habitual e permanente' : t === 'I' ? 'Intermitente' : 'Eventual';
}

function isPermanente(h: string): boolean {
  return /habitual\s+e\s+permanente/i.test(h) || /^permanente$/i.test(h.trim());
}

/** Printed form of the habitualidade (legal wording used in the analysis table). */
function habitualidadeTexto(h: string): string {
  if (/^intermitente$/i.test(h)) return 'Não ocasional e intermitente';
  if (/^eventual$/i.test(h)) return 'Ocasional e intermitente';
  return h;
}

function num(v?: string): number | null {
  const t = s(v).replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t.replace(/[^\d.+-]/g, ''));
  return Number.isFinite(n) && /\d/.test(t) ? n : null;
}

function temMedicaoRisco(r: LegacyRisco): boolean {
  const m = r.medicao;
  return !!(m && (s(m.resultado) || s(m.tecnica) || s(m.equipamento)));
}

/** "85,2 dB(A) (LT 85 dB(A))". */
export function medicaoTexto(m: LegacyMedicao): string {
  const un = s(m.unidade);
  const res = s(m.resultado);
  if (!res) return '';
  const lt = s(m.limite);
  return `${res}${un ? ' ' + un : ''}${lt ? ` (LT ${lt}${un ? ' ' + un : ''})` : ''}`;
}

/** Result above the limit: true / false; null when not comparable. */
function acimaDoLimite(m?: LegacyMedicao | null): boolean | null {
  if (!m) return null;
  const r = num(m.resultado);
  const l = num(m.limite);
  if (r === null || l === null) return null;
  return r > l;
}

function splitItens(t?: string): string[] {
  return s(t)
    .split(/\r?\n|;\s*/)
    .map((x) => x.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean);
}

function epiTexto(e: LegacyEpi): string {
  const nome = s(e.nome);
  if (!nome) return '';
  return `${nome} (${s(e.ca) ? 'CA nº ' + s(e.ca) : 'CA não identificado'})`;
}

/** Existing controls of a risk: EPC / administrative / EPI fields, registered EPIs of the GHE/função, else the general text. */
function controlesLista(r: LegacyRisco, epis: LegacyEpi[], gheNome: string, funcoes: string[]): string[] {
  const out = [...splitItens(r.controlesEpc), ...splitItens(r.controlesAdm), ...splitItens(r.controlesEpi)];
  const reg = splitItens(r.controlesEpi).length
    ? []
    : epis
    .filter((e) => (e.status || 'existente') === 'existente')
    .filter((e) => (e.ghe && (e.ghe === gheNome || e.ghe === r.ghe)) || (e.funcao && (e.funcao === r.funcao || funcoes.includes(e.funcao))))
    .map(epiTexto)
    .filter(Boolean);
  reg.forEach((x) => {
    if (!out.some((o) => o.toLowerCase() === x.toLowerCase())) out.push(x);
  });
  if (!out.length) out.push(...splitItens(r.controles));
  return out;
}

function metodo(r: LegacyRisco): string {
  if (temMedicaoRisco(r)) return `Quantitativa${s(r.medicao?.tecnica) ? ' (' + s(r.medicao?.tecnica) + ')' : ''}.`;
  const t = norm([r.perigo, r.fonte].map(s).join(' '));
  if (/ruido/.test(t)) return 'Qualitativa neste laudo. Havendo indício de exposição habitual, complementar com dosimetria (NHO-01 / NR-15 Anexo 1).';
  if (/calor|termic/.test(t)) return 'Qualitativa neste laudo. Havendo exposição habitual, complementar com IBUTG (NHO-06 / NR-15 Anexo 3).';
  const L = letraLtcat(r);
  if (L === 'Q') return 'Qualitativa neste laudo. Avaliar quantitativamente o agente específico quando a exposição for habitual.';
  if (L === 'B') return 'Qualitativa, pela natureza da atividade e do contato com agentes biológicos (NR-15 Anexo 14).';
  return 'Qualitativa, a partir do inventário de riscos do PGR.';
}

function exposicao(r: LegacyRisco): string {
  if (r.medicao && s(r.medicao.resultado)) return medicaoTexto(r.medicao);
  if (s(r.nivelExposicao)) return s(r.nivelExposicao);
  return habitualidadeTexto(habitualidade(r));
}

const GRAU_PCT: Record<string, number> = { minimo: 10, medio: 20, maximo: 40 };

function grauKey(g?: string): 'minimo' | 'medio' | 'maximo' | '' {
  const t = norm(s(g));
  if (/max/.test(t)) return 'maximo';
  if (/med/.test(t)) return 'medio';
  if (/min/.test(t)) return 'minimo';
  return '';
}

const GRAU_NOME = { minimo: 'mínimo', medio: 'médio', maximo: 'máximo' } as const;

/** NR-15 annexes evaluated quantitatively (limits of tolerance). */
const NR15_QUANT = new Set([1, 2, 3, 5, 11, 12]);

function nr15Label(a?: string): string {
  const n = anexoNum(a);
  return n !== null ? `Anexo ${n} da NR-15` : `${s(a)} da NR-15`;
}

function nr16Label(a?: string): string {
  const t = s(a);
  const n = anexoNum(t);
  if (n !== null) return `NR-16, Anexo ${n}`;
  return /^nr/i.test(t) ? t : `NR-16, ${t}`;
}

const SEM_ATIVIDADE = 'Não há atividades ou operações geradoras do direito';

/** Manual override text → fazJus (null when the text does not say it). */
function fazJusDoTexto(t: string): boolean | null {
  const n = norm(t);
  if (/nao\s+(faz|fazem|fazendo)\s+jus|nao\s+possu|nao\s+ha\s+(direito|exposicao)|nao\s+se\s+caracteriza|nao\s+caracteriza|nao\s+tem\s+direito|nao\s+enseja/.test(n)) return false;
  if (/(faz|fazem|fazendo)\s+jus|tem\s+direito|enseja|caracteriza/.test(n)) return true;
  return null;
}

function manualDireito(base: LtcatDireito, texto: string): LtcatDireito {
  const fazJus = fazJusDoTexto(texto);
  const html = esc(texto).replace(/\n/g, '<br>');
  return {
    ...base,
    conclusaoHtml: html,
    resumoHtml: fazJus === null ? html : resumoCurto(base.fator, fazJus),
    fazJus,
    manual: true,
  };
}

function resumoCurto(f: LtcatFator, fazJus: boolean): string {
  const lead = fazJus ? '<b>Faz jus</b>' : '<b>Não faz jus</b>';
  if (f === 'insalubridade') return `${lead} à percepção do adicional de insalubridade.`;
  if (f === 'periculosidade') return `${lead} à percepção do adicional de periculosidade.`;
  return `${lead} ao direito de aposentadoria especial.`;
}

// ---------------------------------------------------------------------------
// Parecer rules
// ---------------------------------------------------------------------------

/**
 * INSALUBRIDADE (NR-15; CLT arts. 189–192):
 * a GHE agent counts when it has `nr15Anexo` (not the revoked Anexo 4) and `grauInsalubridade`.
 * - Quantitative annexes (1, 2, 3, 5, 11, 12) with a numeric measurement at or below the limit → not characterised.
 * - `epiEficaz === true` or `epcEficaz === true` → neutralised (NR-15 item 15.4.1; TST Súmula 80) → no addition.
 * - Otherwise it is characterised; with several agents only the highest grade counts (NR-15 item 15.3).
 */
function parecerInsalubridade(ag: LtcatAgente[]): LtcatDireito {
  type C = { a: LtcatAgente; grau: 'minimo' | 'medio' | 'maximo'; anexo: string };
  const cand: C[] = [];
  const neutral: C[] = [];
  const abaixo: C[] = [];
  ag.forEach((a) => {
    const r = a.risco!;
    const n = anexoNum(r.nr15Anexo);
    const grau = grauKey(r.grauInsalubridade);
    if (!s(r.nr15Anexo) || n === 4 || !grau) return;
    const c: C = { a, grau, anexo: s(r.nr15Anexo) };
    if (n !== null && NR15_QUANT.has(n) && acimaDoLimite(r.medicao) === false) abaixo.push(c);
    else if (r.epiEficaz === true || r.epcEficaz === true) neutral.push(c);
    else cand.push(c);
  });
  const base = { fator: 'insalubridade' as const, rotulo: 'Insalubridade', codigo: '', manual: false };
  if (cand.length) {
    const order = { minimo: 1, medio: 2, maximo: 3 };
    cand.sort((x, y) => order[y.grau] - order[x.grau]);
    const top = cand[0];
    const r = top.a.risco!;
    const n = anexoNum(top.anexo);
    const quant = r.medicao && s(r.medicao.resultado);
    const como = quant
      ? `por avaliação quantitativa (${esc(medicaoTexto(r.medicao!))}), acima do limite de tolerância`
      : n !== null && NR15_QUANT.has(n)
        ? 'por avaliação qualitativa, pendente de confirmação quantitativa do limite de tolerância'
        : 'por avaliação qualitativa (inspeção no local de trabalho)';
    const pct = GRAU_PCT[top.grau];
    const outros = cand.length > 1 ? ' Havendo mais de um agente insalubre, considera-se somente o de grau mais elevado, vedada a percepção cumulativa.' : '';
    return {
      ...base,
      atividades: cand.map((c) => `${c.a.agente} (${nr15Label(c.anexo)}, grau ${GRAU_NOME[c.grau]})`).join('; '),
      conclusaoHtml: `Após a análise dos cargos deste GHE, constatou-se exposição a <b>${esc(top.a.agente)}</b>, ${como}, enquadrada no <b>${esc(nr15Label(top.anexo))}</b> em <b>grau ${GRAU_NOME[top.grau]}</b>, sem neutralização comprovada por medidas de proteção coletiva ou individual. Desta forma, os trabalhadores <b>fazem jus</b> à percepção do adicional de insalubridade de <b>${pct}%</b> sobre o salário mínimo da região, conforme a Norma Regulamentadora nº 15.${outros}`,
      resumoHtml: `<b>Faz jus</b> à percepção do adicional de insalubridade (grau ${GRAU_NOME[top.grau]}, ${pct}%).`,
      fazJus: true,
    };
  }
  let motivo = '';
  if (neutral.length)
    motivo = ` A exposição a ${neutral.map((c) => `<b>${esc(c.a.agente)}</b> (${esc(nr15Label(c.anexo))})`).join(', ')} encontra-se neutralizada pelo uso de equipamento de proteção eficaz, nos termos do item 15.4.1 da NR-15.`;
  if (abaixo.length)
    motivo += ` A avaliação quantitativa de ${abaixo.map((c) => `<b>${esc(c.a.agente)}</b> (${esc(medicaoTexto(c.a.risco!.medicao!))})`).join(', ')} não ultrapassou o limite de tolerância.`;
  return {
    ...base,
    atividades: SEM_ATIVIDADE,
    conclusaoHtml: `Após a análise dos cargos deste GHE, conclui-se que não há exposição ocupacional capaz de caracterizar o ambiente de trabalho como insalubre.${motivo} Desta forma, os trabalhadores <b>não fazem jus</b> à percepção do adicional de insalubridade, conforme a Norma Regulamentadora nº 15.`,
    resumoHtml: resumoCurto('insalubridade', false),
    fazJus: false,
  };
}

/**
 * PERICULOSIDADE (NR-16; CLT art. 193): rows come from GHE risks of ANY group with `nr16Anexo`
 * (hazardous activities are not limited to F/Q/B) and from the GHE text `atividadesPerigosas`.
 * The right exists when a row has an NR-16 annex and the exposure is not merely eventual
 * (permanent or intermittent contact; TST Súmula 364). Addition: 30% of the base salary.
 */
function parecerPericulosidade(g: GheGroup, epis: LegacyEpi[], funcoes: string[]): { rows: LtcatPericulosidadeRow[]; d: LtcatDireito } {
  type R = LtcatPericulosidadeRow & { anexo: string; eventual: boolean };
  const rows: R[] = (g.riscos || [])
    .filter((r) => s(r.nr16Anexo))
    .map((r) => {
      const h = s(r.habitualidade) || habitualidade(r);
      return {
        atividade: s(r.perigo) || s(r.fonte) || '-',
        area: s(r.onde) || s(r.fonte) || '-',
        tempo: habitualidadeTexto(h) || '-',
        embasamento: nr16Label(r.nr16Anexo),
        controles: controlesLista(r, epis, s(g.ghe.nome), funcoes),
        anexo: s(r.nr16Anexo),
        eventual: /^eventual$|ocasional e intermitente/i.test(h),
      };
    });
  const txt = s(g.ghe.atividadesPerigosas);
  if (txt) {
    const m = /anexo\s*(\d+|\(\*\)|\*)/i.exec(txt);
    if (!rows.some((r) => txt.toLowerCase().includes(r.atividade.toLowerCase())))
      rows.unshift({ atividade: txt, area: '-', tempo: '-', embasamento: m ? `NR-16, Anexo ${m[1]}` : '-', controles: [], anexo: m ? m[1] : '', eventual: false });
  }
  const base = { fator: 'periculosidade' as const, rotulo: 'Periculosidade', codigo: '', manual: false };
  const valid = rows.filter((r) => r.anexo && !r.eventual);
  let d: LtcatDireito;
  if (valid.length) {
    d = {
      ...base,
      atividades: valid.map((r) => `${r.atividade} (${r.embasamento})`).join('; '),
      conclusaoHtml: `Conforme as avaliações deste GHE, os colaboradores exercem ${valid.map((r) => `<b>${esc(r.atividade)}</b>${r.area !== '-' ? ' em ' + esc(r.area) : ''}`).join('; ')}, atividade(s) ou operação(ões) perigosa(s) nos termos da <b>${esc(valid.map((r) => r.embasamento).filter((x, i, a) => a.indexOf(x) === i).join(' e '))}</b>, com exposição não eventual. Desta forma, <b>fazem jus</b> ao adicional de periculosidade de <b>30%</b> sobre o salário, sem os acréscimos resultantes de gratificações, prêmios ou participações nos lucros (art. 193 da CLT), facultada a opção pelo adicional de insalubridade, quando houver.`,
      resumoHtml: `<b>Faz jus</b> à percepção do adicional de periculosidade (30%).`,
      fazJus: true,
    };
  } else {
    const nota = rows.length
      ? ` As atividades registradas (${rows.map((r) => esc(r.atividade)).join('; ')}) ${rows.some((r) => r.anexo) ? 'ocorrem de forma eventual' : 'não se enquadram em anexo da NR-16'}, não caracterizando periculosidade.`
      : '';
    d = {
      ...base,
      atividades: SEM_ATIVIDADE,
      conclusaoHtml: `Conforme as avaliações deste GHE, conclui-se que os colaboradores não exercem atividades ou operações perigosas que caracterizem periculosidade.${nota} Desta forma, <b>não fazem jus</b> ao adicional de periculosidade previsto na Norma Regulamentadora nº 16.`,
      resumoHtml: resumoCurto('periculosidade', false),
      fazJus: false,
    };
  }
  return { rows: rows.map((r) => ({ atividade: r.atividade, area: r.area, tempo: r.tempo, embasamento: r.embasamento, controles: r.controles })), d };
}

/**
 * APOSENTADORIA ESPECIAL (Lei 8.213/91 arts. 57–58; Decreto 3.048/99 art. 68 and Anexo IV;
 * IN PRES/INSS 128/2022): an agent is a candidate when it has an Anexo IV code or an eSocial
 * Tabela 24 code other than 09.01.001. It ensures the right when ALL hold:
 * - exposure is "habitual e permanente, não ocasional nem intermitente" (art. 57 §3);
 * - a numeric measurement, when present, exceeds the limit (quantitative agents);
 * - EPC/EPI is not effective. Per STF ARE 664.335 (Tema 555), an effective EPI removes the
 *   right, EXCEPT for ruído, where the EPI declaration never neutralises it.
 * Years come from `aposentadoriaAnos` (15/20/25); eSocial Tabela 02 code 2/3/4 follows the years.
 */
function parecerAposentadoria(ag: LtcatAgente[]): LtcatDireito {
  const base = { fator: 'aposentadoria' as const, rotulo: 'Aposentadoria especial', manual: false };
  type C = { a: LtcatAgente; motivo: string };
  const ok: LtcatAgente[] = [];
  const nao: C[] = [];
  ag.forEach((a) => {
    const r = a.risco!;
    const cod = s(r.codEsocial);
    if (!s(r.anexoIvCodigo) && !(cod && cod !== COD_AUSENCIA)) return;
    const h = a.habitualidade || habitualidade(r);
    if (!isPermanente(h)) return void nao.push({ a, motivo: 'a exposição não é habitual e permanente' });
    if (acimaDoLimite(r.medicao) === false) return void nao.push({ a, motivo: 'a avaliação quantitativa não ultrapassou o limite de tolerância' });
    if ((r.epiEficaz === true || r.epcEficaz === true) && !isRuido(r)) return void nao.push({ a, motivo: 'há EPC/EPI eficaz que neutraliza a nocividade' });
    ok.push(a);
  });
  const codigos = (list: LtcatAgente[]) =>
    list
      .map((a) => s(a.risco!.codEsocial))
      .filter((c, i, arr) => c && c !== COD_AUSENCIA && arr.indexOf(c) === i)
      .join(', ');
  if (ok.length) {
    const anos = ok.map((a) => Number(a.risco!.aposentadoriaAnos) || 0).filter((n) => n === 15 || n === 20 || n === 25);
    const menor = anos.length ? Math.min(...anos) : 0;
    const t02 = menor === 15 ? '2' : menor === 20 ? '3' : menor === 25 ? '4' : '';
    const agTxt = ok
      .map((a) => {
        const r = a.risco!;
        const refs = [s(r.anexoIvCodigo) ? `Anexo IV, item ${esc(s(r.anexoIvCodigo))}` : '', s(r.codEsocial) ? `eSocial Tabela 24, código ${esc(s(r.codEsocial))}` : ''].filter(Boolean).join('; ');
        const med = r.medicao && s(r.medicao.resultado) ? `, nível ${esc(medicaoTexto(r.medicao))}` : '';
        return `<b>${esc(a.agente)}</b>${refs ? ` (${refs})` : ''}${med}`;
      })
      .join(', ');
    const ruidoEpi = ok.some((a) => isRuido(a.risco!) && (a.risco!.epiEficaz === true || a.risco!.epcEficaz === true));
    const protecao = ruidoEpi
      ? '. Embora haja declaração de EPI eficaz, para o agente ruído essa declaração não descaracteriza o tempo especial (STF, ARE 664.335), nos termos do Anexo IV do Decreto 3.048/99.'
      : ', sem medida de proteção coletiva ou individual capaz de neutralizar a nocividade, nos termos do Anexo IV do Decreto 3.048/99.';
    return {
      ...base,
      codigo: codigos(ok),
      atividades: ok.map((a) => a.agente).join('; '),
      conclusaoHtml: `Os colaboradores deste GHE <b>possuem exposição</b> habitual e permanente, não ocasional nem intermitente, a ${agTxt}${protecao} Desta forma, <b>fazem jus</b> à aposentadoria especial${menor ? ` aos <b>${menor} anos</b> de exposição` : ''}${t02 ? ` (financiamento: eSocial Tabela 02, código <b>${t02}</b>)` : ''}.`,
      resumoHtml: `<b>Faz jus</b> ao direito de aposentadoria especial${menor ? ` (${menor} anos)` : ''}.`,
      fazJus: true,
    };
  }
  const motivo = nao.length ? ` Quanto a ${nao.map((c) => `<b>${esc(c.a.agente)}</b>, ${c.motivo}`).join('; ')}.` : '';
  return {
    ...base,
    codigo: COD_AUSENCIA,
    atividades: SEM_ATIVIDADE,
    conclusaoHtml: `Os colaboradores deste GHE <b>não possuem exposição</b> a agentes nocivos capazes de gerar condições para aposentadoria especial, de acordo com os parâmetros estabelecidos no Anexo IV do Decreto 3.048/99.${motivo}`,
    resumoHtml: resumoCurto('aposentadoria', false),
    fazJus: false,
  };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const GHE_PREFIX = /^\s*GHE[\s\-–_.:]*(\d+)?\s*[-–:.]?\s*/i;

function gheNumeroNome(g: GheGroup, ix: number): { numero: number; nome: string } {
  const raw = s(g.ghe.nome);
  const m = GHE_PREFIX.exec(raw);
  const nome = (m ? raw.slice(m[0].length) : raw).trim() || raw || `GHE ${ix + 1}`;
  const n = Number(g.ghe.numero);
  const numero = Number.isFinite(n) && n > 0 ? n : m && m[1] ? Number(m[1]) : ix + 1;
  return { numero, nome };
}

function toAgente(r: LegacyRisco, L: LtcatLetra, gheNome: string, epis: LegacyEpi[], funcoes: string[]): LtcatAgente {
  const med = temMedicaoRisco(r) ? r.medicao! : null;
  const tec = s(r.tecnicaAnalise) || (med ? 'Quantitativa' : 'Qualitativa');
  const tecnica = med && s(med.tecnica) && !tec.includes(s(med.tecnica)) ? `${tec} (${s(med.tecnica)})` : tec;
  const h = habitualidade(r);
  const lista = controlesLista(r, epis, gheNome, funcoes);
  return {
    ghe: gheNome || s(r.ghe) || s(r.funcao) || '-',
    grupo: s(r.grupo) || LETRA_NOME[L],
    agente: s(r.perigo) || '-',
    fonte: s(r.fonte) || '-',
    dano: s(r.dano) || '-',
    controles: lista.join('; ') || '-',
    metodo: metodo(r),
    enquadramento: '',
    exposicao: exposicao(r),
    letra: L,
    codEsocial: s(r.codEsocial),
    meioPropagacao: s(r.meioPropagacao) || '-',
    tecnica,
    nivel: exposicao(r),
    habitualidade: h,
    te: te(r.prob),
    pd: pd(r.sev),
    gr: gr(r.prob, r.sev),
    controlesLista: lista,
    medicao: med,
    risco: r,
  };
}

function stripTags(h: string): string {
  return h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

export function ltcatGhes(p: LegacyProject): LtcatGhe[] {
  const epis = p.epis || [];
  return groups(p).map((g, ix) => {
    const { numero, nome } = gheNumeroNome(g, ix);
    const funcoes = (g.funcoes || []).map((f) => s(f.nome)).filter(Boolean);
    const gheNome = s(g.ghe.nome);
    const agentes: LtcatAgente[] = [];
    (g.riscos || []).forEach((r) => {
      const L = letraLtcat(r);
      if (L) agentes.push(toAgente(r, L, gheNome, epis, funcoes));
    });
    const order = { F: 0, Q: 1, B: 2 };
    agentes.sort((a, b) => order[a.letra!] - order[b.letra!]);
    let ins = parecerInsalubridade(agentes);
    const perR = parecerPericulosidade(g, epis, funcoes);
    let per = perR.d;
    let apo = parecerAposentadoria(agentes);
    if (s(g.ghe.parecerInsalubridade)) ins = manualDireito(ins, s(g.ghe.parecerInsalubridade));
    if (s(g.ghe.parecerPericulosidade)) per = manualDireito(per, s(g.ghe.parecerPericulosidade));
    if (s(g.ghe.parecerAposentadoria)) apo = manualDireito(apo, s(g.ghe.parecerAposentadoria));
    // A manual opinion that grants the right must not keep the "absence" code.
    if (apo.manual && apo.fazJus !== false && apo.codigo === COD_AUSENCIA) {
      const c = agentes.map((a) => a.codEsocial).filter((x) => x && x !== COD_AUSENCIA);
      apo = { ...apo, codigo: c.filter((x, i) => c.indexOf(x) === i).join(', ') };
    }
    // Enquadramento text per agent (used by the app summary).
    agentes.forEach((a) => {
      const bits: string[] = [];
      if (s(a.risco?.nr15Anexo)) bits.push(`NR-15 ${s(a.risco?.nr15Anexo)}${s(a.risco?.grauInsalubridade) ? ' (grau ' + s(a.risco?.grauInsalubridade).toLowerCase() + ')' : ''}`);
      if (s(a.risco?.anexoIvCodigo)) bits.push(`Decreto 3.048/99 Anexo IV ${s(a.risco?.anexoIvCodigo)}`);
      if (a.codEsocial) bits.push(`eSocial ${a.codEsocial}`);
      a.enquadramento = `${bits.length ? bits.join(' · ') + '. ' : ''}Insalubridade: ${stripTags(ins.resumoHtml)} Aposentadoria especial: ${stripTags(apo.resumoHtml)}`;
    });
    return { numero, nome, titulo: `GHE ${numero}: ${nome}`, group: g, agentes, perigosas: perR.rows, ins, per, apo };
  });
}

export function ltcatRt(p: LegacyProject): LtcatRt {
  const e = p.empresa || {};
  // assinante escolhido para o LTCAT (condomínio ou padrão da equipe)
  if (e.ltcatNome) {
    const tipo = e.ltcatRt === 'medico' ? 'medico' : 'engenheiro';
    return { tipo, nome: s(e.ltcatNome), conselho: tipo === 'medico' ? 'CRM' : 'CREA', registro: s(e.ltcatRegistro) };
  }
  if (e.ltcatRt === 'medico') return { tipo: 'medico', nome: s(e.medicoTrabalho), conselho: 'CRM', registro: s(e.crmMedico) };
  return { tipo: 'engenheiro', nome: s(e.engSeguranca), conselho: 'CREA', registro: s(e.creaEng) };
}

export function ltcatPlanFor(p: LegacyProject): LtcatPlan {
  const riscos = p.riscos || [];
  const ghes = ltcatGhes(p);
  const agentes = ghes.flatMap((g) => g.agentes);
  const ocupacionais = riscos.filter((r) => !isAgente(r));
  const temMedicao = riscos.some((r) => isAgente(r) && temMedicaoRisco(r));
  let conclusao: string;
  if (!riscos.length) conclusao = 'Não há inventário de riscos cadastrado. Complete o PGR para fundamentar o LTCAT.';
  else {
    const lista = (f: 'ins' | 'per' | 'apo') => ghes.filter((g) => g[f].fazJus === true).map((g) => g.titulo);
    const ins = lista('ins');
    const per = lista('per');
    const apo = lista('apo');
    const parts: string[] = [];
    parts.push(ins.length ? `Insalubridade caracterizada em: ${ins.join('; ')}.` : 'Não se caracteriza insalubridade (NR-15) nos GHE avaliados.');
    parts.push(per.length ? `Periculosidade caracterizada em: ${per.join('; ')}.` : 'Não se caracteriza periculosidade (NR-16).');
    parts.push(apo.length ? `Exposição a agente nocivo para aposentadoria especial em: ${apo.join('; ')}.` : 'Não há enquadramento para aposentadoria especial (Anexo IV do Decreto 3.048/99; eSocial 09.01.001).');
    if (agentes.length && !temMedicao) parts.push('A análise dos agentes é qualitativa; medições quantitativas, quando houver, complementam este laudo.');
    if (ghes.some((g) => g.ins.manual || g.per.manual || g.apo.manual)) parts.push('Há parecer redigido manualmente em ao menos um GHE.');
    conclusao = parts.join(' ');
  }
  return {
    eng: { nome: p.empresa?.engSeguranca || '', crea: p.empresa?.creaEng || '' },
    sst: { nome: p.empresa?.respSst || '', reg: p.empresa?.regSst || '' },
    agentes,
    ocupacionais,
    conclusao,
    temMedicao,
    rt: ltcatRt(p),
    ghes,
  };
}
