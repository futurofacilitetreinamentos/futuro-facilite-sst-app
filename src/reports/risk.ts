// Risk helpers: score level (V8Report.level), TE / PD / GR codes (EvolueDocs).

export type RiskLevelLabel = 'Baixo' | 'Moderado' | 'Alto' | 'Crítico';
export type RiskLevelClass = 'baixo' | 'moderado' | 'alto' | 'critico';

export interface RiskLevel {
  label: RiskLevelLabel;
  cls: RiskLevelClass;
}

/** Score (prob × sev) → level, identical thresholds to V8Report.level. */
export function riskLevel(score: number): RiskLevel {
  if (score <= 4) return { label: 'Baixo', cls: 'baixo' };
  if (score <= 9) return { label: 'Moderado', cls: 'moderado' };
  if (score <= 16) return { label: 'Alto', cls: 'alto' };
  return { label: 'Crítico', cls: 'critico' };
}

/** prob × sev as numbers (legacy stores them as strings). */
export function riskScore(prob?: string | number, sev?: string | number): number {
  return Number(prob) * Number(sev);
}

/** Tempo de exposição. */
export type TeCode = 'E' | 'I' | 'P';
/** Potencial de dano. */
export type PdCode = 'B' | 'M' | 'A' | 'C';
/** Graduação de risco. */
export type GrCode = 'T' | 'M' | 'S' | 'IT';

export function te(prob?: string | number): TeCode {
  const n = Number(prob);
  if (n >= 4) return 'P';
  if (n >= 2) return 'I';
  return 'E';
}

export function teNome(code: string): string {
  return code === 'P' ? 'Permanente' : code === 'I' ? 'Intermitente' : 'Eventual';
}

export function pd(sev?: string | number): PdCode {
  const n = Number(sev);
  if (n >= 5) return 'C';
  if (n >= 4) return 'A';
  if (n >= 3) return 'M';
  return 'B';
}

export function pdNome(code: string): string {
  return code === 'C' ? 'Crítico' : code === 'A' ? 'Alto' : code === 'M' ? 'Médio' : 'Baixo';
}

/**
 * The printed "Matriz de graduação de risco" (rows PD, columns TE).
 * This is the single source of truth for GR in every document.
 */
export const GR_MATRIX: Record<PdCode, Record<TeCode, GrCode>> = {
  B: { P: 'M', I: 'T', E: 'T' },
  M: { P: 'S', I: 'M', E: 'T' },
  A: { P: 'IT', I: 'S', E: 'M' },
  C: { P: 'IT', I: 'IT', E: 'S' },
};

/**
 * GR derived from the TE × PD matrix printed in the documents
 * (GR_MATRIX[pd(sev)][te(prob)]), so the inventory column and the matrix agree.
 */
export function gr(prob?: string | number, sev?: string | number): GrCode {
  return GR_MATRIX[pd(sev)][te(prob)];
}

/**
 * Legacy score-based GR (EvolueDocs.gr: prob × sev ≥17 IT, ≥10 S, ≥5 M, else T).
 * Kept for reference only; the documents use {@link gr}.
 */
export function grByScore(prob?: string | number, sev?: string | number): GrCode {
  const s = Number(prob) * Number(sev);
  if (s >= 17) return 'IT';
  if (s >= 10) return 'S';
  if (s >= 5) return 'M';
  return 'T';
}

export function grNome(code: string): string {
  return code === 'IT' ? 'Intolerável' : code === 'S' ? 'Substancial' : code === 'M' ? 'Moderado' : 'Tolerável';
}
