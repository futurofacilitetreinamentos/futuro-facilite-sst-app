// Shared helpers and sections of the document builders (PGR, PCMSO, LTCAT,
// NR-1, inspeção). Pure functions: everything comes from the DocContext.
// Layout model (sections, headings, sumário, page-break hooks): layout.ts.
import type { DocContext, LegacyChecklistItem, LegacyEmpresa, LegacyEquipe, LegacyInspection, LegacyProject } from './types';
import { esc, fmtH } from './html';
import { dataExtenso, grupoLetra, mesAnoCapa, PGR_TEXTS } from './evolue';
import type { GheGroup } from './evolue';
import { gr, grNome, GR_MATRIX, pd, te } from './risk';
import { emptyTopics } from './drps';
import type { DrpsBundle, DrpsTopicResult } from './drps';
import { caption, DocBuilder } from './layout';

/** Empty table cell / missing value (reference uses '-', not '—'). */
export const DASH = '-';

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

export interface Assets {
  logo: string;
  capa: string;
  base: string;
}

export function assets(ctx: DocContext): Assets {
  const base = ctx.assetsBase || '';
  return { logo: base + 'logo.jpeg', capa: base + 'capa-pgr.jpg', base };
}

/** Optional fields added by phase B (contract.md); read defensively until types.ts has them. */
export type EmpresaExt = LegacyEmpresa & { cidadeUf?: string; cep?: string };

export function emp(p: LegacyProject): EmpresaExt {
  return p.empresa || {};
}

/** "Cidade-UF" of the date line; fallback Brasília-DF. */
export function cidadeUf(e: EmpresaExt): string {
  return (e.cidadeUf || '').trim() || 'Brasília-DF';
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

export interface SlimNc {
  titulo: string;
  obs: string;
  acao: string;
  risco: string;
  prazo: string;
  responsavel: string;
}

export interface SlimPhoto {
  titulo: string;
  src: string;
  obs?: string;
}

export interface SlimInspecao {
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
export function slimInspecao(d: LegacyInspection | null): SlimInspecao | null {
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

export function findEquipe(ctx: DocContext, tipo: string, id?: string, nome?: string): LegacyEquipe | undefined {
  const list = ctx.equipe || [];
  return (id ? list.find((x) => x.id === id) : undefined) || (nome ? list.find((x) => x.tipo === tipo && x.nome === nome) : undefined);
}

// ---------------------------------------------------------------------------
// Cover (unchanged look) and pre-text pages
// ---------------------------------------------------------------------------

export interface CoverOpts {
  badge: string;
  /** Trusted HTML (constant titles with <br>). */
  title?: string;
  respNome?: string;
  respFuncao?: string;
  regLabel?: string;
  respReg?: string;
}

/** Full-page cover (named page `capa`: no margins, no letterhead). */
export function cover(a: Assets, e: LegacyEmpresa, { badge, title, respNome, respFuncao, regLabel, respReg }: CoverOpts): string {
  const rebadge = badge && badge !== 'PGR';
  return `<section class="pg-capa pgr-cover pgr-cover-ff"><img class="pgr-cover-bg" src="${esc(a.capa)}" alt=""><div class="pgr-cover-overlay">${rebadge ? `<div class="pgr-cover-mask"></div><div class="pgr-cover-rebadge">${esc(badge)}</div><div class="pgr-cover-retitle">${title || ''}</div>` : ''}<div class="pgr-cover-id"><h2>${esc(e.razaoSocial || '—')}</h2><p><b>RESPONSÁVEL TÉCNICO:</b> ${esc((respNome || '—').toUpperCase())}</p><p>${esc((respFuncao || '—').toUpperCase())}</p><p><b>${esc(regLabel || 'MTE')}:</b> ${esc(respReg || '—')}</p><p><b>DATA DE ELABORAÇÃO:</b> ${esc(mesAnoCapa(e.dataElaboracao))}</p></div></div></section>`;
}

/** Controle de revisões (pre-text page, no heading): intro, caption, 10-row table. */
export function revisoesSection(d: DocBuilder, e: LegacyEmpresa, itens: string, intro: string = PGR_TEXTS.revisoes): void {
  const blank = Array.from({ length: 9 }, () => '<tr><td></td><td></td><td></td></tr>').join('');
  d.section(
    `<p class="pgr-text">${esc(intro || 'O controle de revisões registra as alterações do documento ao longo da vigência.')}</p>${caption('Controle de Revisões')}<table class="pgr-table pg-rev"><colgroup><col style="width:17%"><col style="width:18%"><col style="width:65%"></colgroup><thead><tr><th>Revisão nº</th><th>Data</th><th>Itens Revisados</th></tr></thead><tbody><tr><td>001</td><td>${fmtH(e.dataElaboracao)}</td><td>${esc(itens || 'Documento-Base e Anexos')}</td></tr>${blank}</tbody></table>`,
    { pretexto: true },
  );
}

export interface RevisaoRow {
  numero: string;
  /** ISO date */
  data: string;
  itens: string;
}

/**
 * Revision rows of one document from project.revisoes (filtered by `documento`,
 * sorted by número). None registered → a single row 001 / dataElaboracao / `itens`.
 */
export function revisoesDoc(p: LegacyProject, documento: string, itens = 'Documento-Base e Anexos'): RevisaoRow[] {
  const doc = documento.toLowerCase();
  const rows = (p.revisoes || [])
    .filter((r) => String(r.documento || '').toLowerCase() === doc)
    .map((r) => ({ numero: String(r.numero || '').trim(), data: r.data || '', itens: r.itens || '' }))
    .sort((a, b) => a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true }) || a.data.localeCompare(b.data));
  return rows.length ? rows : [{ numero: '001', data: p.empresa?.dataElaboracao || '', itens }];
}

/** Controle de revisões from explicit rows (pre-text page, no heading): intro, caption, ≥ 10-row table. */
export function revisoesTableSection(d: DocBuilder, rows: readonly RevisaoRow[], intro: string): void {
  const filled = rows.map((r) => `<tr><td>${esc(r.numero || DASH)}</td><td>${fmtH(r.data)}</td><td>${esc(r.itens || DASH)}</td></tr>`).join('');
  const blank = Array.from({ length: Math.max(0, 10 - rows.length) }, () => '<tr><td></td><td></td><td></td></tr>').join('');
  d.section(
    `<p class="pgr-text">${esc(intro)}</p>${caption('Controle de Revisões')}<table class="pgr-table pg-rev"><colgroup><col style="width:17%"><col style="width:18%"><col style="width:65%"></colgroup><thead><tr><th>Revisão nº</th><th>Data</th><th>Itens Revisados</th></tr></thead><tbody>${filled}${blank}</tbody></table>`,
    { pretexto: true },
  );
}

/** APRESENTAÇÃO alone on a pre-text page (rules under the title and after the paragraph). */
export function apresentacaoSection(d: DocBuilder, text: string): void {
  d.section(`${d.title('Apresentação')}<p class="pgr-text">${esc(text)}</p>`, { pretexto: true, cls: 'pg-apresentacao' });
}

/** SUMÁRIO alone (may run over 2 pages). `numbered`: shows "Página | N" (LTCAT reference). */
export function sumarioSection(d: DocBuilder, numbered = false): void {
  d.section(d.sumario(), { pretexto: !numbered, cls: 'pg-sumario' });
}

// ---------------------------------------------------------------------------
// Tables shared by several documents
// ---------------------------------------------------------------------------

export function identTable(e: LegacyEmpresa): string {
  return `<table class="pgr-table"><tbody><tr><th>Razão social</th><td colspan="3">${esc(e.razaoSocial || DASH)}</td></tr><tr><th>Nome fantasia</th><td>${esc(e.nomeFantasia || DASH)}</td><th>CNPJ</th><td>${esc(e.cnpj || DASH)}</td></tr><tr><th>CNAE</th><td>${esc(e.cnae || DASH)}</td><th>Grau de risco</th><td>${esc(e.grauRisco || DASH)}</td></tr><tr><th>Trabalhadores</th><td>${esc(e.numTrabalhadores || '0')}</td><th>Responsável</th><td>${esc(e.responsavelEmpresa || DASH)}</td></tr><tr><th>Telefone</th><td>${esc(e.contatoEmpresa || DASH)}</td><th>E-mail</th><td>${esc(e.emailEmpresa || DASH)}</td></tr><tr><th>Logradouro</th><td colspan="3">${esc(e.endereco || DASH)}</td></tr><tr><th>Atividade</th><td colspan="3">${esc(e.atividadeEmpresa || DASH)}</td></tr></tbody></table>`;
}

// ---------------------------------------------------------------------------
// Responsabilidade técnica
// ---------------------------------------------------------------------------

export interface Signer {
  /** Bold lead label, e.g. "Responsável Técnico:" ('' = none). */
  label?: string;
  nome?: string;
  funcao?: string;
  /** e.g. "Nº do registro MTE:" */
  regLabel?: string;
  reg?: string;
}

export interface RespOpts {
  num: string;
  titulo: string;
  texto: string;
  signers: Signer[];
}

function signerBlock(s: Signer): string {
  const nome = `${s.label ? `<b>${esc(s.label)}</b> ` : ''}${esc(s.nome || DASH)}`;
  const reg = s.reg ? `<br>${s.regLabel ? `<b>${esc(s.regLabel)}</b> ` : ''}${esc(s.reg)}` : '';
  return `<div class="pg-sign-block">${nome}${s.funcao ? '<br>' + esc(s.funcao) : ''}${reg}</div>`;
}

/** Heading, 2 paragraphs (razão social bold uppercase), right-aligned "Cidade-UF, data.", centred signer blocks. */
export function respBlock(ctx: DocContext, d: DocBuilder, e: EmpresaExt, { num, titulo, texto, signers }: RespOpts): string {
  const razao = (e.razaoSocial || 'a organização').toUpperCase();
  return `${d.h1(num, titulo)}<p class="pgr-text">${esc(texto)}</p><p class="pgr-text">A implementação e o desenvolvimento deste documento são de responsabilidade de <b>${esc(razao)}</b>, que deve disponibilizar os recursos necessários e atender às solicitações das autoridades competentes.</p><p class="pg-date">${esc(cidadeUf(e))}, ${esc(dataExtenso(e.dataElaboracao, ctx.today))}.</p><div class="pg-sign-grid">${signers.map(signerBlock).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// Risk methodology (GR matrix, legend)
// ---------------------------------------------------------------------------

const GR_CLS: Record<string, string> = { T: 'gr-T', M: 'gr-M', S: 'gr-S', IT: 'gr-IT' };

export function legend(d: DocBuilder): string {
  return `${d.sub('Legenda')}<table class="pgr-table compact pg-center"><thead><tr><th>Grupo</th><th>TE</th><th>PD</th><th>GR</th></tr></thead><tbody><tr><td>F Físico · Q Químico · B Biológico · E Ergonômico · A Acidente</td><td>E Eventual · I Intermitente · P Permanente</td><td>B Baixo · M Médio · A Alto · C Crítico</td><td>T Tolerável · M Moderado · S Substancial · IT Intolerável</td></tr></tbody></table>`;
}

/** Coloured Quadro 1 (SEVERIDADE × FREQUÊNCIA, from GR_MATRIX) + actions table. */
export function matrix(): string {
  const sevs: [string, string][] = [
    ['B', 'Baixo'],
    ['M', 'Médio'],
    ['A', 'Alto'],
    ['C', 'Crítico'],
  ];
  const freqs = ['P', 'I', 'E'] as const;
  const rows = sevs
    .map(([k, label], i) => {
      const cells = freqs
        .map((f) => {
          const code = GR_MATRIX[k as keyof typeof GR_MATRIX][f];
          return `<td class="${GR_CLS[code] || ''}">${esc(grNome(code))}</td>`;
        })
        .join('');
      return `<tr>${i === 0 ? '<th class="pg-vert" rowspan="4"><span>SEVERIDADE</span></th>' : ''}<th>${label}</th>${cells}</tr>`;
    })
    .join('');
  return `<p class="pgr-text">Tempo de exposição: Eventual (menos de 30 minutos da jornada); Intermitente (30 minutos a 6 horas); Permanente (mais de 6 horas). Potencial de dano: Baixo, Médio, Alto ou Crítico.</p>${caption('Matriz para determinação da Graduação de Risco', 'Quadro 1:')}<table class="pgr-table pg-matrix pg-norepeat"><thead><tr><td class="pg-corner" colspan="2" rowspan="2"></td><th colspan="3">FREQUÊNCIA</th></tr><tr><th>Permanente</th><th>Intermitente</th><th>Eventual</th></tr></thead><tbody>${rows}</tbody></table>${caption('Determinação de ações corretivas/preventivas necessárias')}<table class="pgr-table compact"><thead><tr><th style="width:22%">Graduação de Risco</th><th>Ações Necessárias</th></tr></thead><tbody><tr><td class="gr-T">Tolerável</td><td>Não é necessária a adoção de novas medidas.</td></tr><tr><td class="gr-M">Moderado</td><td>Reavaliar os meios de controle e, quando necessário, adotar medidas complementares.</td></tr><tr><td class="gr-S">Substancial</td><td>Implantar novas medidas de controle ou corrigir falhas nas existentes.</td></tr><tr><td class="gr-IT">Intolerável</td><td>Implantar novas medidas, adotando ação de caráter imediato.</td></tr></tbody></table>`;
}

// ---------------------------------------------------------------------------
// GHE blocks (PGR / LTCAT)
// ---------------------------------------------------------------------------

export interface GheRow {
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

export const AUSENCIA = 'Ausência de fator de risco';

export function gheRows(g: GheGroup): GheRow[] {
  const letters = ['F', 'Q', 'B', 'E', 'A'];
  const rows: GheRow[] = [];
  const toRow = (L: string, r: GheGroup['riscos'][number]): GheRow => ({
    L,
    perigo: r.perigo || DASH,
    fonte: r.fonte || DASH,
    te: te(r.prob),
    pd: pd(r.sev),
    gr: gr(r.prob, r.sev),
    controles: r.controles || DASH,
    acao: r.acao || DASH,
    dano: r.dano || DASH,
  });
  letters.forEach((L) => {
    const rs = (g.riscos || []).filter((r) => grupoLetra(r.grupo) === L);
    if (!rs.length) rows.push({ L, perigo: AUSENCIA, fonte: DASH, te: DASH, pd: DASH, gr: DASH, controles: DASH, acao: DASH, dano: DASH });
    else rs.forEach((r) => rows.push(toRow(L, r)));
  });
  (g.riscos || []).filter((r) => grupoLetra(r.grupo) === 'P').forEach((r) => rows.push(toRow('P', r)));
  return rows;
}

export function gheAmbiente(p: LegacyProject, g: GheGroup): string {
  const s = (p.setores || []).find((x) => x.nome === g.ghe.setor);
  return s ? `${s.ambiente || ''}${s.descricao ? ' — ' + s.descricao : ''}`.trim() : g.ghe.setor || 'Ambientes do condomínio';
}

/** GHE identification block. `level` 3 in the PGR (7.1.n), 2 in the LTCAT (6.n). */
export function gheIdent(d: DocBuilder, p: LegacyProject, g: GheGroup, ix: number, num: string, level: 2 | 3): string {
  const fn =
    (g.funcoes || []).map((f) => `<tr><td>${esc(f.nome)}</td><td>${esc(f.quantidade || DASH)} trabalhador(es)</td><td>${esc(f.cbo || DASH)}</td></tr>`).join('') ||
    `<tr><td>${esc(g.ghe.funcoes || DASH)}</td><td>${DASH}</td><td>${DASH}</td></tr>`;
  const atv = (g.funcoes || []).map((f) => `<p><b>${esc(String(f.nome || '').toUpperCase())}:</b> ${esc(f.atividades || DASH)}</p>`).join('') || `<p>${esc(g.ghe.descricao || DASH)}</p>`;
  const tipo =
    g.ghe.descricao ||
    (g.funcoes || [])
      .map((f) => f.atividades)
      .filter(Boolean)
      .join(' ') ||
    'Atividades do condomínio';
  return `${d.h(level, num, g.ghe.nome || 'GHE ' + (ix + 1))}<table class="pgr-table"><colgroup><col style="width:30%"><col style="width:45%"><col style="width:25%"></colgroup><tbody><tr><th>Tipo de Atividade</th><td colspan="2">${esc(tipo)}</td></tr><tr><th>Descrição do ambiente</th><td colspan="2">${esc(gheAmbiente(p, g))}</td></tr><tr><td class="pg-band" colspan="3">Identificação das funções</td></tr><tr><th>Cargo / Função</th><th>Quantidade</th><th>CBO</th></tr>${fn}<tr><td class="pg-band" colspan="3">Descrição das atividades</td></tr><tr><td colspan="3" class="pgr-text">${atv}</td></tr></tbody></table>`;
}

/** GHE inventory (landscape section in the PGR). */
export function gheInventario(d: DocBuilder, g: GheGroup): string {
  const rows = gheRows(g);
  const inv = rows
    .map((r) => `<tr><td>${esc(r.L)}</td><td>${esc(r.perigo)}</td><td>${esc(r.fonte)}</td><td>${esc(r.te)}</td><td>${esc(r.pd)}</td><td>${esc(r.gr)}</td><td>${esc(r.controles)}</td><td>${esc(r.acao)}</td></tr>`)
    .join('');
  const dano =
    rows
      .filter((r) => r.perigo !== AUSENCIA)
      .map((r) => `<tr><td>${esc(r.L)}</td><td>${esc(r.perigo)}</td><td>${esc(r.dano)}</td></tr>`)
      .join('') || '<tr><td colspan="3">Sem agravos cadastrados neste GHE.</td></tr>';
  return `${d.sub('Inventário de Riscos e Perigos — ' + (g.ghe.nome || ''))}<table class="pgr-table compact pg-center"><colgroup><col style="width:5%"><col style="width:18%"><col style="width:15%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:22%"><col style="width:28%"></colgroup><thead><tr><th>Riscos</th><th>Fator de exposição</th><th>Fonte Geradora</th><th>TE</th><th>PD</th><th>GR</th><th>Controles existentes</th><th>Propostas</th></tr></thead><tbody>${inv}</tbody></table>${legend(d)}${d.sub('Indicativos de possível comprometimento à saúde')}<table class="pgr-table compact pg-center"><colgroup><col style="width:5%"><col style="width:30%"><col style="width:65%"></colgroup><thead><tr><th>Riscos</th><th>Agente</th><th>Possíveis danos à saúde</th></tr></thead><tbody>${dano}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// EPI
// ---------------------------------------------------------------------------

export interface EpiItem {
  id: string;
  nome: string;
  uso: string;
  /** Path relative to assetsBase. */
  img: string;
  re: RegExp;
  /** Descrição técnica / especificação (PGR 9.1 / 9.2). */
  spec?: string;
}

export const EPI_ITENS: readonly EpiItem[] = [
  { id: 'luva', spec: 'Luva de segurança em borracha nitrílica, com acabamento antiderrapante na palma e nos dedos, para proteção das mãos contra agentes químicos e biológicos.', nome: 'Luva de proteção nitrílica', uso: 'Produtos químicos, limpeza e risco biológico', img: 'epi/luva.jpg', re: /luva|quím|domissanit|limpeza|biol|álcool|sanit|nitr/i },
  { id: 'luva-latex', spec: 'Luva de procedimento descartável, em látex ou vinil, para proteção das mãos contra agentes biológicos e umidade.', nome: 'Luva de procedimento (látex / vinil)', uso: 'Higienização, resíduos e contato com umidade', img: 'epi/luva-latex.jpg', re: /luva|procedimento|látex|latex|resíduo|residuo|lixo|umid/i },
  { id: 'pff2', spec: 'Respirador purificador de ar tipo peça semifacial filtrante PFF2, para proteção das vias respiratórias contra poeiras, névoas e agentes biológicos.', nome: 'Respirador purificador de ar tipo PFF2', uso: 'Poeiras, aerossóis e agentes biológicos', img: 'epi/pff2.jpg', re: /pff|respir|máscara|mascara|poeira|quím|biol|lixo|resíduo/i },
  { id: 'bota', spec: 'Calçado ocupacional tipo bota, impermeável, com solado de borracha antiderrapante, para proteção dos pés contra umidade e escorregamento.', nome: 'Calçado ocupacional tipo bota, solado antiderrapante', uso: 'Piso molhado, queda e escorregão', img: 'epi/bota.png', re: /bota|queda|escorreg|piso|calçado|calcado/i },
  { id: 'bone', spec: 'Boné tipo árabe, com proteção para nuca e pescoço, para proteção da cabeça contra a radiação solar.', nome: 'Boné árabe / proteção contra radiação solar', uso: 'Trabalho externo e incidência solar (portaria / áreas comuns)', img: 'epi/bone.png', re: /sol|térmic|termic|calor|portaria|extern|radiação|bone|boné/i },
  { id: 'oculos', spec: 'Óculos de segurança com lente incolor de policarbonato e proteção lateral, para proteção dos olhos contra partículas e respingos.', nome: 'Óculos de proteção', uso: 'Projeção de partículas, produtos químicos e limpeza', img: 'epi/oculos.jpg', re: /óculos|oculos|partícula|particula|quím|limpeza|resping/i },
  { id: 'protetor', spec: 'Protetor auditivo tipo concha, com almofadas de espuma e haste ajustável, para proteção do sistema auditivo contra ruído.', nome: 'Protetor auditivo tipo concha', uso: 'Exposição a ruído (máquinas, portaria e áreas externas)', img: 'epi/protetor.jpg', re: /ruído|ruido|audit|barulho|máquin|maquin/i },
];

export function epiExistentes(p: LegacyProject): string {
  const rows = (p.riscos || [])
    .map((r) => {
      const t = [r.controles, r.acao, r.perigo].join(' ');
      const epis = EPI_ITENS.filter((e) => e.re.test(t)).map((e) => e.nome);
      if (!epis.length && /epi/i.test(t)) epis.push('EPI citado no inventário (especificar CA)');
      if (!epis.length) return '';
      return `<tr><td>${esc(r.ghe || r.funcao || DASH)}</td><td>${esc(r.perigo || DASH)}</td><td>${esc(epis.join('; '))}</td><td>${esc(r.controles || DASH)}</td></tr>`;
    })
    .filter(Boolean)
    .join('');
  return rows || '<tr><td colspan="4">Na visita técnica não foi comprovado controle formal de entrega de EPI. Os equipamentos devem ser implantados conforme o item 10.2 e o Apêndice A.</td></tr>';
}

/** Cards laid out in rows of `per` (each row is unbreakable, rows flow across pages). */
export function cardRows(cards: string[], per = 2): string {
  let html = '';
  for (let i = 0; i < cards.length; i += per) {
    const row = cards.slice(i, i + per);
    while (row.length < per) row.push('<div></div>');
    html += `<div class="pg-row">${row.join('')}</div>`;
  }
  return html;
}

export function epiGallery(a: Assets, itens: readonly EpiItem[]): string {
  return cardRows(
    itens.map((e) => `<div class="pgr-epi-card"><img src="${esc(a.base + e.img)}" alt="${esc(e.nome)}"><b>${esc(e.nome)}</b><span>${esc(e.uso)}</span></div>`),
    3,
  );
}

export function epiFicha(d: DocBuilder): string {
  const lines = Array.from({ length: 12 }, () => '<tr><td style="height:9mm"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
  return `${d.title('Apêndice A – Ficha de controle de EPI', 0)}<p class="pgr-text">Modelo sugerido para registro do fornecimento, nos termos da NR-6. Preencher uma linha por entrega ou substituição. Manter arquivado com o PGR.</p><table class="pgr-table compact"><thead><tr><th>Colaborador</th><th>Função</th><th>EPI</th><th>CA</th><th>Data entrega</th><th>Substituição</th><th>Ass. empregado</th><th>Ass. responsável</th></tr></thead><tbody>${lines}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Visita técnica / plano / fotos (PGR, LTCAT)
// ---------------------------------------------------------------------------

export function visitaBlock(d: DocBuilder, i: SlimInspecao | null): string {
  const T = PGR_TEXTS;
  let html = `${d.h1('6', 'Avaliação dos riscos e perigos')}${d.h2('6.1', 'Visita técnica')}<p class="pgr-text">${esc(T.visita)}</p>`;
  if (i) {
    html += `${caption('Dados da visita técnica')}<table class="pgr-table"><tbody><tr><th>Relatório SST</th><td>${esc(i.numero || DASH)}</td><th>Data da visita</th><td>${fmtH(i.dataVisita)}</td></tr><tr><th>Técnico responsável</th><td colspan="3">${esc(i.tecnico || DASH)}</td></tr><tr><th>Itens avaliados</th><td>${esc(i.nItens || 0)}</td><th>Não conformidades</th><td>${esc(i.nNc || 0)}</td></tr></tbody></table>`;
    if (i.objetivo) html += `<p class="pgr-text"><b>Objetivo da visita:</b> ${esc(i.objetivo)}</p>`;
    if ((i.ncs || []).length) {
      html += `${caption('Constatações da inspeção SST')}<table class="pgr-table compact"><colgroup><col style="width:18%"><col style="width:37%"><col style="width:9%"><col style="width:36%"></colgroup><thead><tr><th>Item</th><th>Irregularidade</th><th>Risco</th><th>Medida recomendada</th></tr></thead><tbody>${i.ncs
        .map((x) => `<tr><td>${esc(x.titulo)}</td><td>${esc(x.obs || DASH)}</td><td>${esc(x.risco || DASH)}</td><td>${esc(x.acao || DASH)}</td></tr>`)
        .join('')}</tbody></table>`;
    }
    if (i.conclusao) html += `<p class="pgr-text">${esc(i.conclusao)}</p>`;
  } else {
    html += `<p class="pgr-text">A visita técnica ainda não foi registrada neste condomínio. O inventário usa os dados do cadastro (setores, funções, GHE e riscos). Após a inspeção SST do passo a passo, as constatações, prazos e o registro fotográfico passam a integrar automaticamente este PGR e o LTCAT.</p>`;
  }
  html += `${d.h2('6.2', 'Avaliação qualitativa')}<p class="pgr-text">${esc(T.qualitativa)}</p>${matrix()}`;
  return html;
}

export interface PgrPlanoRow {
  risco?: string;
  gr: string;
  acao?: string;
  resp?: string;
  prazo?: string;
  status: string;
  origem: string;
}

export function pgrPlanoRows(p: LegacyProject, insp: SlimInspecao | null): PgrPlanoRow[] {
  const fromRiscos = (p.riscos || [])
    .filter((r) => r.acao)
    .map((r) => ({ risco: r.perigo, gr: grNome(gr(r.prob, r.sev)), acao: r.acao, resp: r.responsavel, prazo: r.prazo, status: r.status || 'Pendente', origem: 'Inventário' }));
  const fromNc = ((insp && insp.ncs) || [])
    .filter((x) => x.acao)
    .map((x) => ({ risco: x.titulo, gr: x.risco || DASH, acao: x.acao, resp: x.responsavel, prazo: x.prazo, status: 'Pendente', origem: 'Inspeção' }));
  return [...fromRiscos, ...fromNc];
}

/** Photo record section body (heading + intro + photo rows). */
export function fotoBlock(d: DocBuilder, insp: SlimInspecao | null, num: string, titulo: string, intro: string): string {
  const photos = (insp && insp.photos) || [];
  if (!photos.length) {
    return `${d.h1(num, titulo)}<p class="pgr-text">${esc(intro)} A visita técnica ainda não possui registro fotográfico. Após a inspeção SST, as imagens capturadas no checklist passam a constar automaticamente nesta seção.</p>`;
  }
  const cards = photos.map((f) => `<div class="pgr-foto-card"><img src="${esc(f.src)}" alt="${esc(f.titulo)}"><b>${esc(f.titulo)}</b>${f.obs ? `<span>${esc(f.obs)}</span>` : ''}</div>`);
  return `${d.h1(num, titulo)}<p class="pgr-text">${esc(intro)}</p>${cardRows(cards, 2)}`;
}

// ---------------------------------------------------------------------------
// DRPS (PGR section and NR-1 document)
// ---------------------------------------------------------------------------

export const AGRAVO_FALLBACK = 'transtornos psicológicos e emocionais, burnout, ansiedade, insônia, medo, desmotivação e demais agravos à saúde mental.';
export const DRPS_ESCALA =
  'Questionário: 1 Nunca · 2 Raramente · 3 Às vezes · 4 Frequentemente · 5 Sempre. A média coletiva por tópico está na escala de gravidade 1 Baixa · 2 Média · 3 Alta (modelo NR-01). Classificação: ≤ 1,66 Baixa; ≤ 2,32 Média; > 2,32 Alta.';

export function drpsTopics(d: DrpsBundle): DrpsTopicResult[] {
  return d.topicos && d.topicos.length ? d.topicos : emptyTopics();
}

export function drpsSetores(d: DrpsBundle): string {
  return (
    Object.entries(d.porSetor || {})
      .map(([k, v]) => `${esc(k)} (${v})`)
      .join('; ') || DASH
  );
}

export function drpsRows(topics: DrpsTopicResult[], nResp: number): string {
  return (
    topics
      .map((t) => {
        const media = nResp && t.media ? Number(t.media).toFixed(2) : DASH;
        const g = nResp ? esc(t.gravidade || DASH) : 'A avaliar';
        const cls = t.gravidadeN >= 3 ? ' class="alta"' : '';
        return `<tr${cls}><td>${esc(t.nome)}</td><td>${media}</td><td>${g}</td></tr>`;
      })
      .join('') || '<tr><td colspan="3">Tópicos do DRPS indisponíveis.</td></tr>'
  );
}

/** PGR section 8 (DRPS). Returns the section body (one flowing section). */
export function drpsBlock(d: DocBuilder, dr: DrpsBundle): string {
  const topics = drpsTopics(dr);
  const nResp = dr.n || 0;
  const setores = drpsSetores(dr);
  const intro = nResp
    ? `Esta seção atende à NR-1 quanto à identificação, avaliação e informação dos riscos psicossociais relacionados ao trabalho. O Diagnóstico de Riscos Psicossociais (DRPS) foi aplicado de forma confidencial (50 questões, 13 tópicos). Os resultados entram neste PGR apenas de forma coletiva, sem identificação nominal dos trabalhadores.`
    : `A NR-1 exige que os riscos psicossociais relacionados ao trabalho sejam identificados, avaliados e informados neste PGR. O Diagnóstico de Riscos Psicossociais (DRPS) ainda não foi aplicado neste condomínio. Esta seção permanece aberta até a coleta das respostas dos trabalhadores.`;
  const rows = drpsRows(topics, nResp);
  const fontes = topics
    .map((t) => {
      const cls = t.gravidadeN >= 3 ? ' class="alta"' : '';
      return `<tr${cls}><td>${esc(t.nome)}</td><td>${esc(t.gravidade || DASH)}</td><td>${esc(t.fonte || '')}</td></tr>`;
    })
    .join('');
  const part1 = `${d.h1('8', 'Riscos psicossociais (DRPS / NR-1)')}<p class="pgr-text">${intro}</p><div class="pgr-kpi"><span><b>${nResp}</b> resposta(s) coletiva(s)</span><span><b>${(dr.altos || []).length}</b> tópico(s) em gravidade alta</span><span>Setores: ${setores}</span></div>${caption('Inventário coletivo por tópico')}<table class="pgr-table compact"><thead><tr><th>Tópico / fator psicossocial</th><th style="width:16%">Média (1–3)</th><th style="width:16%">Gravidade</th></tr></thead><tbody>${rows}</tbody></table><p class="pgr-text">${DRPS_ESCALA}</p>`;
  const part2 = `${d.sub('Fontes geradoras e agravos')}${caption('Fonte geradora por tópico')}<table class="pgr-table compact"><thead><tr><th style="width:30%">Tópico</th><th style="width:14%">Gravidade</th><th>Fonte geradora (circunstâncias)</th></tr></thead><tbody>${fontes}</tbody></table><p class="pgr-text"><b>Possíveis agravos:</b> ${esc(topics[0]?.agravo || AGRAVO_FALLBACK)}</p>${d.sub('Medidas organizacionais')}<p class="pgr-text">Os fatores em gravidade alta devem ser tratados no plano de ação deste PGR, com medidas organizacionais e relacionais — canal de denúncia, suporte da liderança, clareza de papel, dimensionamento de equipe, comunicação e reconhecimento — sem exposição nominal dos trabalhadores. Reaplicar o DRPS após as intervenções ou quando houver mudança relevante na organização do trabalho.</p><p class="pgr-text">Confidencialidade: as respostas individuais não constam deste documento. O PGR informa apenas o resultado coletivo, por tópico.</p>`;
  return nResp ? part1 + part2 : part1;
}
