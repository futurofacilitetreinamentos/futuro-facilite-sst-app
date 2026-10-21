// PCMSO — Programa de Controle Médico de Saúde Ocupacional (NR-7).
// Structure and tables follow the Evolue/Esoft reference (specs/pcmso.md), with
// our cover and our own boilerplate wording (pcmso-texts.ts).
//
// Page flow: cover · revisões · apresentação · sumário (pre-text pages, no number)
// · 1 · 2 · 3–5 (flowing) · 6 (one block per GHE; per função when there is no
// GHE) · 7 · 8 · 9 ANEXOS. Every numbered section except 4 and 5 starts a page.
import type { DocContext, LegacyEmpresa, LegacyProject, LegacyRisco } from './types';
import { esc, fmtH } from './html';
import { dataExtenso } from './evolue';
import { mesesAposAdmissional, pcmsoPlanFor } from './pcmso';
import type { PcmsoExame, PcmsoGhePlan } from './pcmso';
import { bullets, caption, DocBuilder, para } from './layout';
import { assets, cidadeUf, cover, DASH, emp, sumarioSection } from './common';
import type { EmpresaExt } from './common';
import { PCMSO_T } from './pcmso-texts';

// ---------------------------------------------------------------------------
// Small formatters
// ---------------------------------------------------------------------------

const paras = (list: readonly string[]): string => list.map((t) => para(t)).join('');

/** "20773/DF / RQE 123" → { crm: '20773/DF', uf: 'DF', rqe: '123' }. */
export function crmParts(raw?: string): { crm: string; uf: string; rqe: string } {
  const s = String(raw || '').trim();
  const [c0 = '', r0 = ''] = s.split(/\s*(?:[/·,;-]\s*)?RQE\s*:?\s*/i);
  const crm = c0
    .replace(/^CRM\s*(?:[-/]\s*[A-Z]{2})?\s*(?:n[ºo°.]*)?\s*:?\s*/i, '')
    .replace(/[\s/·,;-]+$/, '')
    .trim();
  const uf = (/\/\s*([A-Z]{2})\b/i.exec(crm)?.[1] || /CRM\s*[-/]\s*([A-Z]{2})/i.exec(c0)?.[1] || '').toUpperCase();
  return { crm, uf, rqe: r0.trim() };
}

/** "CRM/DF nº 20773/DF" (or "CRM nº 20773" without UF); '' when empty. */
export function crmTexto(raw?: string): string {
  const { crm, uf } = crmParts(raw);
  if (!crm) return '';
  return `CRM${uf ? '/' + uf : ''} nº ${crm}`;
}

/** "Dr. Elber Sampaio" → "Dr. ELBER SAMPAIO" (title kept, name uppercase). */
export function nomeMedico(nome?: string): string {
  const s = String(nome || '').trim();
  const m = /^(dra?\.?)\s+(.*)$/i.exec(s);
  if (!m) return s.toUpperCase();
  const t = m[1].toLowerCase().startsWith('dra') ? 'Dra.' : 'Dr.';
  return `${t} ${m[2].toUpperCase()}`;
}

/** CEP field, else a CEP found in the address, else '-'. */
export function cepDe(e: EmpresaExt): string {
  if ((e.cep || '').trim()) return e.cep!.trim();
  const m = /\b\d{2}\.?\d{3}-?\d{3}\b/.exec(e.endereco || '');
  return m ? m[0] : DASH;
}

// ---------------------------------------------------------------------------
// Pre-text: revisões
// ---------------------------------------------------------------------------

function revisoesPcmso(d: DocBuilder, p: LegacyProject, e: LegacyEmpresa): void {
  const revs = (p.revisoes || [])
    .filter((r) => String(r.documento || '').toLowerCase() === 'pcmso')
    .slice()
    .sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR', { numeric: true }));
  const rows = revs.length
    ? revs.map((r) => `<tr><td>${esc(r.numero || DASH)}</td><td>${fmtH(r.data)}</td><td>${esc(r.itens || DASH)}</td></tr>`)
    : [`<tr><td>001</td><td>${fmtH(e.dataElaboracao)}</td><td>Documento-Base e Anexos</td></tr>`];
  while (rows.length < 10) rows.push('<tr><td></td><td></td><td></td></tr>');
  d.section(
    `${para(PCMSO_T.revisoes)}${caption('Controle de Revisões')}<table class="pgr-table pg-rev"><colgroup><col style="width:17%"><col style="width:18%"><col style="width:65%"></colgroup><thead><tr><th>Revisão nº</th><th>Data</th><th>Itens Revisados</th></tr></thead><tbody>${rows.join('')}</tbody></table>`,
    { pretexto: true },
  );
}

// ---------------------------------------------------------------------------
// 1. Identificação (2 columns × 7 rows)
// ---------------------------------------------------------------------------

function identPcmso(e: EmpresaExt): string {
  const rows: [string, string][] = [
    ['Razão Social', e.razaoSocial || DASH],
    ['Nome Fantasia', e.nomeFantasia || DASH],
    ['Logradouro', e.endereco || DASH],
    ['CEP', cepDe(e)],
    ['E-mail', e.emailEmpresa || DASH],
    ['Telefone', e.contatoEmpresa || DASH],
    ['CNPJ', e.cnpj || DASH],
  ];
  return `<table class="pgr-table pc-ident"><colgroup><col style="width:25%"><col style="width:75%"></colgroup><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// 6. Exam plan per GHE
// ---------------------------------------------------------------------------

type Grupo = 'F' | 'Q' | 'B' | 'E' | 'A' | 'P';

const GRUPOS: { L: Exclude<Grupo, 'P'>; nome: string }[] = [
  { L: 'F', nome: 'Físico' },
  { L: 'Q', nome: 'Químico' },
  { L: 'B', nome: 'Biológico' },
  { L: 'E', nome: 'Ergonômico' },
  { L: 'A', nome: 'Acidente' },
];

/**
 * PCMSO grouping. 'Perigo' → P (Perigo block). Psicossocial → E: the reference
 * table has no psychosocial row, so these factors are listed under Ergonômico
 * (NR-17, organização do trabalho) with a "(fator psicossocial)" mark.
 */
function grupoPcmso(g?: string): { L: Grupo; psico: boolean } {
  const t = String(g || '').toLowerCase();
  if (/perigo/.test(t)) return { L: 'P', psico: false };
  if (/psico/.test(t)) return { L: 'E', psico: true };
  if (/qu[ií]m/.test(t)) return { L: 'Q', psico: false };
  if (/biol/.test(t)) return { L: 'B', psico: false };
  if (/ergo/.test(t)) return { L: 'E', psico: false };
  if (/acid/.test(t)) return { L: 'A', psico: false };
  return { L: 'F', psico: false };
}

interface AgRow {
  agente: string;
  agravo: string;
}

function agRows(riscos: LegacyRisco[], L: Grupo): AgRow[] {
  return riscos
    .map((r) => ({ r, g: grupoPcmso(r.grupo) }))
    .filter((x) => x.g.L === L)
    .map(({ r, g }) => ({ agente: (r.perigo || DASH) + (g.psico ? ' (fator psicossocial)' : ''), agravo: r.dano || DASH }));
}

/** Rows of one group: label cell rowspanned, consecutive identical agravos merged. */
function groupBody(label: string, rows: AgRow[], empty: string): string {
  const list = rows.length ? rows : [{ agente: empty, agravo: DASH }];
  const n = list.length;
  let html = '';
  for (let i = 0; i < n; i++) {
    let cells = i === 0 ? `<th class="pc-grp" rowspan="${n}">${esc(label)}</th>` : '';
    cells += `<td>${esc(list[i].agente)}</td>`;
    const prev = i > 0 ? list[i - 1].agravo : null;
    if (prev !== list[i].agravo) {
      let span = 1;
      while (i + span < n && list[i + span].agravo === list[i].agravo) span++;
      cells += `<td${span > 1 ? ` rowspan="${span}"` : ''}>${esc(list[i].agravo)}</td>`;
    }
    html += `<tr>${cells}</tr>`;
  }
  // Groups with several agents stay on one page (rowspans do not split well).
  return `<tbody${n > 1 ? ' class="pg-keep"' : ''}>${html}</tbody>`;
}

function examRow(ex: PcmsoExame): string {
  const t = String(ex.tipos || '').toUpperCase();
  const per = /P/.test(t);
  const nome = ex.esocial ? `${esc(ex.exame)}<br>${esc(ex.esocial)}` : esc(ex.exame);
  return `<tr><td>${nome}</td><td>${/A/.test(t) ? 'X' : ''}</td><td>${per ? esc(mesesAposAdmissional(ex)) : DASH}</td><td>${per ? esc(ex.periodo || 'Anual') : DASH}</td><td>${/D/.test(t) ? 'X' : ''}</td></tr>`;
}

function gheBlock(d: DocBuilder, b: PcmsoGhePlan, num: string): string {
  const fns = b.funcoes.length ? b.funcoes : [{ nome: '', cargaHoraria: '' }];
  const cargo = fns.map((f) => `<tr><td colspan="2">${esc(f.nome || DASH)}</td><td>${esc(f.cargaHoraria || DASH)}</td></tr>`).join('');
  const riscos = GRUPOS.map((g) => groupBody(g.nome, agRows(b.riscos, g.L), 'Ausência de fator de risco')).join('');
  const perigo = groupBody('P', agRows(b.riscos, 'P'), 'Ausência de fator de perigo');
  const main = `<table class="pgr-table pc-ghe pg-norepeat"><colgroup><col style="width:15.6%"><col style="width:45%"><col style="width:39.4%"></colgroup><tbody class="pg-keep"><tr class="pc-band"><th colspan="2">Cargo / Função</th><th>Carga Horária</th></tr>${cargo}<tr class="pc-band"><th>Riscos</th><th>Agentes</th><th>Possíveis agravos à saúde</th></tr></tbody>${riscos}<tbody class="pg-keep"><tr class="pc-band"><th>Perigo</th><th>Fator de exposição</th><th>Possíveis agravos à saúde</th></tr></tbody>${perigo}</table>`;
  // Band + header + rows kept together: never a lone header at a page bottom.
  const exams = b.exames.map(examRow).join('');
  const examTable = `<table class="pgr-table pc-exam"><colgroup><col style="width:34.4%"><col style="width:15.6%"><col style="width:15.6%"><col style="width:18.8%"><col style="width:15.6%"></colgroup><thead><tr class="pc-band"><th colspan="5">Exames médicos clínicos e complementares</th></tr><tr><th>Descrição do exame<br>(cód. e-social)</th><th>Admissional</th><th>Meses após admissional</th><th>Periódico</th><th>Demissional</th></tr></thead><tbody>${exams}</tbody></table>`;
  const keep = b.exames.length <= 12 ? ' pg-keep' : '';
  return `<div class="pc-bloco">${d.h2(num, b.nome)}${main}<div class="pc-exames${keep}">${examTable}</div></div>`;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildPCMSO(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const T = PCMSO_T;
  const plan = pcmsoPlanFor(p);
  const med = plan.medico;
  const nomeMed = nomeMedico(med.nome);
  const crm = crmParts(med.crm);
  const d = new DocBuilder('pcmso');

  d.setCover(cover(a, e, { badge: 'PCMSO', title: 'Programa de<br>controle médico de<br>saúde ocupacional', respNome: med.nome, respFuncao: 'Médico responsável', regLabel: 'CRM', respReg: crm.crm || med.crm }));
  revisoesPcmso(d, p, e);
  d.section(`${d.title('Apresentação')}${para(T.apresentacao)}`, { pretexto: true, cls: 'pg-apresentacao' });
  sumarioSection(d);

  // 1
  d.section(`${d.h1('1', 'Identificação do estabelecimento')}${caption('Identificação do estabelecimento')}${identPcmso(e)}`);

  // 2 + 2.1
  const quem = nomeMed ? `o ${nomeMed}` : 'o médico do trabalho a ser indicado no cadastro do condomínio';
  d.section(`${d.h1('2', 'Introdução')}${paras(T.intro)}${d.h2('2.1', 'Médico responsável do PCMSO')}${paras(T.medico(quem, crmTexto(med.crm)))}`);

  // 3 → 5 flow together
  d.section(
    `${d.h1('3', 'Desenvolvimento')}${para(T.desenvolvimento)}${bullets(T.tiposExame)}${paras(T.desenvolvimento2)}` +
      `${d.h2('3.1', 'Exame admissional')}${paras(T.admissional)}` +
      `${d.h2('3.2', 'Exame periódico')}${paras(T.periodico)}<div class="pc-alineas">${paras(T.periodicoItens)}</div>` +
      `${d.h2('3.3', 'Exame de retorno ao trabalho')}${paras(T.retorno)}` +
      `${d.h2('3.4', 'Exame de mudança de risco ocupacional')}${paras(T.mudanca)}` +
      `${d.h2('3.5', 'Exame demissional')}${paras(T.demissional)}` +
      `${d.h2('3.6', 'Exames complementares')}${paras(T.complementares)}`,
  );
  d.section(
    `${d.h1('4', 'Atestado de Saúde Ocupacional - ASO')}${paras(T.aso)}<div class="pc-aso">${para(T.asoLead, 'pc-lead')}${bullets(T.asoItens)}</div>${paras(T.aso2)}`,
    { break: false },
  );
  d.section(`${d.h1('5', 'Registro e documentações obrigatória')}${paras(T.registro)}<div class="pc-alineas">${paras(T.relatorioItens)}</div>${paras(T.registro2)}`, { break: false });

  // 6
  const temPsico = (p.riscos || []).some((r) => /psico/i.test(r.grupo || ''));
  let s6 = `${d.h1('6', 'Planejamento de exames médicos clínicos e complementares')}${para(T.planejamento + (!plan.porGhe && (p.funcoes || []).length ? ' ' + T.planejamentoSemGhe : ''))}`;
  if (temPsico) s6 += para(T.psicoNota);
  plan.byGhe.forEach((b, ix) => {
    s6 += gheBlock(d, b, `6.${ix + 1}`);
  });
  d.section(s6);

  // 7
  d.section(`${d.h1('7', 'Disposições finais')}${paras(T.final)}`);

  // 8
  const razao = (e.razaoSocial || '').trim().toUpperCase();
  const [i1, , i3] = T.respImpl(razao);
  const impl = razao ? `${esc(i1)}<b>${esc(razao)}</b>${esc(i3)}` : esc(i1.replace(/cabem a $/, 'cabem à organização') + i3);
  const regLinha = crm.crm ? `<br><b>Nº do registro CRM:</b> ${esc(crm.crm)}${crm.rqe ? ` · <b>RQE:</b> ${esc(crm.rqe)}` : ''}` : '';
  d.section(
    `${d.h1('8', 'Responsabilidade técnica')}${para(T.respTecnica)}<p class="pgr-text">${impl}</p><p class="pg-date">${esc(cidadeUf(e))}, ${esc(dataExtenso(e.dataElaboracao, ctx.today))}.</p><div class="pg-sign-grid"><div class="pg-sign-block"><b>Responsável Técnico:</b> ${esc(nomeMed || DASH)}<br>Médico Responsável${regLinha}</div></div>`,
  );

  // 9 ANEXOS
  d.section(
    `${d.h1('9', 'Anexos')}${d.h2('9.1', 'Critérios de envio de informações de SST no eSocial')}${para(T.esocial)}${d.h3('9.1.1', 'Procedimentos diagnósticos')}<p class="pgr-text">${esc(T.procedimentos)}<a class="pc-link" href="${esc(T.esocialUrl)}">${esc(T.esocialUrl)}</a>.</p>`,
  );
  return d.render(a.logo);
}
