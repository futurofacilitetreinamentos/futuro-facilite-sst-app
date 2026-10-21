// PGR — Programa de Gerenciamento de Riscos (NR-1).
// Section order, numbering and tables follow the reference model (pgr.md):
//   pre-text (revisões, apresentação, sumário) → 1–6 (flowing) → 7 inventário
//   (7.1.n per GHE: portrait identification + landscape inventory; 7.2 DRPS)
//   → 8 → 9 EPI (landscape 9.1/9.2, portrait 9.3/9.4) → 10 plano (+ landscape
//   5W2H table) → 11 → 12 → 13 → Apêndice A (ficha de EPI) → Apêndice B (fotos,
//   only when the inspection has photos).
// Psychosocial risks of the cadastro are not part of the 7.1.n inventory tables
// (grupoLetra maps them to 'E'); they are listed in 7.2 next to the DRPS result
// and their actions go to the plano de ação. Letter P = Perigo.
import type { DocContext } from './types';
import { esc } from './html';
import { groups, isPsicossocial } from './evolue';
import { gr, pd, te } from './risk';
import { scoreDrps } from './drps';
import type { DrpsBundle } from './drps';
import { caption, DocBuilder } from './layout';
import type { SectionOpts } from './layout';
import {
  AGRAVO_FALLBACK,
  apresentacaoSection,
  assets,
  cardRows,
  cover,
  DRPS_ESCALA,
  drpsRows,
  drpsSetores,
  drpsTopics,
  emp,
  epiFicha,
  latestInspection,
  respBlock,
  revisoesDoc,
  revisoesTableSection,
  slimInspecao,
  sumarioSection,
} from './common';
import type { SlimInspecao } from './common';
import { NR01_GATILHOS, PGR_TXT } from './pgr-texts';
import {
  acoesTable,
  episExistentes,
  episRecomendados,
  epiExistentesTable,
  epiRecomendadosTable,
  gheIdentPgr,
  gheInfo,
  gheInventarioPgr,
  identEmpresa,
  ol,
  p,
  pdTable,
  planoMetas,
  planoTable,
  prioridadeTable,
  quadro1,
  rich,
  teTable,
  txt,
  ul,
} from './pgr-tables';
import type { GheInfo } from './pgr-tables';

/** Bullet with a bold lead label. */
function bLabel(label: string, text: string, sub?: readonly string[]): string {
  return `<li><b>${esc(label)}</b> ${esc(text)}${sub ? ul(sub, 'pg-ul-sub') : ''}</li>`;
}

/** 6.1 visit data (ours, after the methodology bullets). */
function visitaDados(i: SlimInspecao | null): string {
  if (!i) {
    return p('A visita técnica ainda não foi registrada no sistema para este estabelecimento. O inventário apresentado no item 7 utiliza os dados do cadastro (setores, funções, GHE e riscos); após a inspeção SST, as constatações e os prazos passam a integrar este PGR.');
  }
  let html = `${caption('Dados da visita técnica')}<table class="pgr-table pgr-kv"><colgroup><col style="width:25%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup><tbody><tr><th>Relatório SST</th><td>${txt(i.numero)}</td><th>Data da visita</th><td>${txt(fmtIso(i.dataVisita))}</td></tr><tr><th>Técnico responsável</th><td colspan="3">${txt(i.tecnico)}</td></tr><tr><th>Itens avaliados</th><td>${esc(i.nItens || 0)}</td><th>Não conformidades</th><td>${esc(i.nNc || 0)}</td></tr></tbody></table>`;
  if (i.objetivo) html += `<p class="pgr-text"><b>Objetivo da visita:</b> ${esc(i.objetivo)}</p>`;
  if (i.ncs.length) {
    html += `${caption('Constatações da inspeção SST')}<table class="pgr-table compact"><colgroup><col style="width:18%"><col style="width:37%"><col style="width:9%"><col style="width:36%"></colgroup><thead><tr><th>Item</th><th>Irregularidade</th><th>Risco</th><th>Medida recomendada</th></tr></thead><tbody>${i.ncs
      .map((x) => `<tr><td>${txt(x.titulo)}</td><td>${txt(x.obs)}</td><td class="c">${txt(x.risco)}</td><td>${txt(x.acao)}</td></tr>`)
      .join('')}</tbody></table>`;
  }
  if (i.conclusao) html += p(i.conclusao);
  return html;
}

function fmtIso(d?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || '';
}

/** 7.2 Riscos psicossociais (DRPS) + psychosocial risks of the cadastro. */
function drpsPgr(d: DocBuilder, dr: DrpsBundle, psico: DocContext['project']['riscos']): string {
  const topics = drpsTopics(dr);
  const nResp = dr.n || 0;
  let html = `${d.h2('7.2', 'Riscos psicossociais (DRPS – NR-01)')}${p(nResp ? PGR_TXT.drpsIntroCom : PGR_TXT.drpsIntroSem)}`;
  html += `${caption('Resultado coletivo do DRPS')}<table class="pgr-table pgr-kv"><colgroup><col style="width:40%"><col style="width:60%"></colgroup><tbody><tr><th>Respostas coletadas</th><td>${esc(nResp)}</td></tr><tr><th>Tópicos em gravidade alta</th><td>${esc((dr.altos || []).length)}</td></tr><tr><th>Respostas por setor</th><td>${drpsSetores(dr)}</td></tr></tbody></table>`;
  html += `${caption('Inventário coletivo por tópico')}<table class="pgr-table compact"><colgroup><col style="width:62%"><col style="width:19%"><col style="width:19%"></colgroup><thead><tr><th>Tópico / fator psicossocial</th><th>Média (1–3)</th><th>Gravidade</th></tr></thead><tbody>${drpsRows(topics, nResp)}</tbody></table><p class="pgr-footnote-l">${esc(DRPS_ESCALA)}</p>`;
  if (nResp) {
    html += `${caption('Fonte geradora por tópico')}<table class="pgr-table compact"><colgroup><col style="width:30%"><col style="width:14%"><col style="width:56%"></colgroup><thead><tr><th>Tópico</th><th>Gravidade</th><th>Fonte geradora (circunstâncias)</th></tr></thead><tbody>${topics
      .map((t) => `<tr${t.gravidadeN >= 3 ? ' class="alta"' : ''}><td>${txt(t.nome)}</td><td class="c">${txt(t.gravidade)}</td><td>${txt(t.fonte)}</td></tr>`)
      .join('')}</tbody></table><p class="pgr-text"><b>Possíveis agravos:</b> ${esc(topics[0]?.agravo || AGRAVO_FALLBACK)}</p>`;
  }
  if (psico.length) {
    html += `${p(PGR_TXT.drpsInventario)}${caption('Fatores psicossociais registrados no inventário')}<table class="pgr-table compact pgr-inv"><colgroup><col style="width:16%"><col style="width:20%"><col style="width:20%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:29%"></colgroup><thead><tr><th>GHE / Função</th><th>Fator de exposição</th><th>Fonte Geradora</th><th>TE</th><th>PD</th><th>GR</th><th>Propostas</th></tr></thead><tbody>${psico
      .map((r) => `<tr><td>${txt(r.ghe || r.funcao)}</td><td>${txt(r.perigo)}</td><td>${txt(r.fonte)}</td><td>${te(r.prob)}</td><td>${pd(r.sev)}</td><td>${gr(r.prob, r.sev)}</td><td>${txt(r.acao)}</td></tr>`)
      .join('')}</tbody></table>`;
  }
  html += `${p(PGR_TXT.drpsMedidas)}${p(PGR_TXT.drpsConfidencial)}`;
  return html;
}

export function buildPGR(ctx: DocContext): string {
  const proj = ctx.project;
  const a = assets(ctx);
  const e = emp(proj);
  const T = PGR_TXT;
  const insp = slimInspecao(latestInspection(ctx));
  const drps = scoreDrps(ctx.drps || []);
  const ghes = groups(proj);
  const infos: GheInfo[] = ghes.map((g, ix) => gheInfo(g, ix));
  const today = ctx.today || new Date();
  const hoje = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const d = new DocBuilder('pgr');

  // Portrait body pages use the named page `pgrcorpo` (doc-pgr.css): the root
  // @page margins of doc.css are overridden by Paged.js' default (1in) on
  // unnamed pages.
  const sec = (html: string, opts: SectionOpts = {}): void => {
    const cls = [opts.cls, !opts.landscape && !opts.pretexto ? 'pgr-corpo' : ''].filter(Boolean).join(' ');
    d.section(html, { ...opts, cls });
  };

  // ---- pre-text
  d.setCover(cover(a, e, { badge: 'PGR', respNome: e.respSst, respFuncao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho', regLabel: 'MTE', respReg: e.regSst }));
  revisoesTableSection(d, revisoesDoc(proj, 'pgr'), T.revisoes);
  apresentacaoSection(d, T.apresentacao);
  sumarioSection(d);

  // ---- 1–6 (flowing from "1. Introdução", new page)
  sec(`${d.h1('1', 'Introdução')}${T.intro.map(p).join('')}${d.h1('2', 'Documento-base')}${T.base.map(p).join('')}${d.h2('2.1', 'Integração com PCMSO')}${p(T.pcmso)}`);
  sec(`${d.h1('3', 'Identificação da empresa')}${identEmpresa(e)}`, { break: false });
  sec(
    `${d.h1('4', 'Estrutura do PGR')}${p(T.estrutura)}${ul(T.estruturaItens)}${d.h2('4.1', 'Planejamento continuado')}${p(T.planejamento)}${ul(NR01_GATILHOS)}${p(T.planejamentoFim)}${d.h2('4.2', 'Plano das ações')}${T.planoAcoes.map(p).join('')}${d.h2('4.3', 'Estratégia e metodologia de ações')}${p(T.estrategia)}${ul(T.estrategiaItens)}${d.h2('4.4', 'Registro e divulgação de dados')}${T.registro.map(p).join('')}`,
    { break: false },
  );
  const agentes = `<ul class="pg-ul">${T.agentes.map(([k, v]) => bLabel(k, v)).join('')}</ul>${p(T.agentesOutros)}<ul class="pg-ul">${bLabel(T.ergonomico[0], T.ergonomico[1], T.ergonomicoItens)}${bLabel(T.acidente[0], T.acidente[1], T.acidenteItens)}</ul>`;
  sec(`${d.h1('5', 'Desenvolvimento do PGR')}${T.desenvolvimento.map(p).join('')}${d.h2('5.1', 'Identificação dos agentes de riscos ocupacionais')}${p(T.agentesIntro)}${agentes}${d.h2('5.2', 'Perigos')}${p(T.perigos)}`, { break: false });
  sec(`${d.h1('6', 'Avaliação dos riscos e perigos')}${d.h2('6.1', 'Visita técnica')}${T.visita.map(p).join('')}${ul(T.visitaItens)}${visitaDados(insp)}`, { break: false });
  sec(
    `${d.h2('6.2', 'Avaliação qualitativa')}<p class="pgr-text">${rich(T.qualit1)}</p><p class="pgr-text">${rich(T.qualit2)}</p><p class="pgr-formula"><i>GR</i> = <i>S</i> × <i>F</i></p><p class="pgr-onde">Onde,</p>${ul(T.onde)}<p class="pgr-text">${rich(T.qualitPd)}</p>${pdTable()}<p class="pgr-text">${rich(T.qualitTe)}</p>${teTable()}<p class="pgr-text">${rich(T.qualitGr)}</p>${quadro1()}${p(T.qualitAcoes)}${acoesTable()}${p(T.qualitFim)}`,
    { break: false },
  );

  // ---- 7 inventário
  const gheList = ghes.map((g, ix) => {
    const fn = (g.funcoes || []).map((f) => f.nome).filter(Boolean).join(', ') || g.ghe.funcoes || '';
    return `GHE ${infos[ix].n}: ${infos[ix].nome}${fn ? ` (${fn})` : ''};`;
  });
  sec(`${d.h1('7', 'Inventário de riscos e perigos')}${d.h2('7.1', 'Grupo homogêneo de exposição – GHE')}${p(T.ghe[0])}${p(T.ghe[1])}${ul(gheList)}`, { break: false });
  ghes.forEach((g, ix) => {
    const num = `7.1.${ix + 1}`;
    sec(gheIdentPgr(d, proj, g, infos[ix], num));
    const nPsico = (g.riscos || []).filter((r) => isPsicossocial(r.grupo)).length;
    const ref = nPsico ? `Fatores de risco psicossociais deste GHE (${nPsico}): ver item 7.2.` : '';
    sec(gheInventarioPgr(proj, g, ref), { landscape: true });
  });
  const psico = (proj.riscos || []).filter((r) => isPsicossocial(r.grupo));
  sec(drpsPgr(d, drps, psico));

  // ---- 8
  sec(`${d.h1('8', 'Implantação de medidas de controle')}${p(T.controles)}${ol(T.controlesItens)}${p(T.controlesHierarquia)}${ol(T.controlesHierarquiaItens.map((x) => [x]))}${p(T.controlesEpi)}`);

  // ---- 9 EPI
  const exist = episExistentes(proj, ghes);
  const recom = episRecomendados(proj, ghes, a, infos);
  sec(`${d.h1('9', 'Equipamento de proteção individual')}${d.h2('9.1', 'Equipamentos de proteção individual existentes')}${epiExistentesTable(exist)}`, { landscape: true });
  sec(`${d.h2('9.2', 'Equipamentos de proteção individual recomendados')}${epiRecomendadosTable(recom)}`, { landscape: true });
  sec(`${d.h2('9.3', 'Certificado de Aprovação – CA')}${p(T.epiCa)}${d.h2('9.4', 'Validade do Certificado de Aprovação')}${p(T.epiValidade)}`);

  // ---- 10 plano
  sec(`${d.h1('10', 'Plano de ação')}${T.plano.map(p).join('')}${prioridadeTable()}${p(T.prioridadeRegra)}`);
  const metas = planoMetas({ p: proj, ghes, insp, temEpi: exist.length + recom.length > 0, drpsAltos: (drps.altos || []).length, hoje });
  sec(planoTable(metas), { landscape: true });

  // ---- 11–13
  sec(`${d.h1('11', 'Considerações finais')}${T.finais.map(p).join('')}`);
  sec(`${d.h1('12', 'Referências da literatura')}${T.referencias.map((x) => `<p class="pgr-text pgr-ref">${esc(x)}</p>`).join('')}`);
  sec(
    respBlock(ctx, d, e, {
      num: '13',
      titulo: 'Responsabilidade técnica',
      texto: T.responsabilidade,
      signers: [{ label: 'Responsável Técnico:', nome: e.respSst, funcao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho', regLabel: 'Nº do registro MTE:', reg: e.regSst }],
    }),
  );

  // ---- appendices
  sec(epiFicha(d));
  const photos = (insp && insp.photos) || [];
  if (photos.length) {
    const cards = photos.map((f) => `<div class="pgr-foto-card"><img src="${esc(f.src)}" alt="${esc(f.titulo)}"><b>${esc(f.titulo)}</b>${f.obs ? `<span>${esc(f.obs)}</span>` : ''}</div>`);
    sec(`${d.title('Apêndice B – Registro fotográfico da visita técnica', 0)}${p('Registro das condições observadas durante a visita técnica descrita no item 6.1.')}${cardRows(cards, 2)}`);
  }
  return d.render(a.logo);
}
