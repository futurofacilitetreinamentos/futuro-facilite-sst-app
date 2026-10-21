// App-side views over the documents: readiness cards, blocking reasons,
// buildDoc dispatcher, plano de ação and KPI summaries.
import type { DocContext, LegacyProject } from './types';
import { fmt } from './html';
import { gr, grNome, riskLevel, riskScore } from './risk';
import type { RiskLevelLabel } from './risk';
import { pcmsoPlanFor } from './pcmso';
import type { PcmsoPlan } from './pcmso';
import { ltcatPlanFor, ltcatRt } from './ltcat';
import type { LtcatPlan } from './ltcat';
import { nColabs, scoreDrps } from './drps';
import type { DrpsBundle } from './drps';
import { checklistValues, emp, latestInspection } from './common';
import { buildPGR } from './pgr-doc';
import { buildPCMSO } from './pcmso-doc';
import { buildLTCAT } from './ltcat-doc';
import { buildNR1 } from './nr1-doc';
import { buildInspecao } from './inspecao-doc';
// ---------------------------------------------------------------------------
// Laudos view: readiness (app.js renderLaudos)
// ---------------------------------------------------------------------------

export type DocId = 'inspecao' | 'pgr' | 'nr1' | 'pcmso' | 'ltcat';

export interface DocReadiness {
  id: DocId;
  title: string;
  ready: boolean;
  status: 'PRONTO' | 'PENDENTE';
  /** Plain text (not HTML). */
  meta: string;
  /**
   * What the card's primary action is when it can't be previewed:
   * 'inspecao' → go to inspection, 'cadastro' → go to cadastro, null → Prévia / Gerar PDF.
   * (Legacy shows Prévia/PDF for PCMSO/LTCAT whenever cadastro exists, even if PENDENTE;
   * the preview then asks for the médico / engenheiro.)
   */
  goTo: 'inspecao' | 'cadastro' | null;
}

export function hasCadastro(p: LegacyProject): boolean {
  return !!p.empresa?.razaoSocial;
}

export function readiness(ctx: DocContext): DocReadiness[] {
  const p = ctx.project;
  const cadastro = hasCadastro(p);
  const insp = latestInspection(ctx);
  const card = (id: DocId, title: string, ready: boolean, meta: string, goTo: DocReadiness['goTo']): DocReadiness => ({ id, title, ready, status: ready ? 'PRONTO' : 'PENDENTE', meta, goTo });
  return [
    card('inspecao', 'Relatório de inspeção SST', !!insp, insp ? `${insp.numero || ''} · ${fmt(insp.dataVisita)}` : 'Disponível após a inspeção', insp ? null : 'inspecao'),
    card(
      'pgr',
      'PGR / NR-1',
      cadastro,
      cadastro ? (insp ? `Cadastro, inventário, visita ${insp.numero || ''} e DRPS coletivo` : 'Cadastro e inventário — a visita entra após a inspeção') : 'Cadastre o condomínio e o inventário',
      cadastro ? null : 'cadastro',
    ),
    card('nr1', 'NR-1 / DRPS', cadastro, cadastro ? 'Diagnóstico coletivo de riscos psicossociais (resultado do formulário)' : 'Cadastre o condomínio', cadastro ? null : 'cadastro'),
    card(
      'pcmso',
      'PCMSO / NR-7',
      cadastro && !!p.empresa?.medicoTrabalho,
      cadastro ? (p.empresa?.medicoTrabalho ? 'Funções e riscos do cadastro, com o médico do condomínio' : 'Selecione o médico no cadastro do condomínio') : 'Cadastre o condomínio',
      cadastro ? null : 'cadastro',
    ),
    // O LTCAT é assinado pelo engenheiro ou pelo médico, conforme o cadastro (ltcatRt)
    card(
      'ltcat',
      'LTCAT',
      cadastro && !!ltcatRt(p).nome,
      cadastro
        ? ltcatRt(p).nome
          ? insp
            ? 'Inventário, visita técnica e registro fotográfico da inspeção'
            : 'Inventário do PGR — fotos entram após a inspeção'
          : ltcatRt(p).tipo === 'medico' ? 'Selecione o médico no cadastro do condomínio' : 'Selecione o engenheiro no cadastro do condomínio'
        : 'Cadastre o condomínio',
      cadastro ? null : 'cadastro',
    ),
  ];
}

/**
 * Pre-conditions the legacy preview/print buttons check (alerts in app.js).
 * Returns the legacy alert message, or null when the document can be generated.
 */
export function blockingReason(ctx: DocContext, id: DocId): string | null {
  const e = emp(ctx.project);
  if (id === 'inspecao') return latestInspection(ctx) ? null : 'Realize a inspeção deste condomínio primeiro.';
  if (!e.razaoSocial) return 'Cadastre o condomínio primeiro.';
  if (id === 'pcmso' && !e.medicoTrabalho) return 'Selecione o Médico do Trabalho no cadastro do condomínio.';
  if (id === 'ltcat' && !ltcatRt(ctx.project).nome) {
    return ltcatRt(ctx.project).tipo === 'medico'
      ? 'Selecione o Médico do Trabalho no cadastro do condomínio (o LTCAT está configurado para ser assinado pelo médico).'
      : 'Selecione o Engenheiro de Segurança no cadastro do condomínio.';
  }
  return null;
}

/** Builds any document by id (inspecao uses the latest inspection). Returns null if there is no inspection. */
export function buildDoc(ctx: DocContext, id: DocId): string | null {
  switch (id) {
    case 'pgr':
      return buildPGR(ctx);
    case 'pcmso':
      return buildPCMSO(ctx);
    case 'ltcat':
      return buildLTCAT(ctx);
    case 'nr1':
      return buildNR1(ctx);
    case 'inspecao': {
      const i = latestInspection(ctx);
      return i ? buildInspecao(ctx, i) : null;
    }
  }
}

// ---------------------------------------------------------------------------
// Plano de ação view (app.js renderPlano)
// ---------------------------------------------------------------------------

export interface PlanoAcaoRow {
  origem: 'Inventário' | 'Inspeção';
  risco: string;
  /** Inventário: riskLevel(prob×sev).label; Inspeção: the item's risco ('-' if empty). */
  nivel: RiskLevelLabel | string;
  /** Inventário only: CSS class of the level ('' for inspection rows). */
  nivelCls: string;
  /** GR name as printed in the PGR plano (TE×PD matrix); for inspection rows the item's risco or '—'. */
  gr: string;
  acao: string;
  resp: string;
  /** ISO date (format with fmt()). */
  prazo: string;
  status: string;
}

export function planoAcao(ctx: DocContext): PlanoAcaoRow[] {
  const p = ctx.project;
  const fromRiscos: PlanoAcaoRow[] = (p.riscos || [])
    .filter((r) => r.acao)
    .map((r) => {
      const lvl = riskLevel(riskScore(r.prob, r.sev));
      return {
        origem: 'Inventário',
        risco: r.perigo || '',
        nivel: lvl.label,
        nivelCls: lvl.cls,
        gr: grNome(gr(r.prob, r.sev)),
        acao: r.acao || '',
        resp: r.responsavel || '-',
        prazo: r.prazo || '',
        status: r.status || 'Pendente',
      };
    });
  const insp = latestInspection(ctx);
  const fromNc: PlanoAcaoRow[] = (insp ? checklistValues(insp) : [])
    .filter((x) => x.status === 'Não conforme' && x.acao)
    .map((x) => ({
      origem: 'Inspeção',
      risco: x.titulo || '',
      nivel: x.risco || '-',
      nivelCls: '',
      gr: x.risco || '—',
      acao: x.acao || '',
      resp: x.responsavel || '-',
      prazo: x.prazo || '',
      status: 'Pendente',
    }));
  return [...fromRiscos, ...fromNc];
}

// ---------------------------------------------------------------------------
// View summaries (KPIs) — app.js renderPgrSummary / renderPcmso / renderLtcat / renderNr1
// ---------------------------------------------------------------------------

export interface PgrSummary {
  setores: number;
  ghes: number;
  riscos: number;
  /** Riscos with prob × sev ≥ 10 ("Altos/críticos"). */
  altos: number;
  drpsRespostas: number;
  drpsAltos: number;
  inspecao: { numero: string; dataVisita: string } | null;
  /** Plain-text notice shown under the KPIs. */
  notice: string;
}

export function pgrSummary(ctx: DocContext): PgrSummary {
  const p = ctx.project;
  const d = scoreDrps(ctx.drps || []);
  const insp = latestInspection(ctx);
  const notice =
    (insp
      ? `A visita ${insp.numero || 'SST'} de ${fmt(insp.dataVisita)} entra no PGR (constatações e plano de ação). `
      : 'Após a inspeção SST, o relatório, as não conformidades e as fotos entram automaticamente no PGR e no LTCAT. ') +
    (d.n
      ? `O PGR inclui o resultado coletivo do DRPS (${d.n} resposta(s); ${d.altos.length} tópico(s) com gravidade alta).`
      : 'O PGR reserva a seção de riscos psicossociais. Quando houver respostas do DRPS, o resultado entra automaticamente no documento.');
  return {
    setores: (p.setores || []).length,
    ghes: (p.ghe || []).length,
    riscos: (p.riscos || []).length,
    altos: (p.riscos || []).filter((r) => riskScore(r.prob, r.sev) >= 10).length,
    drpsRespostas: d.n,
    drpsAltos: d.altos.length,
    inspecao: insp ? { numero: insp.numero || '', dataVisita: insp.dataVisita || '' } : null,
    notice,
  };
}

export function pcmsoPlan(ctx: DocContext): PcmsoPlan {
  return pcmsoPlanFor(ctx.project);
}

export interface PcmsoSummary {
  funcoes: number;
  exames: number;
  riscos: number;
  medicoDefinido: boolean;
  medico: { nome: string; crm: string };
  /** Plain-text notice (legacy: "Coordenador: <b>nome</b> · CRM x." + inventory hint). */
  notice: string;
  plan: PcmsoPlan;
}

export function pcmsoSummary(ctx: DocContext): PcmsoSummary {
  const plan = pcmsoPlan(ctx);
  const med = plan.medico;
  const okMed = !!med.nome;
  const okRiscos = (ctx.project.riscos || []).length > 0;
  const notice =
    (okMed ? `Coordenador: ${med.nome}${med.crm ? ' · CRM ' + med.crm : ''}.` : 'Selecione o médico no cadastro do condomínio (seta em Médico do Trabalho).') +
    ' ' +
    (okRiscos ? 'O quadro de exames segue os riscos do inventário.' : 'Cadastre o inventário de riscos para especializar os exames.');
  return { funcoes: plan.nFuncoes, exames: plan.nExames, riscos: (ctx.project.riscos || []).length, medicoDefinido: okMed, medico: med, notice, plan };
}

export function ltcatPlan(ctx: DocContext): LtcatPlan {
  return ltcatPlanFor(ctx.project);
}

export interface LtcatSummary {
  agentes: number;
  riscos: number;
  ghes: number;
  engenheiroDefinido: boolean;
  engenheiro: { nome: string; crea: string };
  /** Plain-text notice. */
  notice: string;
  conclusao: string;
  /** Shown when there are no agents. */
  semAgentes: string;
  plan: LtcatPlan;
}

export function ltcatSummary(ctx: DocContext): LtcatSummary {
  const p = ctx.project;
  const plan = ltcatPlan(ctx);
  const eng = plan.eng;
  const rt = ltcatRt(p);
  const okEng = !!rt.nome;
  const notice =
    (okEng
      ? `Responsável técnico: ${rt.nome}${rt.registro ? ` · ${rt.conselho} ${rt.registro}` : ''}.`
      : rt.tipo === 'medico'
        ? 'Selecione o médico do trabalho no cadastro do condomínio (o LTCAT está configurado para o médico).'
        : 'Selecione o engenheiro no cadastro do condomínio (seta em Engenheiro de Segurança).') +
    ' ' +
    ((p.riscos || []).length ? 'A conclusão previdenciária parte do inventário qualitativo.' : 'Cadastre o inventário de riscos para fundamentar o laudo.');
  return {
    agentes: plan.agentes.length,
    riscos: (p.riscos || []).length,
    ghes: (p.ghe || []).length,
    engenheiroDefinido: okEng,
    engenheiro: eng,
    notice,
    conclusao: plan.conclusao,
    semAgentes: 'Nenhum agente físico, químico ou biológico destacado. Riscos ergonômicos, de acidente e psicossociais ficam no PGR, sem enquadramento no Anexo IV.',
    plan,
  };
}

export interface DrpsRespondent {
  funcao: string;
  setor: string;
  ts: string;
}

export interface DrpsSummary extends DrpsBundle {
  /** Expected collaborators (numTrabalhadores or sum of função quantities). */
  nColabs: number;
  /** Anonymous list (no answers): funcao / setor / ts, in input order. */
  respondents: DrpsRespondent[];
}

export function drpsSummary(ctx: DocContext): DrpsSummary {
  const list = ctx.drps || [];
  return {
    ...scoreDrps(list),
    nColabs: nColabs(ctx.project),
    respondents: list.map((r) => ({ funcao: r.funcao || '', setor: r.setor || '', ts: r.ts || '' })),
  };
}
