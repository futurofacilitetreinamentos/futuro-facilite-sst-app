// Port of v8-src/js/report.js (V8Report) + the summary logic of v8-src/js/app.js.
// Pure functions: every input comes from the DocContext, output is an HTML string
// using the same sections, texts and classes as the legacy documents.
// NOTE: the stylesheet (report.css) is imported by index.ts, not here, so this
// module can run outside Vite (tsx / node).
import type { DocContext, LegacyChecklistItem, LegacyEmpresa, LegacyEquipe, LegacyInspection, LegacyProject } from './types';
import { esc, fmt, fmtH } from './html';
import { dataExtenso, grupoLetra, groups, mesAnoCapa, LTCAT_TEXTS, NR1_TEXTS, PCMSO_TEXTS, PGR_TEXTS } from './evolue';
import type { GheGroup } from './evolue';
import { gr, grNome, pd, riskLevel, riskScore, te } from './risk';
import type { RiskLevelLabel } from './risk';
import { pcmsoPlanFor } from './pcmso';
import type { PcmsoExame, PcmsoPlan } from './pcmso';
import { ltcatPlanFor } from './ltcat';
import type { LtcatAgente, LtcatPlan } from './ltcat';
import { emptyTopics, nColabs, scoreDrps } from './drps';
import type { DrpsBundle, DrpsTopicResult } from './drps';

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

interface Assets {
  logo: string;
  capa: string;
  base: string;
}

function assets(ctx: DocContext): Assets {
  const base = ctx.assetsBase || '';
  return { logo: base + 'logo.jpeg', capa: base + 'capa-pgr.jpg', base };
}

function emp(p: LegacyProject): LegacyEmpresa {
  return p.empresa || {};
}

/** Latest inspection of the project (ctx.inspections is newest first). */
export function latestInspection(ctx: DocContext): LegacyInspection | null {
  return (ctx.inspections || [])[0] || null;
}

/** Checklist items in item_0 … item_N order (robust to JSON key reordering). */
export function checklistValues(d: LegacyInspection): LegacyChecklistItem[] {
  const entries = Object.entries(d.checklist || {});
  const num = (k: string): number => {
    const m = /^item_(\d+)$/.exec(k);
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  };
  return entries
    .map(([k, v], i) => ({ k, v, i }))
    .sort((a, b) => num(a.k) - num(b.k) || a.i - b.i)
    .map((x) => x.v);
}

interface SlimNc {
  titulo: string;
  obs: string;
  acao: string;
  risco: string;
  prazo: string;
  responsavel: string;
}

interface SlimPhoto {
  titulo: string;
  src: string;
  obs?: string;
}

interface SlimInspecao {
  numero: string;
  dataVisita: string;
  tecnico: string;
  objetivo: string;
  conclusao: string;
  recomendacoes: string;
  nItens: number;
  nConformes: number;
  nNc: number;
  ncs: SlimNc[];
  photos: SlimPhoto[];
}

/** Legacy app.js slimInspecao(): what the PGR / LTCAT use from the latest inspection. */
function slimInspecao(d: LegacyInspection | null): SlimInspecao | null {
  if (!d) return null;
  const items = checklistValues(d);
  const ncs = items
    .filter((x) => x.status === 'Não conforme')
    .map((x) => ({ titulo: x.titulo || '', obs: x.obs || '', acao: x.acao || '', risco: x.risco || '', prazo: x.prazo || '', responsavel: x.responsavel || '' }));
  const photos: SlimPhoto[] = [];
  if (d.fotoCapa) photos.push({ titulo: 'Registro fotográfico da visita', src: d.fotoCapa });
  items.forEach((x) => {
    (x.photos || []).forEach((src) => {
      if (src) photos.push({ titulo: x.titulo || 'Registro', src, obs: x.obs || '' });
    });
  });
  return {
    numero: d.numero || '',
    dataVisita: d.dataVisita || '',
    tecnico: d.tecnico || '',
    objetivo: d.objetivo || '',
    conclusao: d.conclusao || '',
    recomendacoes: d.recomendacoes || '',
    nItens: items.length,
    nConformes: items.filter((x) => x.status === 'Conforme').length,
    nNc: ncs.length,
    ncs,
    photos: photos.slice(0, 16),
  };
}

function findEquipe(ctx: DocContext, tipo: string, id?: string, nome?: string): LegacyEquipe | undefined {
  const list = ctx.equipe || [];
  return (id ? list.find((x) => x.id === id) : undefined) || (nome ? list.find((x) => x.tipo === tipo && x.nome === nome) : undefined);
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function head(a: Assets, n: number, total: number): string {
  return `<div class="pgr-head"><img src="${esc(a.logo)}" alt="Futuro Facilite Treinamentos"></div><div class="pgr-foot"><span>(61) 98515-0519 · futurofacilitetreinamentos@gmail.com</span><span>Página ${n} de ${total}</span></div>`;
}

function page(a: Assets, content: string, n: number, total: number): string {
  return `<section class="pgr-page">${head(a, n, total)}<div class="pgr-content">${content}</div></section>`;
}

function doc(a: Assets, coverHtml: string, innerPages: string[]): string {
  const total = innerPages.length + 1;
  let html = coverHtml;
  let n = 2;
  innerPages.forEach((c) => {
    html += page(a, c, n++, total);
  });
  return `<div class="pgr-doc">${html}</div>`;
}

interface CoverOpts {
  badge: string;
  /** Trusted HTML (constant titles with <br>). */
  title?: string;
  respNome?: string;
  respFuncao?: string;
  regLabel?: string;
  respReg?: string;
}

function cover(a: Assets, e: LegacyEmpresa, { badge, title, respNome, respFuncao, regLabel, respReg }: CoverOpts): string {
  const rebadge = badge && badge !== 'PGR';
  return `<section class="pgr-page pgr-cover pgr-cover-ff"><img class="pgr-cover-bg" src="${esc(a.capa)}" alt=""><div class="pgr-cover-overlay">${rebadge ? `<div class="pgr-cover-mask"></div><div class="pgr-cover-rebadge">${esc(badge)}</div><div class="pgr-cover-retitle">${title || ''}</div>` : ''}<div class="pgr-cover-id"><h2>${esc(e.razaoSocial || '—')}</h2><p><b>RESPONSÁVEL TÉCNICO:</b> ${esc((respNome || '—').toUpperCase())}</p><p>${esc((respFuncao || '—').toUpperCase())}</p><p><b>${esc(regLabel || 'MTE')}:</b> ${esc(respReg || '—')}</p><p><b>DATA DE ELABORAÇÃO:</b> ${esc(mesAnoCapa(e.dataElaboracao))}</p></div></div></section>`;
}

function identTable(e: LegacyEmpresa): string {
  return `<table class="pgr-table"><tr><th>Razão social</th><td colspan="3">${esc(e.razaoSocial || '—')}</td></tr><tr><th>Nome fantasia</th><td>${esc(e.nomeFantasia || '—')}</td><th>CNPJ</th><td>${esc(e.cnpj || '—')}</td></tr><tr><th>CNAE</th><td>${esc(e.cnae || '—')}</td><th>Grau de risco</th><td>${esc(e.grauRisco || '—')}</td></tr><tr><th>Trabalhadores</th><td>${esc(e.numTrabalhadores || '0')}</td><th>Responsável</th><td>${esc(e.responsavelEmpresa || '—')}</td></tr><tr><th>Telefone</th><td>${esc(e.contatoEmpresa || '—')}</td><th>E-mail</th><td>${esc(e.emailEmpresa || '—')}</td></tr><tr><th>Logradouro</th><td colspan="3">${esc(e.endereco || '—')}</td></tr><tr><th>Atividade</th><td colspan="3">${esc(e.atividadeEmpresa || '—')}</td></tr></table>`;
}

function revTable(e: LegacyEmpresa, itens: string): string {
  return `<div class="pgr-text">${esc(PGR_TEXTS.revisoes || 'O controle de revisões registra as alterações do documento ao longo da vigência.')}</div><h2 class="pgr-sub">Controle de revisões</h2><table class="pgr-table"><thead><tr><th>Revisão nº</th><th>Data</th><th>Itens revisados</th></tr></thead><tbody><tr><td>001</td><td>${fmtH(e.dataElaboracao)}</td><td>${esc(itens || 'Documento-base e anexos')}</td></tr></tbody></table>`;
}

function sumario(list: readonly string[]): string {
  return `<h1 class="pgr-title">Sumário</h1><ol class="pgr-sumario">${(list || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
}

interface RespOpts {
  titulo: string;
  texto: string;
  nome?: string;
  funcao?: string;
  reg?: string;
}

function respBlock(ctx: DocContext, e: LegacyEmpresa, { titulo, texto, nome, funcao, reg }: RespOpts): string {
  return `<h1 class="pgr-title">${esc(titulo)}</h1><div class="pgr-text">${esc(texto)}</div><div class="pgr-text">A implementação e o desenvolvimento deste documento são de responsabilidade de ${esc(e.razaoSocial || 'a organização')}, que deve disponibilizar os recursos necessários e atender às solicitações das autoridades competentes.</div><div class="pgr-text">Brasília-DF, ${esc(dataExtenso(e.dataElaboracao, ctx.today))}.</div><div class="sign-grid"><div class="sign">${esc(nome || 'Responsável técnico')}<br>${esc(funcao || '')}${reg ? '<br>' + esc(reg) : ''}</div><div class="sign">${esc(e.responsavelEmpresa || 'Responsável pela organização')}<br>Representante da organização</div></div>`;
}

function legend(): string {
  return `<h2 class="pgr-sub">Legenda</h2><table class="pgr-table compact"><thead><tr><th>Grupo</th><th>TE</th><th>PD</th><th>GR</th></tr></thead><tbody><tr><td>F Físico · Q Químico · B Biológico · E Ergonômico · A Acidente</td><td>E Eventual · I Intermitente · P Permanente</td><td>B Baixo · M Médio · A Alto · C Crítico</td><td>T Tolerável · M Moderado · S Substancial · IT Intolerável</td></tr></tbody></table>`;
}

// The printed matrix is the source of truth for GR (see risk.ts GR_MATRIX).
function matrix(): string {
  return `<h2 class="pgr-sub">Matriz de graduação de risco (GR = S × F)</h2><div class="pgr-text">Tempo de exposição: Eventual (menos de 30 minutos da jornada); Intermitente (30 minutos a 6 horas); Permanente (mais de 6 horas). Potencial de dano: Baixo, Médio, Alto ou Crítico.</div><table class="pgr-table compact"><thead><tr><th></th><th>Permanente</th><th>Intermitente</th><th>Eventual</th></tr></thead><tbody><tr><th>Baixo</th><td>Moderado</td><td>Tolerável</td><td>Tolerável</td></tr><tr><th>Médio</th><td>Substancial</td><td>Moderado</td><td>Tolerável</td></tr><tr><th>Alto</th><td>Intolerável</td><td>Substancial</td><td>Moderado</td></tr><tr><th>Crítico</th><td>Intolerável</td><td>Intolerável</td><td>Substancial</td></tr></tbody></table><table class="pgr-table compact" style="margin-top:3mm"><thead><tr><th>GR</th><th>Ações necessárias</th></tr></thead><tbody><tr><td>Tolerável</td><td>Não é necessária a adoção de novas medidas.</td></tr><tr><td>Moderado</td><td>Reavaliar os meios de controle e, quando necessário, adotar medidas complementares.</td></tr><tr><td>Substancial</td><td>Implantar novas medidas de controle ou corrigir falhas nas existentes.</td></tr><tr><td>Intolerável</td><td>Implantar novas medidas, adotando ação de caráter imediato.</td></tr></tbody></table>`;
}

interface GheRow {
  L: string;
  perigo: string;
  fonte: string;
  te: string;
  pd: string;
  gr: string;
  controles: string;
  acao: string;
  dano: string;
}

function gheRows(g: GheGroup): GheRow[] {
  const letters = ['F', 'Q', 'B', 'E', 'A'];
  const rows: GheRow[] = [];
  const toRow = (L: string, r: GheGroup['riscos'][number]): GheRow => ({
    L,
    perigo: r.perigo || '—',
    fonte: r.fonte || '—',
    te: te(r.prob),
    pd: pd(r.sev),
    gr: gr(r.prob, r.sev),
    controles: r.controles || '—',
    acao: r.acao || '—',
    dano: r.dano || '—',
  });
  letters.forEach((L) => {
    const rs = (g.riscos || []).filter((r) => grupoLetra(r.grupo) === L);
    if (!rs.length) rows.push({ L, perigo: 'Ausência de fator de risco', fonte: '—', te: '—', pd: '—', gr: '—', controles: '—', acao: '—', dano: '—' });
    else rs.forEach((r) => rows.push(toRow(L, r)));
  });
  (g.riscos || []).filter((r) => grupoLetra(r.grupo) === 'P').forEach((r) => rows.push(toRow('P', r)));
  return rows;
}

function gheAmbiente(p: LegacyProject, g: GheGroup): string {
  const s = (p.setores || []).find((x) => x.nome === g.ghe.setor);
  return s ? `${s.ambiente || ''}${s.descricao ? ' — ' + s.descricao : ''}`.trim() : g.ghe.setor || 'Ambientes do condomínio';
}

function gheIdent(p: LegacyProject, g: GheGroup, ix: number, prefix: string): string {
  const fn =
    (g.funcoes || []).map((f) => `<tr><td>${esc(f.nome)}</td><td>${esc(f.quantidade || '—')} trabalhador(es)</td><td>${esc(f.cbo || '—')}</td></tr>`).join('') ||
    `<tr><td>${esc(g.ghe.funcoes || '—')}</td><td>—</td><td>—</td></tr>`;
  const atv = (g.funcoes || []).map((f) => `<p><b>${esc(f.nome)}:</b> ${esc(f.atividades || '—')}</p>`).join('') || `<p>${esc(g.ghe.descricao || '—')}</p>`;
  return `<h1 class="pgr-title">${esc(prefix)}. ${esc(g.ghe.nome || 'GHE ' + (ix + 1))}</h1><table class="pgr-table"><tr><th>Tipo de atividade</th><td>${esc(
    g.ghe.descricao ||
      (g.funcoes || [])
        .map((f) => f.atividades)
        .filter(Boolean)
        .join(' ') ||
      'Atividades do condomínio',
  )}</td></tr><tr><th>Descrição do ambiente</th><td>${esc(gheAmbiente(p, g))}</td></tr></table><h2 class="pgr-sub">Identificação das funções</h2><table class="pgr-table compact"><thead><tr><th>Cargo / função</th><th>Quantidade</th><th>CBO</th></tr></thead><tbody>${fn}</tbody></table><h2 class="pgr-sub">Descrição das atividades</h2><div class="pgr-text">${atv}</div>`;
}

function gheInventario(g: GheGroup): string {
  const rows = gheRows(g);
  const inv = rows
    .map((r) => `<tr><td>${esc(r.L)}</td><td>${esc(r.perigo)}</td><td>${esc(r.fonte)}</td><td>${esc(r.te)}</td><td>${esc(r.pd)}</td><td>${esc(r.gr)}</td><td>${esc(r.controles)}</td><td>${esc(r.acao)}</td></tr>`)
    .join('');
  const dano =
    rows
      .filter((r) => r.perigo !== 'Ausência de fator de risco')
      .map((r) => `<tr><td>${esc(r.L)}</td><td>${esc(r.perigo)}</td><td>${esc(r.dano)}</td></tr>`)
      .join('') || '<tr><td colspan="3">Sem agravos cadastrados neste GHE.</td></tr>';
  return `<h2 class="pgr-sub">Inventário de riscos e perigos</h2><table class="pgr-table compact"><thead><tr><th></th><th>Fator de exposição</th><th>Fonte geradora</th><th>TE</th><th>PD</th><th>GR</th><th>Controles existentes</th><th>Propostas</th></tr></thead><tbody>${inv}</tbody></table>${legend()}<h2 class="pgr-sub">Indicativos de possível comprometimento à saúde</h2><table class="pgr-table compact"><thead><tr><th></th><th>Agente</th><th>Possíveis danos à saúde</th></tr></thead><tbody>${dano}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// EPI
// ---------------------------------------------------------------------------

interface EpiItem {
  id: string;
  nome: string;
  uso: string;
  /** Path relative to assetsBase. */
  img: string;
  re: RegExp;
}

export const EPI_ITENS: readonly EpiItem[] = [
  { id: 'luva', nome: 'Luva de proteção nitrílica', uso: 'Produtos químicos, limpeza e risco biológico', img: 'epi/luva.jpg', re: /luva|quím|domissanit|limpeza|biol|álcool|sanit|nitr/i },
  { id: 'luva-latex', nome: 'Luva de procedimento (látex / vinil)', uso: 'Higienização, resíduos e contato com umidade', img: 'epi/luva-latex.jpg', re: /luva|procedimento|látex|latex|resíduo|residuo|lixo|umid/i },
  { id: 'pff2', nome: 'Respirador purificador de ar tipo PFF2', uso: 'Poeiras, aerossóis e agentes biológicos', img: 'epi/pff2.jpg', re: /pff|respir|máscara|mascara|poeira|quím|biol|lixo|resíduo/i },
  { id: 'bota', nome: 'Calçado ocupacional tipo bota, solado antiderrapante', uso: 'Piso molhado, queda e escorregão', img: 'epi/bota.png', re: /bota|queda|escorreg|piso|calçado|calcado/i },
  { id: 'bone', nome: 'Boné árabe / proteção contra radiação solar', uso: 'Trabalho externo e incidência solar (portaria / áreas comuns)', img: 'epi/bone.png', re: /sol|térmic|termic|calor|portaria|extern|radiação|bone|boné/i },
  { id: 'oculos', nome: 'Óculos de proteção', uso: 'Projeção de partículas, produtos químicos e limpeza', img: 'epi/oculos.jpg', re: /óculos|oculos|partícula|particula|quím|limpeza|resping/i },
  { id: 'protetor', nome: 'Protetor auditivo tipo concha', uso: 'Exposição a ruído (máquinas, portaria e áreas externas)', img: 'epi/protetor.jpg', re: /ruído|ruido|audit|barulho|máquin|maquin/i },
];

function epiExistentes(p: LegacyProject): string {
  const rows = (p.riscos || [])
    .map((r) => {
      const t = [r.controles, r.acao, r.perigo].join(' ');
      const epis = EPI_ITENS.filter((e) => e.re.test(t)).map((e) => e.nome);
      if (!epis.length && /epi/i.test(t)) epis.push('EPI citado no inventário (especificar CA)');
      if (!epis.length) return '';
      return `<tr><td>${esc(r.ghe || r.funcao || '—')}</td><td>${esc(r.perigo || '—')}</td><td>${esc(epis.join('; '))}</td><td>${esc(r.controles || '—')}</td></tr>`;
    })
    .filter(Boolean)
    .join('');
  return rows || '<tr><td colspan="4">Na visita técnica não foi comprovado controle formal de entrega de EPI. Os equipamentos devem ser implantados conforme o item 10.2 e o Apêndice A.</td></tr>';
}

function epiGallery(a: Assets, itens: readonly EpiItem[]): string {
  return `<div class="pgr-epi-grid">${itens.map((e) => `<div class="pgr-epi-card"><img src="${esc(a.base + e.img)}" alt="${esc(e.nome)}"><b>${esc(e.nome)}</b><span>${esc(e.uso)}</span></div>`).join('')}</div>`;
}

function epiFicha(): string {
  const lines = Array.from({ length: 8 }, () => '<tr><td style="height:8mm"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
  return `<h1 class="pgr-title">Apêndice A — Ficha de controle de EPI</h1><div class="pgr-text">Modelo sugerido para registro do fornecimento, nos termos da NR-6. Preencher uma linha por entrega ou substituição. Manter arquivado com o PGR.</div><table class="pgr-table compact" style="margin-top:3mm"><thead><tr><th>Colaborador</th><th>Função</th><th>EPI</th><th>CA</th><th>Data entrega</th><th>Substituição</th><th>Ass. empregado</th><th>Ass. responsável</th></tr></thead><tbody>${lines}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Sections shared by PGR / LTCAT / NR-1
// ---------------------------------------------------------------------------

function visitaBlock(i: SlimInspecao | null): string {
  const T = PGR_TEXTS;
  let html = `<h1 class="pgr-title">6. Avaliação dos riscos e perigos</h1><h2 class="pgr-sub">6.1. Visita técnica</h2><div class="pgr-text">${esc(T.visita)}</div>`;
  if (i) {
    html += `<table class="pgr-table"><tr><th>Relatório SST</th><td>${esc(i.numero || '—')}</td><th>Data da visita</th><td>${fmtH(i.dataVisita)}</td></tr><tr><th>Técnico responsável</th><td colspan="3">${esc(i.tecnico || '—')}</td></tr><tr><th>Itens avaliados</th><td>${esc(i.nItens || 0)}</td><th>Não conformidades</th><td>${esc(i.nNc || 0)}</td></tr></table>`;
    if (i.objetivo) html += `<div class="pgr-text"><b>Objetivo da visita:</b> ${esc(i.objetivo)}</div>`;
    if ((i.ncs || []).length) {
      html += `<h2 class="pgr-sub">Constatações da inspeção SST</h2><table class="pgr-table compact"><thead><tr><th>Item</th><th>Irregularidade</th><th>Risco</th><th>Medida recomendada</th></tr></thead><tbody>${i.ncs
        .map((x) => `<tr><td>${esc(x.titulo)}</td><td>${esc(x.obs || '—')}</td><td>${esc(x.risco || '—')}</td><td>${esc(x.acao || '—')}</td></tr>`)
        .join('')}</tbody></table>`;
    }
    if (i.conclusao) html += `<div class="pgr-text" style="margin-top:2mm">${esc(i.conclusao)}</div>`;
  } else {
    html += `<div class="pgr-text">A visita técnica ainda não foi registrada neste condomínio. O inventário usa os dados do cadastro (setores, funções, GHE e riscos). Após a inspeção SST do passo a passo, as constatações, prazos e o registro fotográfico passam a integrar automaticamente este PGR e o LTCAT.</div>`;
  }
  html += `<h2 class="pgr-sub">6.2. Avaliação qualitativa</h2><div class="pgr-text">${esc(T.qualitativa)}</div>${matrix()}`;
  return html;
}

interface PgrPlanoRow {
  risco?: string;
  gr: string;
  acao?: string;
  resp?: string;
  prazo?: string;
  status: string;
  origem: string;
}

function pgrPlanoRows(p: LegacyProject, insp: SlimInspecao | null): PgrPlanoRow[] {
  const fromRiscos = (p.riscos || [])
    .filter((r) => r.acao)
    .map((r) => ({ risco: r.perigo, gr: grNome(gr(r.prob, r.sev)), acao: r.acao, resp: r.responsavel, prazo: r.prazo, status: r.status || 'Pendente', origem: 'Inventário' }));
  const fromNc = ((insp && insp.ncs) || [])
    .filter((x) => x.acao)
    .map((x) => ({ risco: x.titulo, gr: x.risco || '—', acao: x.acao, resp: x.responsavel, prazo: x.prazo, status: 'Pendente', origem: 'Inspeção' }));
  return [...fromRiscos, ...fromNc];
}

function fotoPages(insp: SlimInspecao | null, titulo: string, intro: string): string[] {
  const photos = (insp && insp.photos) || [];
  if (!photos.length) {
    return [`<h1 class="pgr-title">${esc(titulo)}</h1><div class="pgr-text">${esc(intro)} A visita técnica ainda não possui registro fotográfico. Após a inspeção SST, as imagens capturadas no checklist passam a constar automaticamente nesta seção.</div>`];
  }
  const chunks: SlimPhoto[][] = [];
  for (let i = 0; i < photos.length; i += 4) chunks.push(photos.slice(i, i + 4));
  return chunks.map(
    (ch, ix) =>
      `<h1 class="pgr-title">${esc(titulo)}${chunks.length > 1 ? ` (${ix + 1}/${chunks.length})` : ''}</h1>${ix === 0 ? `<div class="pgr-text">${esc(intro)}</div>` : ''}<div class="pgr-foto-grid">${ch
        .map((f) => `<div class="pgr-foto-card"><img src="${esc(f.src)}" alt="${esc(f.titulo)}"><b>${esc(f.titulo)}</b>${f.obs ? `<span>${esc(f.obs)}</span>` : ''}</div>`)
        .join('')}</div>`,
  );
}

const AGRAVO_FALLBACK = 'transtornos psicológicos e emocionais, burnout, ansiedade, insônia, medo, desmotivação e demais agravos à saúde mental.';
const DRPS_ESCALA =
  'Questionário: 1 Nunca · 2 Raramente · 3 Às vezes · 4 Frequentemente · 5 Sempre. A média coletiva por tópico está na escala de gravidade 1 Baixa · 2 Média · 3 Alta (modelo NR-01). Classificação: ≤ 1,66 Baixa; ≤ 2,32 Média; > 2,32 Alta.';

function drpsTopics(d: DrpsBundle): DrpsTopicResult[] {
  return d.topicos && d.topicos.length ? d.topicos : emptyTopics();
}

function drpsSetores(d: DrpsBundle): string {
  return (
    Object.entries(d.porSetor || {})
      .map(([k, v]) => `${esc(k)} (${v})`)
      .join('; ') || '—'
  );
}

function drpsRows(topics: DrpsTopicResult[], nResp: number): string {
  return (
    topics
      .map((t) => {
        const media = nResp && t.media ? Number(t.media).toFixed(2) : '—';
        const g = nResp ? esc(t.gravidade || '—') : 'A avaliar';
        const cls = t.gravidadeN >= 3 ? ' class="alta"' : '';
        return `<tr${cls}><td>${esc(t.nome)}</td><td>${media}</td><td>${g}</td></tr>`;
      })
      .join('') || '<tr><td colspan="3">Tópicos do DRPS indisponíveis.</td></tr>'
  );
}

function drpsBlock(d: DrpsBundle): string[] {
  const topics = drpsTopics(d);
  const nResp = d.n || 0;
  const setores = drpsSetores(d);
  const intro = nResp
    ? `Esta seção atende à NR-1 quanto à identificação, avaliação e informação dos riscos psicossociais relacionados ao trabalho. O Diagnóstico de Riscos Psicossociais (DRPS) foi aplicado de forma confidencial (50 questões, 13 tópicos). Os resultados entram neste PGR apenas de forma coletiva, sem identificação nominal dos trabalhadores.`
    : `A NR-1 exige que os riscos psicossociais relacionados ao trabalho sejam identificados, avaliados e informados neste PGR. O Diagnóstico de Riscos Psicossociais (DRPS) ainda não foi aplicado neste condomínio. Esta seção permanece aberta até a coleta das respostas dos trabalhadores.`;
  const rows = drpsRows(topics, nResp);
  const fontes = topics
    .map((t) => {
      const cls = t.gravidadeN >= 3 ? ' class="alta"' : '';
      return `<tr${cls}><td>${esc(t.nome)}</td><td>${esc(t.gravidade || '—')}</td><td>${esc(t.fonte || '')}</td></tr>`;
    })
    .join('');
  const page1 = `<h1 class="pgr-title">8. Riscos psicossociais (DRPS / NR-1)</h1><div class="pgr-text">${intro}</div><div class="pgr-kpi"><span><b>${nResp}</b> resposta(s) coletiva(s)</span><span><b>${(d.altos || []).length}</b> tópico(s) em gravidade alta</span><span>Setores: ${setores}</span></div><h2 class="pgr-sub">Inventário coletivo por tópico</h2><table class="pgr-table compact"><thead><tr><th>Tópico / fator psicossocial</th><th>Média (1–3)</th><th>Gravidade</th></tr></thead><tbody>${rows}</tbody></table><div class="pgr-text" style="margin-top:3mm">${DRPS_ESCALA}</div>`;
  const page2 = `<h1 class="pgr-title">8. Riscos psicossociais — fontes e agravos</h1><h2 class="pgr-sub">Fonte geradora por tópico</h2><table class="pgr-table compact"><thead><tr><th>Tópico</th><th>Gravidade</th><th>Fonte geradora (circunstâncias)</th></tr></thead><tbody>${fontes}</tbody></table><div class="pgr-text" style="margin-top:3mm"><b>Possíveis agravos:</b> ${esc(topics[0]?.agravo || AGRAVO_FALLBACK)}</div><h2 class="pgr-sub">Medidas organizacionais</h2><div class="pgr-text">Os fatores em gravidade alta devem ser tratados no plano de ação deste PGR, com medidas organizacionais e relacionais — canal de denúncia, suporte da liderança, clareza de papel, dimensionamento de equipe, comunicação e reconhecimento — sem exposição nominal dos trabalhadores. Reaplicar o DRPS após as intervenções ou quando houver mudança relevante na organização do trabalho.</div><div class="pgr-text">Confidencialidade: as respostas individuais não constam deste documento. O PGR informa apenas o resultado coletivo, por tópico.</div>`;
  return nResp ? [page1, page2] : [page1];
}

// ---------------------------------------------------------------------------
// PGR
// ---------------------------------------------------------------------------

export function buildPGR(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const T = PGR_TEXTS;
  const insp = slimInspecao(latestInspection(ctx));
  const drps = scoreDrps(ctx.drps || []);
  const ghes = groups(p);
  const actions = pgrPlanoRows(p, insp);
  const actionChunks: PgrPlanoRow[][] = [];
  for (let i = 0; i < actions.length; i += 8) actionChunks.push(actions.slice(i, i + 8));
  if (!actionChunks.length) actionChunks.push([]);
  const pages: string[] = [];
  pages.push(revTable(e, 'Documento-base, inventário de riscos, DRPS e plano de ação'));
  pages.push(`<h1 class="pgr-title">Apresentação</h1><div class="pgr-text">${esc(T.apresentacao)}</div>` + sumario(T.sumario));
  pages.push(
    `<h1 class="pgr-title">1. Introdução</h1><div class="pgr-text">${esc(T.intro)}</div><h1 class="pgr-title">2. Documento-base</h1><div class="pgr-text">${esc(T.base)}</div><h2 class="pgr-sub">2.1. Integração com o PCMSO</h2><div class="pgr-text">${esc(T.pcmso)}</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">3. Identificação da empresa</h1>${identTable(e)}<h2 class="pgr-sub">Responsáveis técnicos cadastrados</h2><table class="pgr-table"><tr><th>SST</th><td>${esc(e.respSst || '—')}${e.regSst ? ' · Registro ' + esc(e.regSst) : ''}</td></tr><tr><th>Médico do Trabalho</th><td>${esc(e.medicoTrabalho || '—')}${e.crmMedico ? ' · CRM ' + esc(e.crmMedico) : ''}</td></tr><tr><th>Engenharia de Segurança</th><td>${esc(e.engSeguranca || '—')}${e.creaEng ? ' · CREA ' + esc(e.creaEng) : ''}</td></tr></table>`,
  );
  pages.push(
    `<h1 class="pgr-title">4. Estrutura do PGR</h1><div class="pgr-text">${esc(T.estrutura)}</div><h2 class="pgr-sub">4.1. Planejamento continuado</h2><div class="pgr-text">Revisão no mínimo a cada dois anos ou antes: após implementação de medidas (risco residual); inovações em tecnologias, ambientes, processos ou organização do trabalho; inadequação das medidas; acidente ou doença relacionada ao trabalho; mudança de requisito legal. Organizações com certificação em gestão de SST podem adotar prazo de até três anos.</div><h2 class="pgr-sub">4.2. Plano das ações</h2><div class="pgr-text">O plano de ações informa como e quando serão desenvolvidas, acompanhadas e aferidas as medidas de prevenção. As ações deste condomínio saem do inventário de riscos e das não conformidades da inspeção SST, com responsável, prazo e status.</div><h2 class="pgr-sub">4.3. Estratégia e metodologia de ações</h2><div class="pgr-text">${esc(T.hierarquia)}</div><h2 class="pgr-sub">4.4. Registro e divulgação de dados</h2><div class="pgr-text">${esc(T.registro)}</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">5. Desenvolvimento do PGR</h1><h2 class="pgr-sub">5.1. Identificação dos agentes de riscos ocupacionais</h2><div class="pgr-text"><b>Físicos:</b> energia capaz de causar lesão ou agravo (ruído, vibração, temperaturas extremas, radiações, umidade, entre outros).<br><b>Químicos:</b> substâncias que penetram por via respiratória, cutânea ou ingestão (poeiras, fumos, névoas, gases, vapores, produtos de limpeza).<br><b>Biológicos:</b> microrganismos, parasitas ou materiais de origem orgânica capazes de acarretar agravo à saúde.<br><b>Ergonômicos (NR-17):</b> postura inadequada, ritmo excessivo, levantamento de peso, turno/noturno, jornada prolongada, esforço, monotonia e demais fatores de estresse físico ou psíquico.<br><b>Acidente:</b> arranjo físico, armazenamento, iluminação, máquinas sem proteção, eletricidade, queda, ferramentas e demais condições do ambiente.</div><h2 class="pgr-sub">5.2. Perigos</h2><div class="pgr-text">O perigo é a situação com potencial de prejuízo à saúde, ao ambiente ou ao patrimônio — o fator causador do dano. A identificação neste documento usa os setores, funções, GHE e riscos cadastrados do condomínio.</div>`,
  );
  pages.push(visitaBlock(insp));
  pages.push(
    `<h1 class="pgr-title">7. Inventário de riscos e perigos</h1><h2 class="pgr-sub">7.1. Grupo homogêneo de exposição — GHE</h2><div class="pgr-text">${esc(T.ghe)}</div><table class="pgr-table compact"><thead><tr><th>GHE</th><th>Setor</th><th>Funções</th><th>Descrição</th></tr></thead><tbody>${ghes
      .map(
        (g) =>
          `<tr><td>${esc(g.ghe.nome)}</td><td>${esc(g.ghe.setor || '—')}</td><td>${esc(
            g.ghe.funcoes ||
              (g.funcoes || [])
                .map((f) => f.nome)
                .join(', ') ||
              '—',
          )}</td><td>${esc(g.ghe.descricao || '—')}</td></tr>`,
      )
      .join('')}</tbody></table>`,
  );
  ghes.forEach((g, ix) => {
    pages.push(gheIdent(p, g, ix, '7.1.' + (ix + 1)));
    pages.push(`<h1 class="pgr-title">7.1.${ix + 1}. Inventário — ${esc(g.ghe.nome)}</h1>` + gheInventario(g));
  });
  drpsBlock(drps).forEach((c) => pages.push(c));
  pages.push(
    `<h1 class="pgr-title">9. Implantação de medidas de controle</h1><div class="pgr-text">${esc(T.controles)}</div><div class="pgr-text">${esc(T.hierarquia)}</div><div class="pgr-text">Quando comprovada a inviabilidade técnica de proteção coletiva, ou quando esta for insuficiente, complementar ou emergencial, adotam-se medidas administrativas e, em seguida, o Equipamento de Proteção Individual — EPI (NR-6).</div>`,
  );
  const epis = EPI_ITENS;
  pages.push(
    `<h1 class="pgr-title">10. Equipamento de proteção individual</h1><div class="pgr-text">${esc(T.epi)}</div><h2 class="pgr-sub">10.1. Equipamentos de proteção individual existentes</h2><div class="pgr-text">${esc(T.epiExistentes)}</div><table class="pgr-table compact" style="margin-top:2mm"><thead><tr><th>GHE / função</th><th>Fator de exposição</th><th>EPI</th><th>Controle informado</th></tr></thead><tbody>${epiExistentes(p)}</tbody></table>`,
  );
  pages.push(
    `<h1 class="pgr-title">10.2. Equipamentos de proteção individual recomendados</h1><div class="pgr-text">${esc(T.epiRecomendados)}</div><table class="pgr-table compact" style="margin-top:2mm"><thead><tr><th>EPI</th><th>Uso previsto no condomínio</th></tr></thead><tbody>${epis
      .map((x) => `<tr><td>${esc(x.nome)}</td><td>${esc(x.uso)}</td></tr>`)
      .join('')}</tbody></table><h2 class="pgr-sub">10.3. Certificado de Aprovação — CA</h2><div class="pgr-text">${esc(T.epiCa)}</div><h2 class="pgr-sub">10.4. Validade do Certificado de Aprovação</h2><div class="pgr-text">${esc(T.epiValidade)}</div>`,
  );
  actionChunks.forEach((ch, ix) => {
    pages.push(
      `<h1 class="pgr-title">11. Plano de ação ${actionChunks.length > 1 ? `(${ix + 1}/${actionChunks.length})` : ''}</h1>${
        ix === 0
          ? `<div class="pgr-text">O cumprimento das ações é de responsabilidade da organização, observando prazos, metas e prioridades. Inclui as medidas do inventário, as não conformidades da inspeção SST, o controle de EPI e, quando o DRPS indicar gravidade alta, as intervenções organizacionais do item 8.</div>`
          : ''
      }<table class="pgr-table compact"><thead><tr><th>Origem</th><th>Risco / item</th><th>GR</th><th>Medida proposta</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${
        ch
          .map(
            (r) =>
              `<tr><td>${esc(r.origem)}</td><td>${esc(r.risco)}</td><td>${esc(r.gr)}</td><td>${esc(r.acao)}</td><td>${esc(r.resp)}</td><td>${fmtH(r.prazo)}</td><td>${esc(r.status || 'Pendente')}</td></tr>`,
          )
          .join('') || '<tr><td colspan="7">Nenhuma ação cadastrada no inventário nem na inspeção.</td></tr>'
      }</tbody></table>`,
    );
  });
  pages.push(`<h1 class="pgr-title">12. Considerações finais</h1><div class="pgr-text">${esc(T.final)}</div><h1 class="pgr-title">13. Referências</h1><div class="pgr-text">${esc(T.refs)}</div>`);
  pages.push(
    respBlock(ctx, e, {
      titulo: '14. Responsabilidade técnica',
      texto:
        'A produção técnica contida neste Programa de Gerenciamento de Riscos (PGR), elaborado com base no cadastro da organização e na visita técnica, é de responsabilidade do profissional competente abaixo especificado, sob supervisão da Futuro Facilite Treinamentos.',
      nome: e.respSst,
      funcao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho',
      reg: e.regSst ? 'Registro ' + e.regSst : '',
    }),
  );
  pages.push(epiFicha());
  pages.push(
    `<h1 class="pgr-title">Apêndice B — Imagens dos EPIs recomendados</h1><div class="pgr-text">As imagens ilustram os equipamentos típicos para as atividades de condomínio. O modelo adquirido deve ter CA válido e corresponder ao risco do GHE.</div>${epiGallery(a, epis)}`,
  );
  return doc(a, cover(a, e, { badge: 'PGR', respNome: e.respSst, respFuncao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho', regLabel: 'MTE', respReg: e.regSst }), pages);
}

// ---------------------------------------------------------------------------
// PCMSO
// ---------------------------------------------------------------------------

function examFlags(e: PcmsoExame): { a: string; meses: string; p: string; d: string } {
  const t = String(e.tipos || '').toUpperCase();
  return {
    a: /A/.test(t) ? 'X' : '',
    meses: /P/.test(t) ? (String(e.periodo || '').toLowerCase().includes('anual') ? '12' : e.periodo || '—') : '—',
    p: /P/.test(t) ? e.periodo || 'Anual' : '',
    d: /D/.test(t) ? 'X' : '',
  };
}

export function buildPCMSO(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const T = PCMSO_TEXTS;
  const plan = pcmsoPlanFor(p);
  const med = plan.medico;
  const pages: string[] = [];
  pages.push(revTable(e, 'Documento-base, planejamento de exames e anexos'));
  pages.push(`<h1 class="pgr-title">Apresentação</h1><div class="pgr-text">${esc(T.apresentacao)}</div>` + sumario(T.sumario));
  pages.push(`<h1 class="pgr-title">1. Identificação do estabelecimento</h1>${identTable(e)}`);
  pages.push(
    `<h1 class="pgr-title">2. Introdução</h1><div class="pgr-text">${esc(T.intro)}</div><h2 class="pgr-sub">2.1. Médico responsável do PCMSO</h2><div class="pgr-text">A organização, por meio deste PCMSO, indica ${esc(med.nome || 'o Médico do Trabalho a ser selecionado no cadastro')} ${med.crm ? 'CRM ' + esc(med.crm) : ''} como médico responsável. Caso observe inconsistências no inventário de riscos, deve reavaliá-las em conjunto com os responsáveis pelo PGR. Em caso de substituição, os prontuários devem ser formalmente transferidos ao sucessor.</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">3. Desenvolvimento</h1><div class="pgr-text">${esc(T.tipos)}</div><h2 class="pgr-sub">3.1. Exame admissional</h2><div class="pgr-text">Realizado antes de o empregado assumir as atividades.</div><h2 class="pgr-sub">3.2. Exame periódico</h2><div class="pgr-text">Anual (ou menor, a critério médico) para expostos a riscos classificados no PGR; a cada dois anos para os demais.</div><h2 class="pgr-sub">3.3. Exame de retorno ao trabalho</h2><div class="pgr-text">Após ausência igual ou superior a 30 dias por doença ou acidente.</div><h2 class="pgr-sub">3.4. Exame de mudança de risco ocupacional</h2><div class="pgr-text">Antes da mudança, adequando o controle médico aos novos riscos.</div><h2 class="pgr-sub">3.5. Exame demissional</h2><div class="pgr-text">Em até 10 dias do término do contrato, podendo ser dispensado se o exame clínico mais recente estiver dentro dos prazos da NR-7 conforme o grau de risco.</div><h2 class="pgr-sub">3.6. Exames complementares</h2><div class="pgr-text">Podem ser realizados outros exames complementares, a critério do médico responsável, desde que relacionados aos riscos ocupacionais classificados no PGR e tecnicamente justificados neste PCMSO.</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">4. Atestado de Saúde Ocupacional — ASO</h1><div class="pgr-text">${esc(T.aso)}</div><h1 class="pgr-title">5. Registro e documentações obrigatórias</h1><div class="pgr-text">${esc(T.registro)} O relatório analítico anual deve considerar, no mínimo, o número de exames clínicos e complementares; estatística de resultados anormais; incidência de doenças relacionadas ao trabalho; CAT; e análise comparativa com o período anterior.</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">6. Planejamento de exames médicos clínicos e complementares</h1><div class="pgr-text">O quadro abaixo é montado automaticamente a partir das funções e dos riscos cadastrados no PGR deste condomínio. Cada função corresponde a um grupo de exames clínicos e complementares, no padrão da NR-7.</div>`,
  );
  (plan.byFunc || []).forEach((f, ix) => {
    const riscos =
      (f.riscos || []).map((r) => `<tr><td>${esc(r.grupo || '—')}</td><td>${esc(r.perigo || '—')}</td><td>${esc(r.dano || '—')}</td></tr>`).join('') ||
      '<tr><td colspan="3">Exame clínico de base (NR-7), sem risco específico cadastrado nesta função.</td></tr>';
    const exames = (f.exames || [])
      .map((ex) => {
        const fl = examFlags(ex);
        const nome = ex.esocial ? `${ex.exame} (${ex.esocial})` : ex.exame;
        return `<tr><td>${esc(nome)}</td><td>${fl.a}</td><td>${esc(fl.meses)}</td><td>${esc(fl.p)}</td><td>${fl.d}</td></tr>`;
      })
      .join('');
    pages.push(
      `<h1 class="pgr-title">6.${ix + 1}. ${esc(f.funcao)}</h1><table class="pgr-table"><tr><th>Cargo / função</th><td>${esc(f.funcao)}</td><th>Quantidade</th><td>${esc(f.qtd || '—')}</td></tr><tr><th>Setor</th><td colspan="3">${esc(f.setor || '—')}</td></tr></table><h2 class="pgr-sub">Riscos importados do PGR</h2><table class="pgr-table compact"><thead><tr><th>Grupo</th><th>Agente</th><th>Possíveis agravos</th></tr></thead><tbody>${riscos}</tbody></table><h2 class="pgr-sub">Exames médicos clínicos e complementares</h2><table class="pgr-table compact"><thead><tr><th>Descrição do exame (cód. eSocial)</th><th>Admissional</th><th>Meses após admissional</th><th>Periódico</th><th>Demissional</th></tr></thead><tbody>${exames}</tbody></table>`,
    );
  });
  pages.push(`<h1 class="pgr-title">7. Disposições finais</h1><div class="pgr-text">${esc(T.final)}</div>`);
  pages.push(
    respBlock(ctx, e, {
      titulo: '8. Responsabilidade técnica',
      texto:
        'A produção técnica contida neste Programa de Controle Médico de Saúde Ocupacional (PCMSO), elaborado com base no PGR, é de responsabilidade do profissional competente abaixo especificado, sob supervisão da Futuro Facilite Treinamentos.',
      nome: med.nome || 'Médico do Trabalho',
      funcao: 'Médico responsável pelo PCMSO',
      reg: med.crm ? 'CRM ' + med.crm : '',
    }),
  );
  pages.push(
    `<h1 class="pgr-title">9. Anexos — eSocial e procedimentos diagnósticos</h1><div class="pgr-text">${esc(T.esocial)} As informações referentes aos exames médicos constam da tabela n.º 27 do Anexo I dos leiautes do eSocial (Procedimentos Diagnósticos), no portal esocial.gov.br.</div>`,
  );
  return doc(
    a,
    cover(a, e, { badge: 'PCMSO', title: 'Programa de<br>controle médico de<br>saúde ocupacional', respNome: med.nome, respFuncao: 'Médico responsável', regLabel: 'CRM', respReg: med.crm }),
    pages,
  );
}

// ---------------------------------------------------------------------------
// LTCAT
// ---------------------------------------------------------------------------

function parecerGhe(g: GheGroup, plan: LtcatPlan): { ag: LtcatAgente[]; ins: string; per: string; apo: string } {
  const nomes = (g.funcoes || []).map((f) => f.nome);
  const ag = (plan.agentes || []).filter((x) => x.ghe === g.ghe.nome || nomes.includes(x.ghe));
  const tem = ag.length > 0;
  const ins = tem
    ? 'Foram identificados agentes físicos, químicos ou biológicos no inventário. Sem medição que comprove ultrapassagem dos limites da NR-15, não se caracteriza adicional de insalubridade neste parecer qualitativo.'
    : 'Após análise dos cargos deste GHE, conclui-se que não há exposição ocupacional capaz de tornar o ambiente de trabalho insalubre. Os trabalhadores não fazem jus à percepção do adicional de insalubridade (NR-15).';
  const per = 'Conforme as avaliações deste GHE, não se constatam atividades ou operações perigosas da NR-16. Os colaboradores não fazem jus a adicional de periculosidade.';
  const apo = tem
    ? 'Há fator ambiental a registrar no PGR/PCMSO. Sem comprovação de exposição habitual e permanente acima dos critérios do Anexo IV do Decreto 3.048/99, não há enquadramento para aposentadoria especial.'
    : 'Os colaboradores deste GHE não possuem exposição a riscos ambientais capazes de gerar condições para aposentadoria especial, de acordo com o Anexo IV do Decreto 3.048/99.';
  return { ag, ins, per, apo };
}

const ENG_FUNCAO_DEFAULT = 'Engenheiro(a) de Segurança do Trabalho';

/** Função of the selected engenheiro (equipe), else the neutral default. */
function engFuncao(ctx: DocContext): string {
  const e = emp(ctx.project);
  const m = findEquipe(ctx, 'engenheiro', e.engId, e.engSeguranca);
  return (m?.funcao || '').trim() || ENG_FUNCAO_DEFAULT;
}

export function buildLTCAT(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const T = LTCAT_TEXTS;
  const plan = ltcatPlanFor(p);
  const eng = plan.eng;
  const funcEng = engFuncao(ctx);
  const ghes = groups(p);
  const insp = slimInspecao(latestInspection(ctx));
  const pages: string[] = [];
  pages.push(revTable(e, 'Documento-base, constatações por GHE e parecer técnico'));
  pages.push(`<h1 class="pgr-title">Apresentação</h1><div class="pgr-text">${esc(T.apresentacao)}</div>` + sumario(T.sumario));
  pages.push(`<h1 class="pgr-title">1. Introdução</h1><div class="pgr-text">${esc(T.intro)}</div><h1 class="pgr-title">2. Objetivos específicos</h1><div class="pgr-text">${esc(T.objetivos)}</div>`);
  pages.push(
    `<h1 class="pgr-title">3. Identificação do estabelecimento avaliado</h1>${identTable(e)}<h2 class="pgr-sub">3.1. Definição dos riscos ambientais</h2><div class="pgr-text">${esc(T.ambientais)} Agentes físicos (ruído, calor, umidade, radiações), químicos (poeiras, fumos, gases, vapores, produtos) e biológicos (microrganismos patogênicos). Riscos ergonômicos, de acidente e psicossociais permanecem no PGR, sem enquadramento automático no Anexo IV.</div>`,
  );
  pages.push(`<h1 class="pgr-title">4. Técnica empregada</h1><div class="pgr-text">${esc(T.tecnica)}</div><h2 class="pgr-sub">4.1. Análise qualitativa</h2><div class="pgr-text">${esc(PGR_TEXTS.qualitativa)}</div>${matrix()}`);
  pages.push(
    `<h1 class="pgr-title">5. Disposições legais</h1><h2 class="pgr-sub">5.1. Insalubridade</h2><div class="pgr-text">O exercício em condições de insalubridade assegura adicional sobre o salário mínimo da região: 40% (grau máximo), 20% (médio) ou 10% (mínimo). Incidindo mais de um fator, considera-se apenas o de grau mais elevado. A eliminação ou neutralização cessa o pagamento. Insalubridade e periculosidade não são cumulativos.</div><h2 class="pgr-sub">5.2. Periculosidade</h2><div class="pgr-text">Atividades e operações perigosas constam dos anexos da NR-16 (explosivos, inflamáveis, violência física em segurança patrimonial, energia elétrica, motocicleta, radiações ionizantes). O adicional é de 30% sobre o salário, sem acréscimos de gratificações.</div><h2 class="pgr-sub">5.3. Aposentadoria especial</h2><div class="pgr-text">A constatação serve exclusivamente para determinar direito ou não à aposentadoria especial (art. 58 da Lei 8.213/91 e Anexo IV do Decreto 3.048/99). O PPP é atualizado pelo evento S-2240 do eSocial.</div>`,
  );
  const sstNome = plan.sst?.nome || e.respSst || '—';
  const sstReg = plan.sst?.reg || e.regSst;
  pages.push(
    `<h1 class="pgr-title">6. Constatações durante a visita técnica</h1><div class="pgr-text">A abordagem dos riscos ambientais e das atividades perigosas foi realizada por Grupo Homogêneo de Exposição (GHE). Profissional legalmente habilitado: ${esc(eng.nome || 'Engenheiro de Segurança do Trabalho a selecionar no cadastro')}${eng.crea ? ' · CREA ' + esc(eng.crea) : ''}. Apoio SST: ${esc(sstNome)}${sstReg ? ' · Registro ' + esc(sstReg) : ''}.</div>${
      insp
        ? `<table class="pgr-table"><tr><th>Relatório SST</th><td>${esc(insp.numero || '—')}</td><th>Data da visita</th><td>${fmtH(insp.dataVisita)}</td></tr><tr><th>Técnico da inspeção</th><td colspan="3">${esc(insp.tecnico || '—')}</td></tr></table>${insp.conclusao ? `<div class="pgr-text">${esc(insp.conclusao)}</div>` : ''}`
        : `<div class="pgr-text">A visita técnica ainda não foi registrada. As constatações por GHE usam o inventário cadastrado; o registro fotográfico e as não conformidades entram após a inspeção SST.</div>`
    }`,
  );
  const resumo: string[] = [];
  ghes.forEach((g, ix) => {
    const par = parecerGhe(g, plan);
    pages.push(gheIdent(p, g, ix, '6.' + (ix + 1)));
    const agRows = par.ag.length
      ? par.ag.map((x) => `<tr><td>${esc(grupoLetra(x.grupo))}</td><td>${esc(x.agente)}</td><td>${esc(x.fonte)}</td><td>Qualitativa</td><td>${esc(x.controles)}</td></tr>`).join('')
      : '<tr><td>F/Q/B</td><td>Ausência de fator de risco ambiental enquadrável</td><td>—</td><td>Qualitativa</td><td>—</td></tr>';
    pages.push(
      `<h1 class="pgr-title">6.${ix + 1}. Análise da exposição — ${esc(g.ghe.nome)}</h1><h2 class="pgr-sub">Agentes nocivos físicos, químicos e biológicos</h2><table class="pgr-table compact"><thead><tr><th></th><th>Agente</th><th>Fonte geradora</th><th>Técnica</th><th>Medidas de controle</th></tr></thead><tbody>${agRows}</tbody></table><h2 class="pgr-sub">Parecer técnico conclusivo</h2><table class="pgr-table compact"><thead><tr><th>Fator de direito</th><th>Conclusão</th></tr></thead><tbody><tr><td>Insalubridade</td><td>${esc(par.ins)}</td></tr><tr><td>Periculosidade</td><td>${esc(par.per)}</td></tr><tr><td>Aposentadoria especial</td><td>${esc(par.apo)}</td></tr></tbody></table>`,
    );
    const cargos =
      (g.funcoes || [])
        .map((f) => f.nome)
        .join(', ') ||
      g.ghe.funcoes ||
      '—';
    resumo.push(
      `<tr><td>${esc(g.ghe.nome)}</td><td>${esc(cargos)}</td><td>Insalubridade</td><td>Não faz jus à percepção do adicional de insalubridade.</td></tr><tr><td></td><td></td><td>Periculosidade</td><td>Não faz jus à percepção do adicional de periculosidade.</td></tr><tr><td></td><td></td><td>Aposentadoria especial (09.01.001)</td><td>Não faz jus ao direito de aposentadoria especial neste parecer qualitativo.</td></tr>`,
    );
  });
  pages.push(
    `<h1 class="pgr-title">7. Resumo do parecer técnico</h1><table class="pgr-table compact"><thead><tr><th>GHE</th><th>Cargo / função</th><th>Direito</th><th>Conclusão</th></tr></thead><tbody>${resumo.join('')}</tbody></table><div class="pgr-text" style="margin-top:3mm">${esc(plan.conclusao || T.final)}</div>`,
  );
  fotoPages(insp, '8. Registro fotográfico do estabelecimento', 'O registro fotográfico documenta as condições observadas na visita técnica, no mesmo padrão dos laudos da Futuro Facilite Treinamentos.').forEach((c) => pages.push(c));
  pages.push(
    respBlock(ctx, e, {
      titulo: '9. Responsabilidade técnica',
      texto:
        'A produção técnica contida neste Laudo Técnico das Condições Ambientais do Trabalho (LTCAT), elaborado com base no levantamento de dados da visita técnica e no inventário do PGR, é de responsabilidade do engenheiro de segurança do trabalho abaixo especificado, sob supervisão da Futuro Facilite Treinamentos.',
      nome: eng.nome || 'Engenheiro de Segurança do Trabalho',
      funcao: funcEng + ' — PLH do LTCAT',
      reg: eng.crea ? 'CREA ' + eng.crea : '',
    }),
  );
  pages.push(
    `<h1 class="pgr-title">Anexo — eSocial</h1><div class="pgr-text">Os agentes nocivos e atividades para aposentadoria especial constam da tabela n.º 24 do Anexo I dos leiautes do eSocial. O financiamento da aposentadoria especial e a redução do tempo de contribuição constam da tabela n.º 02. Consulte o portal esocial.gov.br nas versões vigentes.</div>`,
  );
  return doc(
    a,
    cover(a, e, { badge: 'LTCAT', title: 'Laudo técnico das<br>condições ambientais<br>do trabalho', respNome: eng.nome, respFuncao: funcEng, regLabel: 'CREA', respReg: eng.crea }),
    pages,
  );
}

// ---------------------------------------------------------------------------
// NR-1 / DRPS
// ---------------------------------------------------------------------------

export function buildNR1(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const T = NR1_TEXTS;
  const d = scoreDrps(ctx.drps || []);
  const topics = drpsTopics(d);
  const nResp = d.n || 0;
  const setores = drpsSetores(d);
  const rows = drpsRows(topics, nResp);
  const fontes = topics
    .map((t) => {
      const cls = t.gravidadeN >= 3 ? ' class="alta"' : '';
      return `<tr${cls}><td>${esc(t.nome)}</td><td>${nResp ? esc(t.gravidade || '—') : 'A avaliar'}</td><td>${esc(t.fonte || '')}</td></tr>`;
    })
    .join('');
  const pages: string[] = [];
  pages.push(revTable(e, 'Diagnóstico coletivo de riscos psicossociais (DRPS / NR-1)'));
  pages.push(`<h1 class="pgr-title">Apresentação</h1><div class="pgr-text">${esc(T.apresentacao)}</div>` + sumario(T.sumario));
  pages.push(
    `<h1 class="pgr-title">1. Identificação da organização</h1>${identTable(e)}<h2 class="pgr-sub">Responsável técnico</h2><table class="pgr-table"><tr><th>SST</th><td>${esc(e.respSst || '—')}${e.regSst ? ' · MTE ' + esc(e.regSst) : ''}</td></tr></table>`,
  );
  pages.push(
    `<h1 class="pgr-title">2. Objetivo e fundamento legal</h1><div class="pgr-text">${esc(T.objetivo)}</div><h1 class="pgr-title">3. Metodologia do DRPS</h1><div class="pgr-text">${esc(T.metodo)}</div><div class="pgr-kpi"><span><b>${nResp}</b> resposta(s) coletiva(s)</span><span><b>${(d.altos || []).length}</b> tópico(s) em gravidade alta</span><span>Setores: ${setores}</span></div><div class="pgr-text">${
      nResp ? 'O diagnóstico abaixo consolida as respostas já registradas neste condomínio.' : 'O DRPS ainda não foi aplicado neste condomínio. As tabelas permanecem abertas até a coleta das respostas dos trabalhadores.'
    }</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">4. Resultado coletivo por tópico</h1><table class="pgr-table compact"><thead><tr><th>Tópico / fator psicossocial</th><th>Média (1–3)</th><th>Gravidade</th></tr></thead><tbody>${rows}</tbody></table><div class="pgr-text" style="margin-top:3mm">${DRPS_ESCALA}</div>`,
  );
  pages.push(
    `<h1 class="pgr-title">5. Fontes geradoras e agravos</h1><table class="pgr-table compact"><thead><tr><th>Tópico</th><th>Gravidade</th><th>Fonte geradora (circunstâncias)</th></tr></thead><tbody>${fontes}</tbody></table><div class="pgr-text" style="margin-top:3mm"><b>Possíveis agravos:</b> ${esc(topics[0]?.agravo || AGRAVO_FALLBACK)}</div>`,
  );
  pages.push(`<h1 class="pgr-title">6. Medidas organizacionais e integração com o PGR</h1><div class="pgr-text">${esc(T.medidas)}</div><div class="pgr-text">${esc(T.confidencial)}</div><div class="pgr-text">${esc(T.final)}</div>`);
  pages.push(
    respBlock(ctx, e, {
      titulo: '7. Responsabilidade técnica',
      texto:
        'A produção técnica contida neste diagnóstico de riscos psicossociais relacionados ao trabalho (NR-1 / DRPS), elaborado com base no cadastro da organização e nas respostas coletivas dos trabalhadores, é de responsabilidade do profissional competente abaixo especificado, sob supervisão da Futuro Facilite Treinamentos.',
      nome: e.respSst,
      funcao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho',
      reg: e.regSst ? 'Registro ' + e.regSst : '',
    }),
  );
  return doc(
    a,
    cover(a, e, {
      badge: 'NR-1',
      title: 'Diagnóstico de<br>riscos psicossociais<br>relacionados ao trabalho',
      respNome: e.respSst,
      respFuncao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho',
      regLabel: 'MTE',
      respReg: e.regSst,
    }),
    pages,
  );
}

// ---------------------------------------------------------------------------
// Relatório de inspeção SST
// ---------------------------------------------------------------------------

export function buildInspecao(ctx: DocContext, d: LegacyInspection): string {
  const a = assets(ctx);
  const e: LegacyEmpresa = {
    razaoSocial: d.condominio || '',
    nomeFantasia: d.condominio || '',
    cnpj: d.cnpj || '',
    endereco: d.endereco || '',
    responsavelEmpresa: d.sindica || '',
    contatoEmpresa: d.telefone || '',
    emailEmpresa: d.emailCondominio || '',
    dataElaboracao: d.dataVisita || '',
    numTrabalhadores: d.totalEmpregados || '0',
    atividadeEmpresa: d.objetivo || '',
  };
  const items = checklistValues(d);
  const c = items.filter((i) => i.status === 'Conforme').length;
  const nc = items.filter((i) => i.status === 'Não conforme').length;
  const na = items.filter((i) => i.status === 'Não se aplica').length;
  const pend = items.length - c - nc - na;
  const pct = c + nc > 0 ? Math.round((c / (c + nc)) * 100) : 0;
  const ncs = items.filter((i) => i.status === 'Não conforme');
  const pages: string[] = [];
  pages.push(
    `<h1 class="pgr-title">1. Identificação e resumo executivo</h1><table class="pgr-table"><tr><th>Condomínio</th><td colspan="3">${esc(d.condominio || '—')}</td></tr><tr><th>CNPJ</th><td>${esc(d.cnpj || '—')}</td><th>Relatório</th><td>${esc(d.numero || '—')}</td></tr><tr><th>Endereço</th><td colspan="3">${esc(d.endereco || '—')}</td></tr><tr><th>Síndico / responsável</th><td>${esc(d.sindica || '—')}</td><th>Data da inspeção</th><td>${fmtH(d.dataVisita)}</td></tr><tr><th>Técnico responsável</th><td colspan="3">${esc(d.tecnico || d.assinaturaTecnico || '—')}</td></tr><tr><th>Contato</th><td colspan="3">${esc(d.telefone || '—')}${d.emailCondominio ? ' · ' + esc(d.emailCondominio) : ''}</td></tr><tr><th>Colaboradores</th><td colspan="3">Total ${esc(d.totalEmpregados || '0')} · Próprios ${esc(d.proprios || '0')} · Terceirizados ${esc(d.terceirizados || '0')}</td></tr></table><h2 class="pgr-sub">Resumo da avaliação</h2><div class="pgr-kpi"><span><b>${c}</b> conformes</span><span><b>${nc}</b> não conformes</span><span><b>${na}</b> não se aplica</span><span><b>${pend}</b> pendentes</span><span><b>${pct}%</b> conformidade</span></div><h2 class="pgr-sub">Objetivo</h2><div class="pgr-text">${esc(d.objetivo || '—')}</div><h2 class="pgr-sub">Funções e jornadas</h2><div class="pgr-text"><b>Funções:</b> ${esc(d.funcoes || '—')}<br><b>Jornadas:</b> ${esc(d.jornadas || '—')}</div>`,
  );
  const chunks: LegacyChecklistItem[][] = [];
  for (let i = 0; i < items.length; i += 16) chunks.push(items.slice(i, i + 16));
  if (!chunks.length) chunks.push([]);
  chunks.forEach((ch, ix) => {
    pages.push(
      `<h1 class="pgr-title">2. Checklist geral ${chunks.length > 1 ? `(${ix + 1}/${chunks.length})` : ''}</h1><table class="pgr-table compact"><thead><tr><th>Nº</th><th>Item avaliado</th><th>Situação</th><th>Risco</th><th>Prazo</th></tr></thead><tbody>${
        ch.map((it, j) => `<tr><td>${ix * 16 + j + 1}</td><td>${esc(it.titulo)}</td><td>${esc(it.status || 'Pendente')}</td><td>${esc(it.risco || '—')}</td><td>${fmtH(it.prazo)}</td></tr>`).join('') ||
        '<tr><td colspan="5">Nenhum item avaliado.</td></tr>'
      }</tbody></table>`,
    );
  });
  if (!ncs.length) pages.push(`<h1 class="pgr-title">3. Não conformidades</h1><div class="pgr-text">Não foram registradas não conformidades nos itens avaliados.</div>`);
  ncs.forEach((it, idx) => {
    const photos = it.photos || [];
    const first = photos.slice(0, 2);
    pages.push(
      `<h1 class="pgr-title">3.${idx + 1}. ${esc(it.titulo)}</h1><table class="pgr-table"><tr><th>Situação</th><td>Não conforme</td><th>Risco</th><td>${esc(it.risco || '—')}</td></tr><tr><th>Prazo</th><td>${fmtH(it.prazo)}</td><th>Responsável</th><td>${esc(it.responsavel || 'Administração do condomínio')}</td></tr></table><h2 class="pgr-sub">Observação técnica</h2><div class="pgr-text">${esc(it.obs || 'Não informada')}</div><h2 class="pgr-sub">Medida recomendada</h2><div class="pgr-text">${esc(it.acao || 'Não informada')}</div>${
        first.length ? `<div class="pgr-foto-grid" style="margin-top:3mm">${first.map((src) => `<div class="pgr-foto-card"><img src="${esc(src)}" alt=""></div>`).join('')}</div>` : ''
      }`,
    );
    for (let x = 2; x < photos.length; x += 4) {
      const pp = photos.slice(x, x + 4);
      pages.push(
        `<h1 class="pgr-title">3.${idx + 1}. Registro complementar</h1><div class="pgr-foto-grid">${pp.map((src, n) => `<div class="pgr-foto-card"><img src="${esc(src)}" alt=""><b>${esc(it.titulo)} — foto ${x + n + 1}</b></div>`).join('')}</div>`,
      );
    }
  });
  const allPhotos: { src: string; title: string; n: number; status: string }[] = [];
  items.forEach((it) => (it.photos || []).forEach((src, n) => allPhotos.push({ src, title: it.titulo || '', n: n + 1, status: it.status || '' })));
  if (d.fotoCapa) allPhotos.unshift({ src: d.fotoCapa, title: 'Capa da visita', n: 1, status: '' });
  for (let i = 0; i < allPhotos.length; i += 4) {
    const ch = allPhotos.slice(i, i + 4);
    pages.push(
      `<h1 class="pgr-title">4. Registro fotográfico ${allPhotos.length > 4 ? `(${Math.floor(i / 4) + 1})` : ''}</h1><div class="pgr-foto-grid">${ch.map((f) => `<div class="pgr-foto-card"><img src="${esc(f.src)}" alt=""><b>${esc(f.title)}</b><span>${esc(f.status || '')}</span></div>`).join('')}</div>`,
    );
  }
  if (!allPhotos.length) pages.push(`<h1 class="pgr-title">4. Registro fotográfico</h1><div class="pgr-text">Nenhuma foto foi anexada nesta inspeção.</div>`);
  const acoes: LegacyChecklistItem[][] = [];
  for (let i = 0; i < ncs.length; i += 10) acoes.push(ncs.slice(i, i + 10));
  if (!acoes.length) acoes.push([]);
  acoes.forEach((ch, ix) => {
    pages.push(
      `<h1 class="pgr-title">5. Plano de ação ${acoes.length > 1 ? `(${ix + 1}/${acoes.length})` : ''}</h1>${
        ch.length
          ? `<table class="pgr-table compact"><thead><tr><th>Não conformidade</th><th>Risco</th><th>Medida corretiva</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${ch
              .map(
                (it) =>
                  `<tr><td>${esc(it.titulo)}</td><td>${esc(it.risco || '—')}</td><td>${esc(it.acao || '—')}</td><td>${esc(it.responsavel || 'Administração do condomínio')}</td><td>${fmtH(it.prazo)}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : `<div class="pgr-text">Não há ações corretivas registradas.</div>`
      }`,
    );
  });
  pages.push(
    `<h1 class="pgr-title">6. Conclusão técnica e ciência</h1><h2 class="pgr-sub">Conclusão</h2><div class="pgr-text">${esc(d.conclusao || 'Não informada')}</div><h2 class="pgr-sub">Recomendações gerais</h2><div class="pgr-text">${esc(d.recomendacoes || 'Não informadas')}</div><div class="pgr-text">Este relatório registra as condições observadas na data da inspeção. As recomendações devem ser analisadas e implementadas conforme a prioridade dos riscos e a legislação aplicável.</div><div class="sign-grid"><div class="sign">${esc(d.assinaturaSindica || d.sindica || 'Responsável pelo condomínio')}<br>Responsável pelo condomínio</div><div class="sign">${esc(d.assinaturaTecnico || d.tecnico || 'Responsável pela inspeção')}<br>Responsável pela inspeção</div></div>`,
  );
  return doc(
    a,
    cover(a, e, {
      badge: 'SST',
      title: 'Relatório de<br>inspeção de segurança<br>do trabalho',
      respNome: d.tecnico || d.assinaturaTecnico,
      respFuncao: 'Técnico responsável pela inspeção',
      regLabel: 'Relatório',
      respReg: d.numero,
    }),
    pages,
  );
}

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
    card(
      'ltcat',
      'LTCAT',
      cadastro && !!p.empresa?.engSeguranca,
      cadastro
        ? p.empresa?.engSeguranca
          ? insp
            ? 'Inventário, visita técnica e registro fotográfico da inspeção'
            : 'Inventário do PGR — fotos entram após a inspeção'
          : 'Selecione o engenheiro no cadastro do condomínio'
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
  if (id === 'ltcat' && !e.engSeguranca) return 'Selecione o Engenheiro de Segurança no cadastro do condomínio.';
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
  const okEng = !!eng.nome;
  const notice =
    (okEng ? `Responsável técnico: ${eng.nome}${eng.crea ? ' · CREA ' + eng.crea : ''}.` : 'Selecione o engenheiro no cadastro do condomínio (seta em Engenheiro de Segurança).') +
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
