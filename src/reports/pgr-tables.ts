// PGR tables in the reference format (pgr.md §1–§2): identificação, methodology
// tables, GHE identification and inventory, EPI 9.1/9.2, plano de ação 5W2H.
// Pure functions over the DocContext; every user value is escaped.
import type { LegacyEmpresa, LegacyEpi, LegacyProject, LegacyRisco } from './types';
import { esc } from './html';
import { grupoLetra, isPsicossocial, mesAnoCapa } from './evolue';
import type { GheGroup } from './evolue';
import { gr, grNome, GR_MATRIX, pd, te } from './risk';
import type { GrCode } from './risk';
import { caption, DocBuilder } from './layout';
import { DASH, EPI_ITENS, gheAmbiente } from './common';
import type { Assets, EpiItem, SlimInspecao } from './common';
import { NR01_GATILHOS, PGR_TXT } from './pgr-texts';
import type { RichPart } from './pgr-texts';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Escaped text with line breaks kept (blank line = paragraph gap). Empty → '-'. */
export function txt(v?: string | null): string {
  const s = String(v ?? '').trim();
  return s ? esc(s).replace(/\r?\n/g, '<br>') : DASH;
}

/** Text split by line into stacked sub-cells (reference "Onde?" / "Recursos"). */
export function stack(v?: string | null): string {
  const parts = String(v ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2) return txt(parts[0]);
  return `<div class="pgr-stack">${parts.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`;
}

/** Inline rich text (bold / italic parts). */
export function rich(parts: readonly RichPart[]): string {
  return parts.map((x) => (typeof x === 'string' ? esc(x) : 'b' in x ? `<b>${esc(x.b)}</b>` : `<i>${esc(x.i)}</i>`)).join('');
}

export function p(text: string): string {
  return `<p class="pgr-text">${esc(text)}</p>`;
}

export function ul(items: readonly string[], cls = ''): string {
  return `<ul class="pg-ul${cls ? ' ' + cls : ''}">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
}

/** a) b) c) list (items are rich parts). */
export function ol(items: readonly (readonly RichPart[])[]): string {
  return `<ol class="pgr-alpha">${items.map((x) => `<li>${rich(x)}</li>`).join('')}</ol>`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function norm(s?: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ISO date + n months (day clamped to 1). */
export function addMonths(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const t = Number(m[1]) * 12 + (Number(m[2]) - 1) + n;
  return `${Math.floor(t / 12)}-${pad2((t % 12) + 1)}-01`;
}


/**
 * Copies the <colgroup> widths onto every body cell. Paged.js does not carry
 * the colgroup to the continuation fragment of a split table, so without this
 * the columns of the following pages are re-laid out from the content.
 * (Body rows must not use rowspan.)
 */
export function sized(table: string): string {
  const cols = Array.from(/<colgroup>([\s\S]*?)<\/colgroup>/.exec(table)?.[1].matchAll(/width:\s*([\d.]+)%/g) || []).map((m) => Number(m[1]));
  if (!cols.length) return table;
  return table.replace(/<tbody>([\s\S]*)<\/tbody>/, (_all, body: string) => {
    const rows = body.replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/g, (_r, attrs: string, inner: string) => {
      let col = 0;
      const cells = inner.replace(/<(td|th)((?:\s[^>]*)?)>/g, (_c, tag: string, a: string) => {
        if (/rowspan=/.test(a)) return `<${tag}${a}>`;
        const span = Number(/colspan="(\d+)"/.exec(a)?.[1] || 1);
        const w = cols.slice(col, col + span).reduce((x, y) => x + y, 0);
        col += span;
        return w ? `<${tag}${a} style="width:${Math.round(w * 100) / 100}%">` : `<${tag}${a}>`;
      });
      return `<tr${attrs}>${cells}</tr>`;
    });
    return `<tbody>${rows}</tbody>`;
  });
}

/** sized() on every table of an HTML fragment. */
export function sizedAll(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/g, (t) => sized(t));
}

// ---------------------------------------------------------------------------
// 3. Identificação da empresa (reference: 7 rows, extras below)
// ---------------------------------------------------------------------------

export function identEmpresa(e: LegacyEmpresa): string {
  const rows: [string, string | undefined][] = [
    ['Razão Social', e.razaoSocial],
    ['Nome Fantasia', e.nomeFantasia],
    ['Logradouro', e.endereco],
    ['CEP', e.cep],
    ['E-mail', e.emailEmpresa],
    ['Telefone', e.contatoEmpresa],
    ['CNPJ', e.cnpj],
    ['CNAE', e.cnae],
    ['Grau de Risco', e.grauRisco],
    ['Nº de Trabalhadores', e.numTrabalhadores],
    ['Atividade', e.atividadeEmpresa],
    ['Responsável Legal', e.responsavelEmpresa],
  ];
  return sizedAll(`${caption('Identificação da empresa')}<table class="pgr-table pgr-kv"><colgroup><col style="width:25%"><col style="width:75%"></colgroup><tbody>${rows
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${txt(v)}</td></tr>`)
    .join('')}</tbody></table>`);
}

// ---------------------------------------------------------------------------
// 6.2 Methodology
// ---------------------------------------------------------------------------

export function pdTable(): string {
  return sizedAll(`${caption('Determinação da Severidade do Potencial de Dano')}<table class="pgr-table compact pgr-met"><colgroup><col style="width:15%"><col style="width:85%"></colgroup><thead><tr><th>Severidade do Dano</th><th>Situação Avaliada</th></tr></thead><tbody>${PGR_TXT.pd
    .map(([k, lines]) => `<tr><td class="c">${esc(k)}</td><td>${lines.map(esc).join('<br>')}</td></tr>`)
    .join('')}</tbody></table>`);
}

export function teTable(): string {
  return sizedAll(`${caption('Determinação do Tempo de Exposição')}<table class="pgr-table compact pgr-met"><colgroup><col style="width:18%"><col style="width:82%"></colgroup><thead><tr><th>Frequência da Exposição</th><th>Situação Avaliada</th></tr></thead><tbody>${PGR_TXT.te
    .map(([k, v]) => `<tr><th class="c">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('')}</tbody></table>`);
}

const GR_CLS: Record<string, string> = { T: 'gr-T', M: 'gr-M', S: 'gr-S', IT: 'gr-IT' };

/** Quadro 1 (coloured GR matrix, SEVERIDADE rotated). */
export function quadro1(): string {
  const sevs: [keyof typeof GR_MATRIX, string][] = [
    ['B', 'Baixo'],
    ['M', 'Médio'],
    ['A', 'Alto'],
    ['C', 'Crítico'],
  ];
  const rows = sevs
    .map(([k, label], i) => {
      const cells = (['P', 'I', 'E'] as const).map((f) => `<td class="${GR_CLS[GR_MATRIX[k][f]]}">${esc(grNome(GR_MATRIX[k][f]))}</td>`).join('');
      return `<tr>${i === 0 ? '<th class="pg-vert" rowspan="4"><span>SEVERIDADE</span></th>' : ''}<th class="c">${label}</th>${cells}</tr>`;
    })
    .join('');
  return `${caption('Matriz para determinação da Graduação de Risco', 'Quadro 1:')}<table class="pgr-table pg-matrix pg-norepeat pg-keep"><colgroup><col style="width:7%"><col style="width:18%"><col style="width:25%"><col style="width:25%"><col style="width:25%"></colgroup><thead><tr><td class="pg-corner" colspan="2" rowspan="2"></td><th colspan="3">FREQUÊNCIA</th></tr><tr><th>Permanente</th><th>Intermitente</th><th>Eventual</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function acoesTable(): string {
  return sizedAll(`${caption('Determinação de ações corretivas/preventivas necessárias')}<table class="pgr-table compact pgr-met"><colgroup><col style="width:22%"><col style="width:78%"></colgroup><thead><tr><th>Graduação de Risco</th><th>Ações Necessárias</th></tr></thead><tbody>${PGR_TXT.acoes
    .map(([, k, v]) => `<tr><td class="c">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('')}</tbody></table>`);
}

export function prioridadeTable(): string {
  return sizedAll(`${caption('Parâmetros para estabelecimento de prioridade')}<table class="pgr-table compact pgr-met"><colgroup><col style="width:12%"><col style="width:16%"><col style="width:72%"></colgroup><thead><tr><th>Grau de Prioridade</th><th>Prioridade das Ações</th><th>Fundamentação das ações</th></tr></thead><tbody>${PGR_TXT.prioridades
    .map(([k, label, lines]) => `<tr><td class="c">${esc(k)}</td><td class="c">${esc(label)}</td><td>${lines.map(esc).join('<br>')}</td></tr>`)
    .join('')}</tbody></table>`);
}

// ---------------------------------------------------------------------------
// GHE identification (7.1.n)
// ---------------------------------------------------------------------------

export interface GheInfo {
  /** GHE number (numero || position). */
  n: number;
  /** Name without a leading "GHE-01" style prefix. */
  nome: string;
}

export function gheInfo(g: GheGroup, ix: number): GheInfo {
  const n = Number(g.ghe.numero) > 0 ? Number(g.ghe.numero) : ix + 1;
  const raw = String(g.ghe.nome || '').trim();
  const nome = raw.replace(/^ghe\s*[-–:.]?\s*\d*\s*[-–:.]?\s*/i, '').trim() || raw || 'Ambientes do estabelecimento';
  return { n, nome };
}

export function gheIdentPgr(d: DocBuilder, p: LegacyProject, g: GheGroup, info: GheInfo, num: string): string {
  const fns = g.funcoes || [];
  const tipo =
    g.ghe.tipoAtividade ||
    g.ghe.descricao ||
    fns
      .map((f) => f.atividades)
      .filter(Boolean)
      .join(' ') ||
    '';
  const amb = g.ghe.descricaoAmbiente || gheAmbiente(p, g);
  const fnRows = fns.length
    ? fns.map((f) => `<tr><td colspan="2">${txt(f.nome)}</td><td>${txt(f.cargaHoraria)}</td></tr>`).join('')
    : `<tr><td colspan="2">${txt(g.ghe.funcoes)}</td><td>${DASH}</td></tr>`;
  const atv = fns.length
    ? fns.map((f) => `<p class="pgr-text"><b>${esc(String(f.nome || '').toUpperCase())}:</b> ${txt(f.atividades)}</p>`).join('')
    : `<p class="pgr-text">${txt(g.ghe.descricao)}</p>`;
  return sizedAll(`${d.h3(num, `GHE ${info.n}: ${info.nome}`)}<table class="pgr-table pgr-ghe"><colgroup><col style="width:30%"><col style="width:45%"><col style="width:25%"></colgroup><tbody><tr><th>Tipo de Atividade</th><td colspan="2">${txt(tipo)}</td></tr><tr><th>Descrição do ambiente</th><td colspan="2">${txt(amb)}</td></tr><tr><td class="pg-band" colspan="3">Identificação das funções</td></tr><tr><th colspan="2">Cargo / Função</th><th>Carga Horária</th></tr>${fnRows}<tr><td class="pg-band" colspan="3">Descrição das atividades</td></tr></tbody></table><div class="pgr-atv">${atv}</div>`);
}

// ---------------------------------------------------------------------------
// GHE inventory (landscape)
// ---------------------------------------------------------------------------

const LETRAS = ['F', 'Q', 'B', 'E', 'A'] as const;
const NAO_ID = 'Não identificado';

/** Risks of a GHE that go to the inventory tables (psychosocial ones are in 7.2). */
export function riscosInventario(g: GheGroup): LegacyRisco[] {
  return (g.riscos || []).filter((r) => !isPsicossocial(r.grupo));
}

function episDoGhe(p: LegacyProject, g: GheGroup, r: LegacyRisco): string {
  const fnNames = new Set((g.funcoes || []).map((f) => norm(f.nome)));
  const list = (p.epis || []).filter(
    (x) => x.status !== 'recomendado' && (norm(x.ghe) === norm(g.ghe.nome) || (r.funcao ? norm(x.funcao) === norm(r.funcao) : fnNames.has(norm(x.funcao)))),
  );
  return list.map((x) => `${x.nome || 'EPI'} (${x.ca ? 'CA ' + x.ca : 'CA não identificado'});`).join('\n\n');
}

interface InvRow {
  L: string;
  fator: string;
  fonte: string;
  te: string;
  pd: string;
  gr: string;
  /** Split controls, or null when the legacy single `controles` text is used. */
  adm: string | null;
  epc: string | null;
  epi: string | null;
  geral: string;
  prop: string;
  dano: string;
  ind: string;
}

function invRow(p: LegacyProject, g: GheGroup, L: string, r: LegacyRisco): InvRow {
  const split = !!(r.controlesAdm || r.controlesEpc || r.controlesEpi);
  const legacy = (r.controles || '').trim();
  const base = { L, fator: r.perigo || DASH, fonte: r.fonte || DASH, te: te(r.prob), pd: pd(r.sev), gr: gr(r.prob, r.sev), prop: r.acao || DASH, dano: r.dano || DASH, ind: r.indicadoresSaude || PGR_TXT.indicadorPadrao };
  if (split) return { ...base, adm: r.controlesAdm || NAO_ID, epc: r.controlesEpc || NAO_ID, epi: r.controlesEpi || NAO_ID, geral: '' };
  if (legacy) return { ...base, adm: null, epc: null, epi: null, geral: legacy };
  const epi = L === 'E' ? '' : episDoGhe(p, g, r);
  return { ...base, adm: NAO_ID, epc: NAO_ID, epi: epi || NAO_ID, geral: '' };
}

function ausente(L: string, perigo = false): InvRow {
  return { L, fator: perigo ? 'Ausência de fator de perigo' : 'Ausência de fator de risco', fonte: DASH, te: DASH, pd: DASH, gr: DASH, adm: DASH, epc: DASH, epi: DASH, geral: '', prop: DASH, dano: DASH, ind: DASH };
}

/** rowspan of each row for `key` among consecutive equal values (0 = covered). */
function spans<T>(rows: readonly T[], key: (r: T) => string, same: (a: T, b: T) => boolean = () => true): number[] {
  const out = rows.map(() => 1);
  for (let i = 0; i < rows.length; i++) {
    if (out[i] === 0) continue;
    let j = i + 1;
    while (j < rows.length && key(rows[j]) === key(rows[i]) && key(rows[i]) !== DASH && same(rows[i], rows[j])) {
      out[i] += 1;
      out[j] = 0;
      j++;
    }
  }
  return out;
}

/**
 * Merged cells are drawn without rowspan (Paged.js cannot split tables with
 * row-spanning cells): the first row of a run shows the value, the following
 * rows get an empty cell whose top border is hidden (class pgr-cont).
 */
function cell(span: number, html: string, cls = ''): string {
  const c = [cls, span === 0 ? 'pgr-cont' : span > 1 ? 'pgr-run' : ''].filter(Boolean).join(' ');
  return `<td${c ? ` class="${c}"` : ''}>${span === 0 ? '' : html}</td>`;
}

function invBody(rows: InvRow[]): string {
  const sL = spans(rows, (r) => r.L);
  const sP = spans(rows, (r) => r.prop);
  return rows
    .map((r, i) => {
      const ctrl = r.adm === null ? `<td colspan="3">${txt(r.geral)}</td>` : `<td>${txt(r.adm)}</td><td>${txt(r.epc)}</td><td>${txt(r.epi)}</td>`;
      return `<tr>${cell(sL[i], esc(r.L), 'L')}<td>${txt(r.fator)}</td><td>${txt(r.fonte)}</td><td>${esc(r.te)}</td><td>${esc(r.pd)}</td><td>${esc(r.gr)}</td>${ctrl}${cell(sP[i], txt(r.prop))}</tr>`;
    })
    .join('');
}

function indBody(rows: InvRow[]): string {
  const sameL = (a: InvRow, b: InvRow): boolean => a.L === b.L;
  const sL = spans(rows, (r) => r.L);
  const sD = spans(rows, (r) => r.dano, sameL);
  const sI = spans(rows, (r) => r.ind, (a, b) => sameL(a, b) && a.dano === b.dano);
  return rows.map((r, i) => `<tr>${cell(sL[i], esc(r.L), 'L')}<td>${txt(r.fator)}</td>${cell(sD[i], txt(r.dano))}${cell(sI[i], txt(r.ind))}</tr>`).join('');
}

/** Legend (5 groups × 2 lines, pgr.md §2.8). */
export function legendaPgr(): string {
  const it = (k: string, v: string): string => (k ? `<span><b>${esc(k)}:</b> ${esc(v)}</span>` : '<span></span>');
  const grp = (cols: number, l1: [string, string][], l2: [string, string][]): string =>
    `<td><div class="pgr-lg" style="grid-template-columns:repeat(${cols},auto)">${l1.map(([k, v]) => it(k, v)).join('')}${l2.map(([k, v]) => it(k, v)).join('')}</div></td>`;
  return `<p class="pgr-inv-title">Legenda</p><table class="pgr-table pgr-legenda pg-keep pg-norepeat"><colgroup><col style="width:27%"><col style="width:25%"><col style="width:18%"><col style="width:13%"><col style="width:17%"></colgroup><thead><tr><th>Risco e Perigo</th><th>Tipo de Exposição</th><th>Tempo de Exposição</th><th>Potencial de Dano</th><th>Graduação de Risco</th></tr></thead><tbody><tr>${grp(
    3,
    [
      ['F', 'Físico'],
      ['Q', 'Químico'],
      ['B', 'Biológico'],
    ],
    [
      ['E', 'Ergonômico'],
      ['A', 'Acidente'],
      ['P', 'Perigo'],
    ],
  )}${grp(
    2,
    [
      ['TE', 'Tempo de Exposição'],
      ['GR', 'Graduação do Risco'],
    ],
    [
      ['PD', 'Potencial de Dano'],
      ['', ''],
    ],
  )}${grp(
    2,
    [
      ['E', 'Eventual'],
      ['P', 'Permanente'],
    ],
    [
      ['I', 'Intermitente'],
      ['', ''],
    ],
  )}${grp(
    2,
    [
      ['B', 'Baixo'],
      ['A', 'Alto'],
    ],
    [
      ['M', 'Médio'],
      ['C', 'Crítico'],
    ],
  )}${grp(
    2,
    [
      ['T', 'Tolerável'],
      ['S', 'Substancial'],
    ],
    [
      ['M', 'Moderado'],
      ['IT', 'Intolerável'],
    ],
  )}</tr></tbody></table>`;
}

/** Inventory + indicativos + legend of one GHE (landscape section body). */
export function gheInventarioPgr(p: LegacyProject, g: GheGroup, psicoRef: string): string {
  const rs = riscosInventario(g);
  const riscoRows: InvRow[] = [];
  LETRAS.forEach((L) => {
    const list = rs.filter((r) => grupoLetra(r.grupo) === L);
    if (!list.length) riscoRows.push(ausente(L));
    else list.forEach((r) => riscoRows.push(invRow(p, g, L, r)));
  });
  const perigos = rs.filter((r) => grupoLetra(r.grupo) === 'P').map((r) => invRow(p, g, 'P', r));
  const perigoRows = perigos.length ? perigos : [ausente('P', true)];
  const colsInv = '<colgroup><col style="width:5%"><col style="width:17%"><col style="width:14%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:3.5%"><col style="width:10.5%"><col style="width:9.5%"><col style="width:12%"><col style="width:21.5%"></colgroup>';
  const head = `<thead><tr><th colspan="6">Inventário de Riscos e Perigo</th><th colspan="4">Análise de Riscos Ocupacionais e Perigo</th></tr><tr><th rowspan="3">Riscos</th><th rowspan="3">Fator de exposição</th><th rowspan="3">Fonte Geradora</th><th colspan="3" rowspan="2">Tipo de Exposição</th><th colspan="4">Medidas de Controle</th></tr><tr><th colspan="3">Existentes</th><th rowspan="2">Propostas</th></tr><tr><th>TE</th><th>PD</th><th>GR</th><th>Administrativas</th><th>EPC</th><th>EPI</th></tr></thead>`;
  // The Perigos block is a second table glued to the first one (its own header row),
  // kept in one piece when short so the sub-header is never left alone at a page end.
  const keepP = perigoRows.length <= 4 ? ' pg-keep' : '';
  const subP = '<thead><tr class="pgr-subhead"><th>Perigos</th><th>Fator de exposição</th><th>Fonte Geradora</th><th>TE</th><th>PD</th><th>GR</th><th>Administrativas</th><th>EPC</th><th>EPI</th><th>Propostas</th></tr></thead>';
  const inv = `<table class="pgr-table pgr-inv pgr-join">${colsInv}${head}<tbody>${invBody(riscoRows)}</tbody></table><table class="pgr-table pgr-inv pgr-joined${keepP}">${colsInv}${subP}<tbody>${invBody(perigoRows)}</tbody></table>`;
  const colsInd = '<colgroup><col style="width:5%"><col style="width:18%"><col style="width:41%"><col style="width:36%"></colgroup>';
  const subI = '<thead><tr class="pgr-subhead"><th>Perigos</th><th>Fator de exposição</th><th>Possíveis danos à saúde</th><th>Indicadores de saúde</th></tr></thead>';
  const ind = `<p class="pgr-inv-title">Indicativos de possível comprometimento à saúde</p><table class="pgr-table pgr-inv pgr-join">${colsInd}<thead><tr><th>Riscos</th><th>Agente</th><th>Possíveis danos à saúde</th><th>Indicadores de saúde</th></tr></thead><tbody>${indBody(riscoRows)}</tbody></table><table class="pgr-table pgr-inv pgr-joined${keepP}">${colsInd}${subI}<tbody>${indBody(perigoRows)}</tbody></table>`;
  return sizedAll(`${inv}${ind}${legendaPgr()}${psicoRef ? `<p class="pgr-inv-note">${esc(psicoRef)}</p>` : ''}`);
}

// ---------------------------------------------------------------------------
// 9. EPI
// ---------------------------------------------------------------------------

/** Catalog item of a registered EPI: by image key, else by name. */
export function epiCatalogo(x: Pick<LegacyEpi, 'imagem' | 'nome'>): EpiItem | undefined {
  const key = String(x.imagem || '').trim();
  if (key) {
    const byKey = EPI_ITENS.find((e) => e.id === key);
    if (byKey) return byKey;
  }
  const n = norm(x.nome);
  if (!n) return undefined;
  const rules: [RegExp, string][] = [
    [/pff|respirador|mascara/, 'pff2'],
    [/latex|vinil|procedimento/, 'luva-latex'],
    [/luva/, 'luva'],
    [/bota|calcado|sapato/, 'bota'],
    [/bone|chapeu|solar/, 'bone'],
    [/oculos/, 'oculos'],
    [/auditivo|abafador|concha|plug/, 'protetor'],
  ];
  const hit = rules.find(([re]) => re.test(n));
  return hit ? EPI_ITENS.find((e) => e.id === hit[1]) : undefined;
}

export interface EpiExistenteRow {
  equipamento: string;
  descricao: string;
  ca: string;
  funcoes: string;
  vigencia: string;
  eficaz: string;
}

export interface EpiRecomendadoRow {
  ghe: string;
  funcao: string;
  equipamento: string;
  spec: string;
  /** Image URL or '' */
  img: string;
}

function fmtDate(iso?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function uniq(list: readonly string[]): string[] {
  const seen = new Set<string>();
  return list.filter((x) => {
    const k = norm(x);
    if (!x || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Text of the risks used by the regex fallback. */
function riskText(r: LegacyRisco, withAcao: boolean): string {
  return [r.perigo, r.fonte, r.controles, r.controlesEpi, withAcao ? r.acao : ''].filter(Boolean).join(' ');
}

/**
 * 9.1 rows. From project.epis (status 'existente') when any EPI is registered;
 * else regex over the existing-control texts of the inventory (CA / vigência
 * "Não identificado", eficácia "-").
 */
export function episExistentes(p: LegacyProject, ghes: readonly GheGroup[]): EpiExistenteRow[] {
  const epis = p.epis || [];
  if (epis.length) {
    const map = new Map<string, { x: LegacyEpi; funcoes: string[] }>();
    epis
      .filter((x) => x.status !== 'recomendado')
      .forEach((x) => {
        const k = norm(x.nome) + '|' + norm(x.ca);
        const cur = map.get(k) || { x, funcoes: [] };
        cur.funcoes.push(x.funcao || x.ghe || '');
        map.set(k, cur);
      });
    return Array.from(map.values()).map(({ x, funcoes }) => ({
      equipamento: x.nome || DASH,
      descricao: epiCatalogo(x)?.spec || DASH,
      ca: x.ca || NAO_ID,
      funcoes: uniq(funcoes).join(', ') || DASH,
      vigencia: fmtDate(x.validadeCa) || NAO_ID,
      eficaz: x.eficaz === true ? 'Sim' : x.eficaz === false ? 'Não' : DASH,
    }));
  }
  const map = new Map<string, string[]>();
  ghes.forEach((g) => {
    riscosInventario(g).forEach((r) => {
      const t = riskText(r, false);
      if (!t) return;
      EPI_ITENS.filter((e) => e.re.test(t) && /epi|luva|bota|cal[cç]ado|respir|pff|[óo]culos|protetor|bon[ée]|m[áa]scara/i.test(t)).forEach((e) => {
        const list = map.get(e.id) || [];
        list.push(r.funcao || (g.funcoes || []).map((f) => f.nome || '').join(', ') || g.ghe.nome || '');
        map.set(e.id, list);
      });
    });
  });
  return EPI_ITENS.filter((e) => map.has(e.id)).map((e) => ({ equipamento: e.nome, descricao: e.spec || DASH, ca: NAO_ID, funcoes: uniq(map.get(e.id) || []).join(', ') || DASH, vigencia: NAO_ID, eficaz: DASH }));
}

/**
 * 9.2 rows. From project.epis (status 'recomendado') when any EPI is registered;
 * else catalog items whose pattern matches the risks of each GHE.
 */
export function episRecomendados(p: LegacyProject, ghes: readonly GheGroup[], a: Assets, infos: readonly GheInfo[]): EpiRecomendadoRow[] {
  const img = (e?: EpiItem): string => (e ? a.base + e.img : '');
  const epis = p.epis || [];
  const gheNum = (nome?: string, funcao?: string): string => {
    let ix = ghes.findIndex((g) => norm(g.ghe.nome) === norm(nome));
    if (ix < 0 && funcao) ix = ghes.findIndex((g) => (g.funcoes || []).some((f) => norm(f.nome) === norm(funcao)));
    return ix >= 0 ? pad2(infos[ix].n) : DASH;
  };
  if (epis.length) {
    return epis
      .filter((x) => x.status === 'recomendado')
      .map((x) => {
        const cat = epiCatalogo(x);
        return { ghe: gheNum(x.ghe, x.funcao), funcao: x.funcao || DASH, equipamento: x.nome || cat?.nome || DASH, spec: cat?.spec || DASH, img: img(cat) };
      })
      .sort((a1, b1) => a1.ghe.localeCompare(b1.ghe));
  }
  const rows: EpiRecomendadoRow[] = [];
  ghes.forEach((g, ix) => {
    const t = riscosInventario(g)
      .map((r) => riskText(r, true))
      .join(' ');
    if (!t) return;
    const fn = (g.funcoes || []).map((f) => f.nome || '').filter(Boolean).join(', ') || g.ghe.funcoes || DASH;
    EPI_ITENS.filter((e) => e.re.test(t)).forEach((e) => rows.push({ ghe: pad2(infos[ix].n), funcao: fn, equipamento: e.nome, spec: e.spec || DASH, img: img(e) }));
  });
  return rows;
}

export function epiExistentesTable(rows: readonly EpiExistenteRow[]): string {
  const body = rows.length
    ? rows.map((r) => `<tr><td class="l">${txt(r.equipamento)}</td><td class="l">${txt(r.descricao)}</td><td>${txt(r.ca)}</td><td>${txt(r.funcoes)}</td><td>${txt(r.vigencia)}</td><td>${txt(r.eficaz)}</td></tr>`).join('')
    : '<tr><td colspan="6">Não foram identificados Equipamentos de Proteção Individual em uso no local avaliado.</td></tr>';
  return sizedAll(`${caption('Tabela de Equipamentos de Proteção Individual Existentes no local avaliado', 'Tabela 9.1:')}<table class="pgr-table pgr-epi"><colgroup><col style="width:16%"><col style="width:40%"><col style="width:8%"><col style="width:17%"><col style="width:8%"><col style="width:11%"></colgroup><thead><tr><th>Equipamento</th><th>Descrição Técnica</th><th>Nº CA</th><th>Funções que utilizam o EPI</th><th>Vigência*</th><th>O equipamento é eficaz?</th></tr></thead><tbody>${body}</tbody></table><p class="pgr-footnote-l">${esc(PGR_TXT.epiVigenciaNota)}</p>`);
}

export function epiRecomendadosTable(rows: readonly EpiRecomendadoRow[]): string {
  const body = rows.length
    ? rows
        .map(
          (r) =>
            `<tr><td>${txt(r.ghe)}</td><td>${txt(r.funcao)}</td><td>${txt(r.equipamento)}</td><td>${txt(r.spec)}</td><td class="pgr-foto">${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.equipamento)}">` : DASH}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5">Não há Equipamentos de Proteção Individual recomendados para os riscos inventariados.</td></tr>';
  return sizedAll(`${caption('Equipamentos de Proteção Individual recomendados de acordo com o ANEXO I da NR 6', 'Tabela 9.2:')}<table class="pgr-table pgr-epi pgr-epi-rec"><colgroup><col style="width:7%"><col style="width:19%"><col style="width:20%"><col style="width:27%"><col style="width:27%"></colgroup><thead><tr><th>Nº GHE</th><th>Cargo / Função</th><th>Equipamento</th><th>Especificação</th><th>Foto Ilustrativa</th></tr></thead><tbody>${body}</tbody></table>`);
}

// ---------------------------------------------------------------------------
// 10. Plano de ação (5W2H)
// ---------------------------------------------------------------------------

export type Prioridade = 'A' | 'B' | 'C' | 'D';

export const PRIORIDADE_NOME: Record<Prioridade, string> = { A: 'Crítico/ Emergencial', B: 'Primária', C: 'Secundária', D: 'Terciária' };

/** Priority fallback: GR Intolerável → A, Substancial → B, Moderado → C, Tolerável → D. */
export function prioridadePorGr(code: GrCode): Prioridade {
  return code === 'IT' ? 'A' : code === 'S' ? 'B' : code === 'M' ? 'C' : 'D';
}

/** Inspection NC risk (Crítico/Alto/Médio/Baixo) → priority; unknown → C. */
export function prioridadePorNc(risco?: string): Prioridade {
  const t = norm(risco);
  if (t.startsWith('crit')) return 'A';
  if (t.startsWith('alto')) return 'B';
  if (t.startsWith('baix')) return 'D';
  return 'C';
}

export interface MetaRow {
  meta: string;
  prio: Prioridade;
  recursos: string;
  onde: string;
  /** ISO date or '' */
  quando: string;
  resp: string;
  afericao: string;
  /** Footnote marker (Reanálise do PGR). */
  nota?: boolean;
}

export interface PlanoInput {
  p: LegacyProject;
  ghes: readonly GheGroup[];
  insp: SlimInspecao | null;
  /** Any EPI to supply (9.1 or 9.2 rows). */
  temEpi: boolean;
  /** DRPS topics in high severity. */
  drpsAltos: number;
  /** ISO date used when dataElaboracao is empty. */
  hoje: string;
}

const ONDE_PADRAO = 'Nas dependências da empresa';

/**
 * Plan rows: standard EPI metas (when there are EPIs) → unique risk actions
 * (deduplicated by normalized text, highest priority / earliest prazo kept) →
 * inspection NCs → DRPS (when high topics) — sorted by priority — then the
 * final "Reanálise do PGR" (elaboração + 24 months).
 */
export function planoMetas({ p, insp, temEpi, drpsAltos, hoje }: PlanoInput): MetaRow[] {
  const e = p.empresa || {};
  const razao = (e.razaoSocial || 'A organização').toUpperCase();
  const base = e.dataElaboracao || hoje;
  const mais1 = addMonths(base, 1);
  const out: MetaRow[] = [];
  if (temEpi) {
    out.push({ meta: 'Fornecimento e/ou manutenção do Equipamento de Proteção Individual – EPI.', prio: 'B', recursos: 'EPI listados neste documento', onde: ONDE_PADRAO, quando: mais1, resp: razao, afericao: 'Registro de entrega dos EPI, com assinatura dos trabalhadores (Apêndice A).' });
    out.push({
      meta: 'Treinamento sobre uso adequado, guarda e conservação do EPI, de acordo com a NR-06.',
      prio: 'B',
      recursos: 'Computador ou celular com acesso à internet, quando remoto\nRecursos a critério do instrutor, quando presencial',
      onde: 'Em plataforma on-line, quando remoto\nNas dependências da empresa, quando presencial',
      quando: mais1,
      resp: razao,
      afericao: 'Certificado, avaliação de aprendizagem e lista de presença',
    });
  }
  const PR = ['A', 'B', 'C', 'D'];
  const acc: MetaRow[] = [];
  const add = (m: MetaRow): void => {
    const k = norm(m.meta);
    const cur = acc.find((x) => norm(x.meta) === k);
    if (!cur) {
      acc.push(m);
      return;
    }
    if (PR.indexOf(m.prio) < PR.indexOf(cur.prio)) cur.prio = m.prio;
    if (m.quando && (!cur.quando || m.quando < cur.quando)) cur.quando = m.quando;
    if (cur.recursos === DASH && m.recursos !== DASH) cur.recursos = m.recursos;
    if (cur.afericao === DASH && m.afericao !== DASH) cur.afericao = m.afericao;
    if (cur.onde === ONDE_PADRAO && m.onde !== ONDE_PADRAO) cur.onde = m.onde;
    const resp = uniq([...cur.resp.split(' / '), m.resp]);
    cur.resp = resp.join(' / ');
  };
  (p.riscos || [])
    .filter((r) => (r.acao || '').trim())
    .forEach((r) => {
      const prio = (['A', 'B', 'C', 'D'] as const).find((x) => x === r.prioridade) || prioridadePorGr(gr(r.prob, r.sev));
      add({ meta: (r.acao || '').trim(), prio, recursos: (r.recursos || '').trim() || DASH, onde: (r.onde || '').trim() || ONDE_PADRAO, quando: r.prazo || '', resp: (r.responsavel || '').trim() || razao, afericao: (r.formaAfericao || '').trim() || DASH });
    });
  ((insp && insp.ncs) || [])
    .filter((x) => (x.acao || '').trim())
    .forEach((x) => {
      add({ meta: x.acao.trim(), prio: prioridadePorNc(x.risco), recursos: DASH, onde: ONDE_PADRAO, quando: x.prazo || '', resp: (x.responsavel || '').trim() || razao, afericao: 'Registro da execução e verificação na próxima inspeção SST' });
    });
  if (drpsAltos > 0) {
    add({
      meta: 'Implementar medidas organizacionais para os fatores psicossociais classificados em gravidade alta no DRPS (item 7.2) e reaplicar o diagnóstico após as intervenções.',
      prio: 'B',
      recursos: 'Reuniões de planejamento com a gestão e canal de comunicação com os trabalhadores',
      onde: ONDE_PADRAO,
      quando: addMonths(base, 3),
      resp: razao,
      afericao: 'Novo resultado coletivo do DRPS',
    });
  }
  acc.sort((a1, b1) => PR.indexOf(a1.prio) - PR.indexOf(b1.prio));
  out.push(...acc);
  out.push({ meta: 'Reanálise do PGR', prio: 'D', recursos: 'Novas visitas técnicas', onde: ONDE_PADRAO, quando: addMonths(base, 24), resp: razao, afericao: 'Termo de visita técnica', nota: true });
  return out;
}

export function planoTable(rows: readonly MetaRow[]): string {
  const body = rows
    .map(
      (r, i) =>
        `<tr><td class="pgr-meta">${i + 1}.&nbsp;&nbsp;${txt(r.meta)}${r.nota ? '<sup>1</sup>' : ''}</td><td>${esc(PRIORIDADE_NOME[r.prio])}</td><td>${stack(r.recursos)}</td><td>${stack(r.onde)}</td><td>${r.quando ? esc(mesAnoCapa(r.quando)) : DASH}</td><td>${txt(r.resp)}</td><td>${txt(r.afericao)}</td></tr>`,
    )
    .join('');
  const nota = `<div class="pgr-fn"><p><sup>1</sup> ${esc(PGR_TXT.reanaliseNota)}</p>${NR01_GATILHOS.map((x, i) => `<p>${'abcde'[i]}) ${esc(x)}</p>`).join('')}</div>`;
  return sizedAll(`${caption('Plano de Ações do PGR')}<table class="pgr-table pgr-plano"><colgroup><col style="width:21%"><col style="width:8%"><col style="width:16%"><col style="width:14%"><col style="width:11%"><col style="width:15%"><col style="width:15%"></colgroup><thead><tr><th>Metas</th><th>Prioridade</th><th>Recursos necessários</th><th>Onde?</th><th>Quando?</th><th>Responsáveis</th><th>Formas de aferição</th></tr></thead><tbody>${body}</tbody></table>${nota}`);
}
