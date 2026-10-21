// LTCAT — Laudo Técnico das Condições Ambientais do Trabalho.
// Page model: layout.ts (flowing sections paginated by Paged.js).
// Content follows the reference laudo section by section (specs/ltcat.md);
// the data and the per-GHE opinion come from ltcat.ts, boilerplate from ltcat-texts.ts.
import type { DocContext, LegacyRevisao } from './types';
import { esc, fmt, fmtH } from './html';
import { dataExtenso } from './evolue';
import { ltcatPlanFor, COD_AUSENCIA } from './ltcat';
import type { LtcatAgente, LtcatDireito, LtcatGhe, LtcatLetra, LtcatPlan } from './ltcat';
import { caption, DocBuilder } from './layout';
import { apresentacaoSection, assets, cardRows, cidadeUf, cover, DASH, emp, findEquipe, latestInspection, slimInspecao, sumarioSection } from './common';
import type { EmpresaExt, SlimInspecao } from './common';
import { GR_MATRIX, grNome } from './risk';
import type { PdCode, TeCode } from './risk';
import { ESOCIAL_AUSENCIA_DESC, ESOCIAL_T02, GR_ACOES, LTCAT_T as T, NR15_ANEXOS, PD_CRITERIOS, TE_CRITERIOS } from './ltcat-texts';

const P = (t: string): string => `<p class="pgr-text">${esc(t)}</p>`;
const PH = (html: string): string => `<p class="pgr-text">${html}</p>`;
const UL = (items: readonly string[]): string => `<ul class="pg-ul">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
const ULB = (items: readonly [string, string][], sep = ' '): string => `<ul class="pg-ul">${items.map(([b, t]) => `<li><b>${esc(b)}</b>${sep}${esc(t)}</li>`).join('')}</ul>`;
const cell = (v: unknown): string => esc(String(v ?? '').trim() || DASH);

// ---------------------------------------------------------------------------
// Responsável técnico (engenheiro or médico, per empresa.ltcatRt)
// ---------------------------------------------------------------------------

interface RtInfo {
  nome: string;
  funcao: string;
  conselho: string;
  registro: string;
}

function rtInfo(ctx: DocContext, plan: LtcatPlan): RtInfo {
  const e = emp(ctx.project);
  const rt = plan.rt || { tipo: 'engenheiro', nome: plan.eng.nome, conselho: 'CREA', registro: plan.eng.crea };
  if (rt.tipo === 'medico') {
    const m = findEquipe(ctx, 'medico', e.medicoId, e.medicoTrabalho);
    return { nome: rt.nome, funcao: (m?.funcao || '').trim() || 'Médico(a) do Trabalho', conselho: 'CRM', registro: rt.registro };
  }
  const m = findEquipe(ctx, 'engenheiro', e.engId, e.engSeguranca);
  return { nome: rt.nome, funcao: (m?.funcao || '').trim() || 'Engenheiro(a) de Segurança do Trabalho', conselho: 'CREA', registro: rt.registro };
}

// ---------------------------------------------------------------------------
// Pre-text
// ---------------------------------------------------------------------------

function revisoes(ctx: DocContext, d: DocBuilder, e: EmpresaExt): void {
  const own: LegacyRevisao[] = (ctx.project.revisoes || []).filter((r) => String(r.documento || '').toLowerCase() === 'ltcat');
  own.sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR', { numeric: true }) || String(a.data || '').localeCompare(String(b.data || '')));
  const rows = own.length
    ? own.map((r) => `<tr><td>${cell(r.numero)}</td><td>${fmtH(r.data)}</td><td>${cell(r.itens)}</td></tr>`)
    : [`<tr><td>001</td><td>${fmtH(e.dataElaboracao)}</td><td>${esc(T.revisaoBase)}</td></tr>`];
  while (rows.length < 10) rows.push('<tr><td></td><td></td><td></td></tr>');
  d.section(
    `${P(T.revisoes)}${caption('Controle de Revisões')}<table class="pgr-table pg-rev"><colgroup><col style="width:17%"><col style="width:18%"><col style="width:65%"></colgroup><thead><tr><th>Revisão nº</th><th>Data</th><th>Itens Revisados</th></tr></thead><tbody>${rows.join('')}</tbody></table>`,
    { pretexto: true },
  );
}

function cepDe(e: EmpresaExt): string {
  if ((e.cep || '').trim()) return e.cep!.trim();
  const m = /\b(\d{2}\.?\d{3}-?\d{3})\b/.exec(e.endereco || '');
  return m ? m[1] : '';
}

function identTable(e: EmpresaExt): string {
  const rows: [string, string][] = [
    ['Razão Social', e.razaoSocial || ''],
    ['Nome Fantasia', e.nomeFantasia || ''],
    ['Logradouro', e.endereco || ''],
    ['CEP', cepDe(e)],
    ['E-mail', e.emailEmpresa || ''],
    ['Telefone', e.contatoEmpresa || ''],
    ['CNPJ', e.cnpj || ''],
  ];
  return `<table class="pgr-table lt-ident"><colgroup><col style="width:27%"><col style="width:73%"></colgroup><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${cell(v)}</td></tr>`).join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// 4.1 tables
// ---------------------------------------------------------------------------

function pdTable(): string {
  const rows = PD_CRITERIOS.map(([nivel, itens]) => `<tr><th>${esc(nivel)}</th><td>${itens.map((x) => `<p>${esc(x)}</p>`).join('')}</td></tr>`).join('');
  return `${caption('Determinação da Severidade do Potencial de Dano')}<table class="pgr-table lt-crit"><colgroup><col style="width:17%"><col style="width:83%"></colgroup><thead><tr><th>Severidade do Dano</th><th>Situação Avaliada</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function teTable(): string {
  const rows = TE_CRITERIOS.map(([n, t]) => `<tr><th>${esc(n)}</th><td>${esc(t)}</td></tr>`).join('');
  return `${caption('Determinação do Tempo de Exposição')}<table class="pgr-table lt-crit"><colgroup><col style="width:24%"><col style="width:76%"></colgroup><thead><tr><th>Frequência da Exposição</th><th>Situação Avaliada</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function quadro1(): string {
  const sevs: [PdCode, string][] = [
    ['B', 'Baixo'],
    ['M', 'Médio'],
    ['A', 'Alto'],
    ['C', 'Crítico'],
  ];
  const freqs: TeCode[] = ['P', 'I', 'E'];
  const rows = sevs
    .map(([k, label], i) => {
      const cells = freqs.map((f) => {
        const code = GR_MATRIX[k][f];
        return `<td class="gr-${code}">${esc(grNome(code))}</td>`;
      });
      return `<tr>${i === 0 ? '<th class="pg-vert" rowspan="4"><span>SEVERIDADE</span></th>' : ''}<th>${label}</th>${cells.join('')}</tr>`;
    })
    .join('');
  return `${caption('Matriz para determinação da Graduação de Risco', 'Quadro 1:')}<table class="pgr-table pg-matrix pg-norepeat pg-keep"><thead><tr><td class="pg-corner" colspan="2" rowspan="2"></td><th colspan="3">FREQUÊNCIA</th></tr><tr><th>Permanente</th><th>Intermitente</th><th>Eventual</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function acoesTable(): string {
  return `${caption('Determinação de ações corretivas/preventivas necessárias')}<table class="pgr-table lt-crit lt-acoes"><colgroup><col style="width:24%"><col style="width:76%"></colgroup><thead><tr><th>Graduação de Risco</th><th>Ações Necessárias</th></tr></thead><tbody>${GR_ACOES.map(([, n, t]) => `<tr><td class="lt-c">${esc(n)}</td><td>${esc(t)}</td></tr>`).join('')}</tbody></table>`;
}

function nr15Table(): string {
  const rows = NR15_ANEXOS.map(([n, t, pct]) => `<tr${pct ? '' : ' class="lt-revog"'}><td class="lt-c">${esc(n)}</td><td>${esc(t)}</td><td class="lt-c">${esc(pct)}</td></tr>`).join('');
  return `${caption('Graus de Insalubridade (Norma Regulamentadora nº 15).')}<table class="pgr-table lt-nr15"><colgroup><col style="width:9%"><col style="width:73%"><col style="width:18%"></colgroup><thead><tr><th>Anexo</th><th>Atividades ou operações que exponham o trabalhador</th><th>Percentual</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function medicoesTable(plan: LtcatPlan): string {
  const rows = (plan.ghes || [])
    .flatMap((g) =>
      g.agentes
        .filter((a) => a.medicao)
        .map((a) => {
          const m = a.medicao!;
          const un = (m.unidade || '').trim();
          return `<tr><td>${esc(g.titulo)}</td><td>${cell(m.agente || a.agente)}</td><td>${cell(m.tecnica)}</td><td>${cell(m.equipamento)}</td><td>${fmtH(m.data)}</td><td>${m.resultado ? esc(m.resultado + (un ? ' ' + un : '')) : DASH}</td><td>${m.limite ? esc(m.limite + (un ? ' ' + un : '')) : DASH}</td></tr>`;
        }),
    )
    .join('');
  return `${caption('Resultados das avaliações quantitativas')}<table class="pgr-table compact lt-med"><colgroup><col style="width:16%"><col style="width:16%"><col style="width:17%"><col style="width:17%"><col style="width:10%"><col style="width:12%"><col style="width:12%"></colgroup><thead><tr><th>GHE</th><th>Agente</th><th>Metodologia</th><th>Equipamento</th><th>Data</th><th>Resultado</th><th>Limite de tolerância</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// GHE blocks
// ---------------------------------------------------------------------------

function gheAmbiente(ctx: DocContext, g: LtcatGhe): string {
  const own = (g.group.ghe.descricaoAmbiente || '').trim();
  if (own) return own;
  const s = (ctx.project.setores || []).find((x) => x.nome === g.group.ghe.setor);
  if (s) return [s.ambiente, s.descricao].map((x) => (x || '').trim()).filter(Boolean).join(' — ') || DASH;
  return g.group.ghe.setor || DASH;
}

function gheIdent(ctx: DocContext, d: DocBuilder, g: LtcatGhe, num: string): string {
  const fs = g.group.funcoes || [];
  const tipo =
    (g.group.ghe.tipoAtividade || '').trim() ||
    (g.group.ghe.descricao || '').trim() ||
    fs
      .map((f) => f.atividades)
      .filter(Boolean)
      .join(' ') ||
    DASH;
  const fn = fs.length
    ? fs.map((f) => `<tr><td colspan="2">${cell(f.nome)}</td><td>${cell(f.cargaHoraria)}</td></tr>`).join('')
    : `<tr><td colspan="2">${cell(g.group.ghe.funcoes)}</td><td>${DASH}</td></tr>`;
  const atv = fs.length
    ? fs.map((f) => `<p><b>${esc(String(f.nome || '').toUpperCase())}:</b> ${cell(f.atividades)}</p>`).join('')
    : `<p>${cell(g.group.ghe.descricao)}</p>`;
  return `${d.h2(num, g.titulo)}<table class="pgr-table lt-gid"><colgroup><col style="width:27%"><col style="width:43%"><col style="width:30%"></colgroup><tbody><tr><th>Tipo de Atividade</th><td colspan="2">${esc(tipo)}</td></tr><tr><th>Descrição do ambiente</th><td colspan="2">${esc(gheAmbiente(ctx, g))}</td></tr><tr><td class="pg-band" colspan="3">Identificação das funções</td></tr><tr><th colspan="2">Cargo / Função</th><th>Carga Horária</th></tr>${fn}<tr><td class="pg-band" colspan="3">Descrição das atividades</td></tr><tr><td colspan="3" class="lt-atv">${atv}</td></tr></tbody></table>`;
}

function dashList(items: readonly string[] | undefined): string {
  const list = (items || []).filter(Boolean);
  if (!list.length) return `<div class="lt-c">${DASH}</div>`;
  return `<ul class="lt-dash">${list.map((x, i) => `<li>${esc(x.replace(/[;.]\s*$/, ''))}${i === list.length - 1 ? '.' : ';'}</li>`).join('')}</ul>`;
}

function agenteRow(L: LtcatLetra, a: LtcatAgente | null): string {
  if (!a) return `<tr><td>${L}</td><td>Ausência de fator de risco (${COD_AUSENCIA})</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td></tr>`;
  const nome = `${esc(a.agente)}${a.codEsocial ? `<br>(${esc(a.codEsocial)})` : ''}`;
  return `<tr><td>${L}</td><td>${nome}</td><td>${cell(a.fonte)}</td><td>${cell(a.meioPropagacao)}</td><td>${cell(a.tecnica)}</td><td>${cell(a.nivel)}</td><td>${cell(a.te)}</td><td>${cell(a.pd)}</td><td>${cell(a.gr)}</td><td class="lt-l">${dashList(a.controlesLista)}</td></tr>`;
}

function analiseTable(g: LtcatGhe): string {
  const rows = (['F', 'Q', 'B'] as LtcatLetra[])
    .map((L) => {
      const ag = g.agentes.filter((a) => a.letra === L);
      return ag.length ? ag.map((a) => agenteRow(L, a)).join('') : agenteRow(L, null);
    })
    .join('');
  return `<table class="pgr-table lt-ana pg-center"><colgroup><col style="width:5%"><col style="width:13%"><col style="width:16%"><col style="width:8%"><col style="width:10%"><col style="width:12%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:25.5%"></colgroup><thead><tr><th class="lt-bar" colspan="10">Análise da exposição a agentes nocivos físicos, químicos e biológicos ou associação de agentes prejudiciais à saúde</th></tr><tr><th rowspan="2">Riscos</th><th rowspan="2">Agentes<br>(cód. eSocial)</th><th rowspan="2">Fonte Geradora</th><th rowspan="2">Meio de Propagação</th><th rowspan="2">Técnica de análise</th><th rowspan="2">Nível de exposição</th><th colspan="3">Tipo de Exposição</th><th rowspan="2">Medidas de controle existentes</th></tr><tr><th>TE</th><th>PD</th><th>GR</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function perigosasTable(g: LtcatGhe): string {
  const rows = g.perigosas.length
    ? g.perigosas.map((r) => `<tr><td>${cell(r.atividade)}</td><td>${cell(r.area)}</td><td>${cell(r.tempo)}</td><td>${cell(r.embasamento)}</td><td class="lt-l">${dashList(r.controles)}</td></tr>`).join('')
    : `<tr><td>Não há atividades ou operações geradoras do direito</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td><td>${DASH}</td></tr>`;
  return `<table class="pgr-table lt-ana pg-center"><colgroup><col style="width:27%"><col style="width:29%"><col style="width:10%"><col style="width:11%"><col style="width:23%"></colgroup><thead><tr><th class="lt-bar" colspan="5">Análise das atividades e operações perigosas</th></tr><tr><th>Atividades ou operações geradoras do direito</th><th>Áreas de risco</th><th>Tempo de exposição</th><th>Embasamento</th><th>Medidas de controle existentes</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function direitoLabel(x: LtcatDireito): string {
  return `${esc(x.rotulo)}${x.codigo ? `<br>(${esc(x.codigo)})` : ''}`;
}

function parecerTable(g: LtcatGhe): string {
  const row = (x: LtcatDireito) => `<tr><td class="lt-c">${direitoLabel(x)}</td><td class="lt-c">${cell(x.atividades)}</td><td class="lt-j">${x.conclusaoHtml}</td></tr>`;
  return `<table class="pgr-table lt-ana lt-parecer"><colgroup><col style="width:11%"><col style="width:20%"><col style="width:69%"></colgroup><thead><tr><th class="lt-bar" colspan="3">Parecer técnico conclusivo</th></tr><tr><th>Fator de direito<br>(cód. eSocial)</th><th>Atividades ou operações geradoras do direito</th><th>Conclusão dos direitos</th></tr></thead><tbody>${row(g.ins)}${row(g.per)}${row(g.apo)}<tr class="lt-foot"><td colspan="3"></td></tr></tbody></table>`;
}

function legenda(): string {
  const c = (code: string, txt: string) => `<td><b>${esc(code)}:</b> ${esc(txt)}</td>`;
  return `<table class="pgr-table lt-leg pg-keep pg-norepeat"><colgroup>${[9, 9, 12, 12, 10, 10, 8, 8, 11, 11].map((w) => `<col style="width:${w}%">`).join('')}</colgroup><tbody><tr><th class="lt-legt" colspan="10">Legenda</th></tr><tr class="lt-legh"><th colspan="2">Riscos</th><th colspan="2">Tipo de Exposição</th><th colspan="2">Tempo de Exposição</th><th colspan="2">Potencial de Dano</th><th colspan="2">Graduação de Risco</th></tr><tr>${c('F', 'Físico')}${c('Q', 'Químico')}${c('TE', 'Tempo de Exposição')}${c('GR', 'Graduação do Risco')}${c('E', 'Eventual')}${c('P', 'Permanente')}${c('B', 'Baixo')}${c('A', 'Alto')}${c('T', 'Tolerável')}${c('S', 'Substancial')}</tr><tr>${c('B', 'Biológico')}<td></td>${c('PD', 'Potencial de Dano')}<td></td>${c('I', 'Intermitente')}<td></td>${c('M', 'Médio')}${c('C', 'Crítico')}${c('M', 'Moderado')}${c('IT', 'Intolerável')}</tr></tbody></table>`;
}

function resumoTable(ghes: LtcatGhe[]): string {
  const rows = ghes
    .map((g) => {
      const cargos =
        (g.group.funcoes || [])
          .map((f) => f.nome)
          .filter(Boolean)
          .join(', ') ||
        g.group.ghe.funcoes ||
        DASH;
      const lab = `GHE: ${g.numero} – ${g.nome}`;
      const r = (x: LtcatDireito) => `<td class="lt-c">${direitoLabel(x)}</td><td>${x.resumoHtml}</td>`;
      return `<tr><td rowspan="3">${esc(lab)}</td><td rowspan="3" class="lt-c">${esc(cargos)}</td>${r(g.ins)}</tr><tr>${r(g.per)}</tr><tr>${r(g.apo)}</tr>`;
    })
    .join('');
  return `<table class="pgr-table lt-resumo"><colgroup><col style="width:16%"><col style="width:16%"><col style="width:16%"><col style="width:52%"></colgroup><thead><tr><th>GHE</th><th>Cargo/função</th><th>Direito<br>(Cód. eSocial)</th><th>Conclusão</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

function tabela24(plan: LtcatPlan): string {
  const map = new Map<string, string[]>();
  const add = (cod: string, desc: string) => {
    const list = map.get(cod) || [];
    if (desc && !list.includes(desc)) list.push(desc);
    map.set(cod, list);
  };
  (plan.ghes || []).forEach((g) => {
    g.agentes.forEach((a) => {
      if (a.codEsocial) add(a.codEsocial, a.codEsocial === COD_AUSENCIA ? ESOCIAL_AUSENCIA_DESC : a.agente);
    });
    const letras = new Set(g.agentes.map((a) => a.letra));
    if (letras.size < 3 || g.apo.codigo === COD_AUSENCIA) add(COD_AUSENCIA, ESOCIAL_AUSENCIA_DESC);
  });
  const rows = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cod, desc]) => `<tr><td class="lt-c">${esc(cod)}</td><td>${esc(desc.join('; ') || DASH)}</td></tr>`)
    .join('');
  return `${caption('Códigos da Tabela 24 do eSocial utilizados neste laudo')}<table class="pgr-table compact lt-esoc"><colgroup><col style="width:20%"><col style="width:80%"></colgroup><thead><tr><th>Código</th><th>Agente nocivo / descrição</th></tr></thead><tbody>${rows || `<tr><td class="lt-c">${COD_AUSENCIA}</td><td>${esc(ESOCIAL_AUSENCIA_DESC)}</td></tr>`}</tbody></table>`;
}

function tabela02(): string {
  return `${caption('Tabela 02 do eSocial – Financiamento da Aposentadoria Especial')}<table class="pgr-table compact lt-esoc"><colgroup><col style="width:20%"><col style="width:80%"></colgroup><thead><tr><th>Código</th><th>Descrição</th></tr></thead><tbody>${ESOCIAL_T02.map(([c, t]) => `<tr><td class="lt-c">${esc(c)}</td><td>${esc(t)}</td></tr>`).join('')}</tbody></table>`;
}

function fotosAnexo(d: DocBuilder, insp: SlimInspecao): string {
  const cards = insp.photos.map((f) => `<div class="pgr-foto-card"><img src="${esc(f.src)}" alt="${esc(f.titulo)}"><b>${esc(f.titulo)}</b>${f.obs ? `<span>${esc(f.obs)}</span>` : ''}</div>`);
  const visita = insp.dataVisita ? ` Visita técnica de ${fmtH(insp.dataVisita)}${insp.tecnico ? ', ' + esc(insp.tecnico) : ''}${insp.numero ? ` (relatório ${esc(insp.numero)})` : ''}.` : '';
  return `${d.title('Anexo 2 – Registro fotográfico', 0)}${PH(esc(T.fotos) + visita)}${cardRows(cards, 2)}`;
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function buildLTCAT(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const plan = ltcatPlanFor(p);
  const ghes = plan.ghes || [];
  const rt = rtInfo(ctx, plan);
  const insp = slimInspecao(latestInspection(ctx));
  const d = new DocBuilder('ltcat');

  d.setCover(cover(a, e, { badge: 'LTCAT', title: 'Laudo técnico das<br>condições ambientais<br>do trabalho', respNome: rt.nome, respFuncao: rt.funcao, regLabel: rt.conselho, respReg: rt.registro }));
  revisoes(ctx, d, e);
  apresentacaoSection(d, T.apresentacao);
  sumarioSection(d, true);

  // 1, 2 and 3 flow from a new page; 3.1 starts a new page.
  d.section(`${d.h1('1', 'Introdução')}${T.intro.map(P).join('')}${d.h1('2', 'Objetivos específicos')}${UL(T.objetivos)}${d.h1('3', 'Identificação do estabelecimento avaliado')}${caption('Identificação do Estabelecimento Avaliado')}${identTable(e)}`);

  // 3.1 … 6 flow continuously.
  const temMed = plan.temMedicao;
  d.section(
    `${d.h2('3.1', 'Definição dos riscos ambientais')}${T.ambientais.map(P).join('')}${ULB(T.ambientaisBullets)}` +
      `${d.h1('4', 'Técnica empregada')}${T.tecnica.map(P).join('')}` +
      `${d.h2('4.1', 'Análise qualitativa')}${T.qualitativaHtml.map(PH).join('')}<p class="lt-formula"><i>GR = S × F</i></p><div class="lt-defs">${T.formula.map((x) => `<div>${esc(x)}</div>`).join('')}</div>` +
      `${PH(T.pdIntroHtml)}${pdTable()}${PH(T.teIntroHtml)}${teTable()}${PH(T.grIntroHtml)}${quadro1()}${P(T.acoesIntro)}${acoesTable()}` +
      (temMed ? `${d.h2('4.2', 'Análise quantitativa')}${P(T.quantitativa)}${medicoesTable(plan)}` : '') +
      `${d.h1('5', 'Disposições legais')}${d.h2('5.1', 'Insalubridade')}${P(T.insalubridade1)}${UL(T.insalubridadeBullets)}${P(T.insalubridade2)}${P(T.insalubridade3)}${UL(T.insalubridadeBullets2)}${P(T.insalubridade4)}${nr15Table()}` +
      `${d.h2('5.2', 'Periculosidade')}${P(T.periculosidade1)}${ULB(T.periculosidadeBullets, ' – ')}${P(T.periculosidade2)}${UL(T.periculosidadeBullets2)}${P(T.periculosidade3)}` +
      `${d.h2('5.3', 'Aposentadoria especial')}${P(T.aposentadoria1)}${P(T.aposentadoria2)}${P(T.aposentadoria3)}` +
      `${d.h1('6', 'Constatações durante a visita técnica')}${P(T.constatacoes1)}${
        insp && insp.dataVisita ? P(`A visita técnica foi realizada em ${fmt(insp.dataVisita)}${insp.tecnico ? ', por ' + insp.tecnico : ''}${insp.numero ? ' (relatório ' + insp.numero + ')' : ''}.`) : ''
      }${PH(T.constatacoes2Html)}${P(T.constatacoes3)}`,
  );

  ghes.forEach((g, ix) => {
    // Identification: new portrait page. Analysis + legend: landscape page(s).
    d.section(gheIdent(ctx, d, g, '6.' + (ix + 1)));
    d.section(`${analiseTable(g)}${perigosasTable(g)}${parecerTable(g)}${legenda()}`, { landscape: true, cls: 'lt-land' });
  });

  d.section(`${d.h1('7', 'Resumo do parecer técnico')}${resumoTable(ghes)}`, { landscape: true, cls: 'lt-land' });

  const razao = (e.razaoSocial || 'o estabelecimento avaliado').toUpperCase();
  d.section(
    `${d.h1('8', 'Responsabilidade técnica')}${P(T.resp1)}${PH(esc(T.resp2Pre) + `<b>${esc(razao)}</b>` + esc(T.resp2Pos))}<p class="pg-date">${esc(cidadeUf(e))}, ${esc(dataExtenso(e.dataElaboracao, ctx.today))}.</p><div class="pg-sign-grid lt-sign"><div class="pg-sign-block"><b>Responsável Técnico:</b> ${cell(rt.nome)}<br>${esc(rt.funcao)}<br><b>Nº do registro ${esc(rt.conselho)}:</b> ${cell(rt.registro)}</div></div>`,
  );

  const fotos = !!(insp && insp.photos.length);
  d.section(
    `${d.title(fotos ? 'Anexo 1' : 'Anexo', 0)}${d.h1('1', 'Critérios de envio de informações de SST no eSocial')}${P(T.anexo1)}${d.h2('1.1', 'Agentes nocivos')}${P(T.anexo11)}${tabela24(plan)}${d.h2('1.2', 'Financiamento da aposentadoria especial e redução do tempo de contribuição')}${P(T.anexo12)}${tabela02()}`,
    { cls: 'lt-anexo' },
  );
  if (fotos) d.section(fotosAnexo(d, insp!));
  return d.render(a.logo);
}
