// PCMSO exam planning (NR-7), per GHE (document section 6) and per função
// (app summary). Pure functions over the legacy project.
//
// Exam rules (phase C). Every eSocial code printed here was checked against
// "Tabela 27 – Procedimentos Diagnósticos" of Anexo I dos leiautes do eSocial
// (gov.br, leiautes v2.5 / NT 19/2020 consolidated tables):
//   0295 Avaliação Clínica Ocupacional (Anamnese e Exame físico)  — base, every worker (NR-7 7.5.6)
//   0693 Hemograma com contagem de plaquetas ou frações             — base, as in the reference PCMSO
//   0281 Audiometria tonal ocupacional                               — noise exposure (NR-7 Anexo II)
//   1057 Prova de função pulmonar completa (ou espirometria)         — mineral dust / aerodispersoides (NR-7 Anexo III)
//   1078 Radiografia de tórax (PA) Padrão OIT                        — mineral dust (NR-7 Anexo III)
//   0296 Avaliação da acuidade visual                                — work at height / electricity (NR-35 / NR-10 aptidão)
//   0530 ECG convencional de até 12 derivações                       — idem
//   0658 Glicemia                                                    — idem
// The previous rule set printed 0523 (that code is "Dissulfeto de carbono") for
// espirometria and 0105 ("Ácido fórmico") for acuidade visual; both were wrong
// and are fixed above. Code-less pseudo-exams ("Avaliação osteomuscular",
// "Avaliação de risco biológico", "saúde mental", "sobrecarga térmica") were
// removed: they are part of the clinical exam (0295), not tabela 27 procedures.
// A função alone (porteiro, vigilante) no longer triggers exams: only risks do.
import type { LegacyFuncao, LegacyGhe, LegacyProject, LegacyRisco } from './types';
import { groups } from './evolue';

export interface PcmsoExame {
  exame: string;
  /** eSocial tabela 27 code ('' = printed without code). */
  esocial: string;
  /** Moments, e.g. 'A / P / R / M / D'. */
  tipos: string;
  /** 'Anual' | 'Semestral' | 'Bienal' | free text. */
  periodo: string;
  motivo: string;
  /** Months after the admissional exam for the first periodic one ('' = derive from periodo). */
  meses?: string;
}

export interface PcmsoFuncaoPlan {
  funcao: string;
  setor: string;
  qtd: string;
  atividades: string;
  riscos: LegacyRisco[];
  exames: PcmsoExame[];
  cargaHoraria?: string;
}

/** One block of section 6 (a GHE, or a função when the project has no GHE). */
export interface PcmsoGhePlan {
  /** Heading text (GHE name without the "GHE-01" prefix). */
  nome: string;
  ghe: LegacyGhe | null;
  funcoes: { nome: string; cargaHoraria: string }[];
  riscos: LegacyRisco[];
  exames: PcmsoExame[];
}

export interface PcmsoPlan {
  medico: { nome: string; crm: string };
  byFunc: PcmsoFuncaoPlan[];
  /** Section 6 blocks (phase C). */
  byGhe: PcmsoGhePlan[];
  /** true when byGhe comes from registered GHEs, false = one block per função (fallback). */
  porGhe: boolean;
  riscos: LegacyRisco[];
  nExames: number;
  nFuncoes: number;
}

export const PCMSO_BASE: PcmsoExame = {
  exame: 'Avaliação Clínica Ocupacional',
  esocial: '0295',
  tipos: 'A / P / R / M / D',
  periodo: 'Anual',
  motivo: 'NR-7 — exame clínico de todos os trabalhadores',
};
const HEMO: PcmsoExame = { exame: 'Hemograma completo', esocial: '0693', tipos: 'A / P / D', periodo: 'Anual', motivo: 'Exame complementar de base do programa' };

const AUDIO: PcmsoExame = {
  exame: 'Audiometria tonal ocupacional',
  esocial: '0281',
  tipos: 'A / P / D',
  periodo: 'Anual',
  meses: '6',
  motivo: 'Exposição a ruído — NR-7 Anexo II (admissional, 6 meses após, anual e demissional)',
};
const ESPIRO: PcmsoExame = { exame: 'Espirometria', esocial: '1057', tipos: 'A / P', periodo: 'Bienal', motivo: 'Aerodispersoides — NR-7 Anexo III' };
const RX_OIT: PcmsoExame = { exame: 'Radiografia de tórax (PA) padrão OIT', esocial: '1078', tipos: 'A / P', periodo: 'Conforme Anexo III', meses: '-', motivo: 'Poeiras minerais — NR-7 Anexo III' };
const ACUIDADE: PcmsoExame = { exame: 'Avaliação da acuidade visual', esocial: '0296', tipos: 'A / P', periodo: 'Anual', motivo: 'Aptidão para trabalho em altura / com eletricidade' };
const ECG: PcmsoExame = { exame: 'Eletrocardiograma (ECG)', esocial: '0530', tipos: 'A / P', periodo: 'Anual', motivo: 'Aptidão para trabalho em altura / com eletricidade' };
const GLICEMIA: PcmsoExame = { exame: 'Glicemia', esocial: '0658', tipos: 'A / P', periodo: 'Anual', motivo: 'Aptidão para trabalho em altura / com eletricidade' };

const RE_RUIDO = /ru[ií]do|n[ií]vel de press[aã]o sonora|barulho/;
const RE_POEIRA_MINERAL = /s[ií]lica|asbesto|amianto|poeira mineral|poeiras minerais|carv[aã]o mineral|aerodispers/;
const RE_ALTURA = /trabalho em altura|queda de altura|queda com diferen[cç]a de n[ií]vel|diferen[cç]a de n[ií]vel|andaime|telhado|nr-?\s?35|eletricidade|choque el[eé]trico|instala[cç][oõ]es el[eé]tricas|nr-?\s?10/;

function addUnique(arr: PcmsoExame[], item: PcmsoExame): void {
  if (!arr.some((x) => x.exame === item.exame)) arr.push({ ...item });
}

function riskText(r: LegacyRisco): string {
  return [r.perigo, r.fonte, r.dano].map((x) => String(x || '')).join(' ').toLowerCase();
}

/** Complementary exams justified by one risk (empty when none). */
export function examesPorRisco(r: LegacyRisco, motivoSuffix = true): PcmsoExame[] {
  const t = riskText(r);
  const g = String(r.grupo || '').toLowerCase();
  const out: PcmsoExame[] = [];
  const tag = (e: PcmsoExame): PcmsoExame => ({ ...e, motivo: motivoSuffix && r.perigo ? `${e.motivo} (${r.perigo})` : e.motivo });
  if (RE_RUIDO.test(t)) out.push(tag(AUDIO));
  if (RE_POEIRA_MINERAL.test(t) && (g.includes('quím') || g.includes('quim') || g.includes('fís') || g.includes('fis') || !g)) {
    out.push(tag(ESPIRO), tag(RX_OIT));
  }
  if (RE_ALTURA.test(t) && !/ergo|psico/.test(g)) out.push(tag(ACUIDADE), tag(ECG), tag(GLICEMIA));
  return out;
}

/**
 * Exams of a block: base pair + those justified by its risks. Without any risk the
 * clinical exam is biennial (NR-7 7.5.8 b); with risks it is annual (7.5.8 a).
 */
export function examesDoBloco(riscos: LegacyRisco[]): PcmsoExame[] {
  const periodo = riscos.length ? 'Anual' : 'Bienal';
  const exames: PcmsoExame[] = [
    { ...PCMSO_BASE, periodo },
    { ...HEMO, periodo },
  ];
  riscos.forEach((r) => examesPorRisco(r).forEach((e) => addUnique(exames, e)));
  return exames;
}

/** Months after the admissional exam: explicit `meses`, else Anual 12 / Semestral 6 / Bienal 24. */
export function mesesAposAdmissional(e: PcmsoExame): string {
  if (e.meses) return e.meses;
  const p = String(e.periodo || '').toLowerCase();
  if (p.includes('semest')) return '6';
  if (p.includes('bien') || p.includes('2 anos')) return '24';
  if (p.includes('anual')) return '12';
  return '-';
}

/** "GHE-01 Porteiros" / "GHE 1: Zeladoria" → "Porteiros" / "Zeladoria". */
export function gheTitulo(nome: string): string {
  const s = String(nome || '').trim();
  const t = s.replace(/^GHE\s*[-–—:.]?\s*\d*\s*[-–—:.]?\s*/i, '').trim();
  return t || s;
}

function unassigned(riscos: LegacyRisco[]): LegacyRisco[] {
  return riscos.filter((r) => !String(r.ghe || '').trim() && !String(r.funcao || '').trim());
}

function fnRow(f: LegacyFuncao): { nome: string; cargaHoraria: string } {
  return { nome: f.nome || '', cargaHoraria: String(f.cargaHoraria || '').trim() };
}

/**
 * Section 6 blocks. Registered GHEs → one block per GHE (evolue.groups grouping);
 * no GHE → one block per função; nothing registered → one generic block.
 * Risks with neither GHE nor função apply to every block.
 */
export function pcmsoBlocos(p: LegacyProject): { blocos: PcmsoGhePlan[]; porGhe: boolean } {
  const riscos = p.riscos || [];
  const funcoes = p.funcoes || [];
  const global = unassigned(riscos);
  const merge = (rs: LegacyRisco[]): LegacyRisco[] => [...rs, ...global.filter((g) => !rs.includes(g))];
  if ((p.ghe || []).length) {
    const blocos = [...groups(p)]
      .map((g, i) => ({ g, i }))
      .sort((a, b) => (a.g.ghe.numero ?? a.i + 1) - (b.g.ghe.numero ?? b.i + 1))
      .map(({ g }) => {
        const rs = merge(g.riscos || []);
        let fns = (g.funcoes || []).map(fnRow);
        if (!fns.length)
          fns = String(g.ghe.funcoes || '')
            .split(/[,;]/)
            .map((x) => x.trim())
            .filter(Boolean)
            .map((nome) => ({ nome, cargaHoraria: '' }));
        return { nome: gheTitulo(g.ghe.nome || ''), ghe: g.ghe, funcoes: fns, riscos: rs, exames: examesDoBloco(rs) };
      });
    return { blocos, porGhe: true };
  }
  if (funcoes.length) {
    const blocos = funcoes.map((f) => {
      const rs = merge(riscos.filter((r) => r.funcao === f.nome || (!!f.nome && r.ghe === f.nome)));
      return { nome: f.nome || 'Função', ghe: null, funcoes: [fnRow(f)], riscos: rs, exames: examesDoBloco(rs) };
    });
    return { blocos, porGhe: false };
  }
  return { blocos: [{ nome: 'Trabalhadores do condomínio', ghe: null, funcoes: [], riscos, exames: examesDoBloco(riscos) }], porGhe: false };
}

export function pcmsoPlanFor(p: LegacyProject): PcmsoPlan {
  const funcoes = p.funcoes || [];
  const riscos = p.riscos || [];
  const { blocos, porGhe } = pcmsoBlocos(p);
  let names = funcoes.map((f) => f.nome || '').filter(Boolean);
  if (!names.length) names = [...new Set(riscos.map((r) => r.funcao || r.ghe || '').filter(Boolean))];
  if (!names.length) names = ['Trabalhadores do condomínio'];
  const byFunc: PcmsoFuncaoPlan[] = names.map((nome) => {
    const f = funcoes.find((x) => x.nome === nome) || { nome, quantidade: '', setor: '', atividades: '' };
    const own = blocos.filter((b) => b.funcoes.some((x) => x.nome === nome) || b.nome === nome);
    const src = own.length ? own : blocos.length === 1 ? blocos : [];
    const linked: LegacyRisco[] = [];
    src.forEach((b) => b.riscos.forEach((r) => !linked.includes(r) && linked.push(r)));
    if (!src.length) riscos.filter((r) => r.funcao === nome || r.ghe === nome).forEach((r) => linked.push(r));
    return {
      funcao: f.nome || '',
      setor: f.setor || '',
      qtd: f.quantidade || '',
      atividades: f.atividades || '',
      cargaHoraria: f.cargaHoraria || '',
      riscos: linked,
      exames: examesDoBloco(linked),
    };
  });
  return {
    medico: { nome: p.empresa?.medicoTrabalho || '', crm: p.empresa?.crmMedico || '' },
    byFunc,
    byGhe: blocos,
    porGhe,
    riscos,
    nExames: byFunc.reduce((a, f) => a + f.exames.length, 0),
    nFuncoes: byFunc.length,
  };
}
