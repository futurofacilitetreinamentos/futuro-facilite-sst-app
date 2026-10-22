// Ordem de Serviço de Segurança e Saúde no Trabalho (NR-1, item 1.4.1, alínea c).
// One OS per trabalhador (or per função), each one a top-level section that
// starts on a new page. No cover / pre-text pages: a compact header block opens
// every OS; letterhead and page numbers come from the engine (layout.ts).
// Data per OS: empresa (cadastro) · trabalhador · função (atividades, CBO,
// setor, jornada) · GHE of the função (groups()) → riscos (inventário),
// controles (adm / EPC / gerais), ações · EPIs (project.epis, else controlesEpi).
import type { DocContext, LegacyEpi, LegacyFuncao, LegacyProject, LegacyRisco, LegacyTrabalhador } from './types';
import { esc, fmtH } from './html';
import { dataExtenso, groups, isPsicossocial } from './evolue';
import type { GheGroup } from './evolue';
import { gr, grNome } from './risk';
import { DocBuilder } from './layout';
import { assets, cidadeUf, DASH, emp } from './common';
import type { EmpresaExt } from './common';
import { OS_TXT } from './os-texts';

export interface OrdemServicoOpts {
  /** Trabalhadores (ids) — one OS each. Empty/absent with no funcaoNomes → all active workers. */
  trabalhadorIds?: string[];
  /** Funções (nomes) — one OS each (used when no trabalhadorIds are given). */
  funcaoNomes?: string[];
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function norm(s?: string): string {
  return String(s || '').trim().toLowerCase();
}

/** "12345678901" → "123.456.789-01"; anything else returned trimmed. */
export function fmtCpf(v?: string): string {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length !== 11) return String(v || '').trim();
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Active = no demissão date, or demissão in the future. */
export function trabalhadorAtivo(t: LegacyTrabalhador, today: Date = new Date()): boolean {
  if (!t.demissao) return true;
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return t.demissao > iso;
}

const VAZIO = /^(n[ãa]o\s+(identificad|se\s+aplica|h[áa]|informad|possui|existe|consta)|nenhum|inexistente|sem\s|-+$|—$|n\/?a$)/i;

function useful(s?: string): boolean {
  const t = String(s || '').trim();
  return !!t && !VAZIO.test(t);
}

/** Splits a free-text field into items (lines / ';'), drops "não identificado" & co. */
function items(s?: string, splitSemicolon = true): string[] {
  return String(s || '')
    .split(splitSemicolon ? /\n+|;\s*/ : /\n+/)
    .map((x) => x.trim().replace(/[.;]+$/, '').trim())
    .filter(useful);
}

function uniq(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  list.forEach((x) => {
    const k = norm(x);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(x);
  });
  return out;
}

function keep(html: string): string {
  return `<div class="pg-keep">${html}</div>`;
}

/** `head` + first bullet kept together (no orphan heading); the rest of the list flows. */
function headList(head: string, list: readonly string[], empty: string): string {
  if (!list.length) return keep(`${head}<p class="pgr-text">${esc(empty)}</p>`);
  const li = (xs: readonly string[]) => xs.map((x) => `<li>${esc(x)}</li>`).join('');
  const rest = list.length > 1 ? `<ul class="pg-ul os-cont">${li(list.slice(1))}</ul>` : '';
  return `${keep(`${head}<ul class="pg-ul os-first">${li(list.slice(0, 1))}</ul>`)}${rest}`;
}

// ---------------------------------------------------------------------------
// data of one OS
// ---------------------------------------------------------------------------

interface OsData {
  funcaoNome: string;
  funcao?: LegacyFuncao;
  ghes: GheGroup[];
  riscos: LegacyRisco[];
  epis: EpiRow[];
}

interface EpiRow {
  nome: string;
  ca: string;
  situacao: string;
}

function funcaoData(p: LegacyProject, all: GheGroup[], nome: string): OsData {
  const k = norm(nome);
  const funcao = (p.funcoes || []).find((f) => norm(f.nome) === k);
  const ghes = all.filter((g) => (g.funcoes || []).some((f) => norm(f.nome) === k));
  // GHE = exposição homogênea: todos os riscos do GHE valem para a função;
  // riscos cadastrados só na função (sem GHE) entram também.
  const riscos: LegacyRisco[] = [];
  ghes.forEach((g) => g.riscos.forEach((r) => riscos.includes(r) || riscos.push(r)));
  (p.riscos || []).forEach((r) => {
    if (!r.ghe && norm(r.funcao) === k && !riscos.includes(r)) riscos.push(r);
  });
  return { funcaoNome: funcao?.nome || nome, funcao, ghes, riscos, epis: episFuncao(p, k, ghes, riscos) };
}

function episFuncao(p: LegacyProject, k: string, ghes: GheGroup[], riscos: LegacyRisco[]): EpiRow[] {
  const gheNames = ghes.map((g) => norm(g.ghe.nome));
  const reg = (p.epis || []).filter((e: LegacyEpi) => (e.funcao ? norm(e.funcao) === k : !!e.ghe && gheNames.includes(norm(e.ghe))));
  if (reg.length) {
    const map = new Map<string, EpiRow & { existe: boolean }>();
    reg.forEach((e) => {
      const key = norm(e.nome);
      if (!key) return;
      const cur = map.get(key);
      const existe = e.status !== 'recomendado';
      const row = { nome: e.nome || DASH, ca: (e.ca || '').trim(), situacao: existe ? 'Fornecido' : 'A fornecer (recomendado no PGR)', existe };
      if (!cur || (existe && !cur.existe) || (!cur.ca && row.ca && existe === cur.existe)) map.set(key, row);
    });
    return Array.from(map.values()).map(({ nome, ca, situacao }) => ({ nome, ca, situacao }));
  }
  // Fallback: EPIs citados nos controles existentes do inventário.
  const rows: EpiRow[] = [];
  const seen = new Set<string>();
  riscos.forEach((r) =>
    items(r.controlesEpi).forEach((t) => {
      const m = /\bCA\s*(?:n[º°o.]*\s*)?(\d{3,7})/i.exec(t);
      const nome = t.replace(/\(([^)]*)\)/g, (all, inner: string) => (/\bCA\b/i.test(inner) ? '' : all)).replace(/\s{2,}/g, ' ').trim();
      const key = norm(nome);
      if (!key || seen.has(key)) return;
      seen.add(key);
      rows.push({ nome, ca: m ? m[1] : '', situacao: 'Fornecido' });
    }),
  );
  return rows;
}

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------

interface GrupoDef {
  label: string;
  test: (r: LegacyRisco) => boolean;
}

const GRUPOS: readonly GrupoDef[] = [
  { label: 'Físico', test: (r) => !/qu[ií]m|biol|ergo|acid|perigo|psico/i.test(r.grupo || '') },
  { label: 'Químico', test: (r) => /qu[ií]m/i.test(r.grupo || '') },
  { label: 'Biológico', test: (r) => /biol/i.test(r.grupo || '') },
  { label: 'Ergonômico', test: (r) => /ergo/i.test(r.grupo || '') && !isPsicossocial(r.grupo) },
  { label: 'Psicossocial relacionado ao trabalho', test: (r) => isPsicossocial(r.grupo) },
  { label: 'Acidente (mecânico)', test: (r) => /acid/i.test(r.grupo || '') && !/perigo/i.test(r.grupo || '') },
  { label: 'Perigos', test: (r) => /perigo/i.test(r.grupo || '') },
];

function riscosBlock(head: string, d: OsData): string {
  if (!d.riscos.length) return keep(`${head}<p class="pgr-text">${esc(OS_TXT.semRiscos)}</p>`);
  const used = new Set<LegacyRisco>();
  const bodies = GRUPOS.map((g) => {
    const rs = d.riscos.filter((r) => !used.has(r) && g.test(r));
    rs.forEach((r) => used.add(r));
    if (!rs.length) return '';
    const rows = rs
      .map((r) => `<tr><td>${esc(r.perigo || DASH)}</td><td>${esc(r.fonte || DASH)}</td><td>${esc(r.dano || DASH)}</td><td class="os-c">${esc(grNome(gr(r.prob, r.sev)))}</td></tr>`)
      .join('');
    return `<tbody class="${rs.length <= 4 ? 'pg-keep' : ''}"><tr><td class="pg-band" colspan="4">${esc(g.label)}</td></tr>${rows}</tbody>`;
  }).join('');
  const ausentes = GRUPOS.slice(0, 4)
    .concat(GRUPOS[5])
    .filter((g) => !d.riscos.some((r) => g.test(r)))
    .map((g) => g.label.replace(/ \(.*\)$/, '').toLowerCase());
  const temPsico = d.riscos.some((r) => isPsicossocial(r.grupo));
  const intro = `${head}<p class="pgr-text">${esc(OS_TXT.riscosIntro)}</p>`;
  const table = `<table class="pgr-table compact os-riscos"><colgroup><col style="width:27%"><col style="width:29%"><col style="width:30%"><col style="width:14%"></colgroup><thead><tr><th>Agente / fator de risco</th><th>Fonte geradora / circunstância</th><th>Possíveis danos à saúde</th><th>Nível de risco</th></tr></thead>${bodies}</table>`;
  // tabela curta: título, introdução e tabela juntos (sem cabeçalho órfão no pé da página)
  return `${d.riscos.length <= 8 ? keep(intro + table) : keep(intro) + table}${
    ausentes.length ? `<p class="pg-footnote">Não foram identificados no inventário riscos do(s) grupo(s): ${esc(ausentes.join(', '))}.</p>` : ''
  }<p class="pg-footnote">${esc(OS_TXT.psicossocial)}${temPsico ? '' : ' Não há fator psicossocial específico cadastrado para esta função.'}</p>`;
}

function prevencaoBlock(b: DocBuilder, head: string, d: OsData): string {
  const adm: string[] = [];
  const epc: string[] = [];
  const gerais: string[] = [];
  const acoes: string[] = [];
  d.riscos.forEach((r) => {
    const split = [r.controlesAdm, r.controlesEpc, r.controlesEpi].some((x) => String(x || '').trim());
    adm.push(...items(r.controlesAdm));
    epc.push(...items(r.controlesEpc));
    if (!split) gerais.push(...items(r.controles));
    if (useful(r.acao)) acoes.push(...items(r.acao, false));
  });
  const A = uniq(adm);
  const E = uniq(epc);
  const G = uniq(gerais);
  const R = uniq(acoes);
  let html = headList(`${head}${b.sub('Medidas adotadas pela organização')}<p class="pgr-text os-lead"><b>Administrativas / organização do trabalho:</b></p>`, uniq([...A, ...OS_TXT.prevencaoGeral]), DASH);
  html += headList('<p class="pgr-text os-lead"><b>Proteção coletiva (EPC):</b></p>', E, 'Não há EPC específico registrado no inventário para esta função.');
  if (G.length) html += headList('<p class="pgr-text os-lead"><b>Outros controles existentes:</b></p>', G, DASH);
  html += headList(b.sub('Medidas recomendadas (plano de ação do PGR)'), R, OS_TXT.semAcoes);
  return html;
}

function epiBlock(b: DocBuilder, head: string, d: OsData): string {
  const rows = d.epis.map((e) => `<tr><td>${esc(e.nome)}</td><td class="os-c">${esc(e.ca || 'A informar')}</td><td>${esc(e.situacao)}</td></tr>`).join('');
  const table = d.epis.length
    ? `<p class="pgr-text">${esc(OS_TXT.epiIntro)}</p><table class="pgr-table compact os-epi"><colgroup><col style="width:52%"><col style="width:16%"><col style="width:32%"></colgroup><thead><tr><th>Equipamento de proteção individual</th><th>CA</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<p class="pgr-text">${esc(OS_TXT.semEpi)}</p>`;
  return `${d.epis.length <= 8 ? keep(head + table) : head + table}${headList(b.sub('Deveres do trabalhador quanto ao EPI (NR-6)'), OS_TXT.epiDeveres, DASH)}`;
}

function signBlock(nome: string, linhas: string[]): string {
  return `<div class="pg-sign-block">${nome}${linhas.map((l) => '<br>' + l).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// one OS
// ---------------------------------------------------------------------------

interface OsTarget {
  trabalhador?: LegacyTrabalhador;
  data: OsData;
}

function osSection(b: DocBuilder, e: EmpresaExt, t: OsTarget, ix: number, total: number, emissao: string): void {
  const first = ix === 0;
  const { trabalhador: w, data: d } = t;
  const f = d.funcao;
  const setor = f?.setor || d.ghes.map((g) => g.ghe.setor || '').filter(Boolean)[0] || '';
  const ghe = d.ghes.map((g) => g.ghe.nome || '').filter(Boolean).join(', ');

  const head = `<div class="os-head pg-keep"><div class="os-head-t">${esc(OS_TXT.titulo)}</div><div class="os-head-s">${esc(OS_TXT.base)}</div><div class="os-head-m">${total > 1 ? `<span><b>OS:</b> ${ix + 1} de ${total}</span>` : ''}<span><b>Modalidade:</b> ${w ? 'Individual (por trabalhador)' : 'Por função'}</span><span><b>Emissão:</b> ${esc(emissao)}</span>${
    e.dataElaboracao ? `<span><b>PGR de referência:</b> ${fmtH(e.dataElaboracao)}</span>` : ''
  }</div></div>`;

  const empresa = `<tr><td class="pg-band" colspan="4">Empresa</td></tr><tr><th style="width:20%">Razão social</th><td colspan="3">${esc(e.razaoSocial || DASH)}</td></tr><tr><th>CNPJ</th><td style="width:30%">${esc(e.cnpj || DASH)}</td><th style="width:18%">CNAE / GR</th><td>${esc(e.cnae || DASH)}${e.grauRisco ? ' / ' + esc(e.grauRisco) : ''}</td></tr><tr><th>Endereço</th><td colspan="3">${esc([e.endereco, e.cep ? 'CEP ' + e.cep : '', e.cidadeUf].filter(Boolean).join(' · ') || DASH)}</td></tr>`;
  const funcaoRows = `<tr><th>Função</th><td>${esc(d.funcaoNome || DASH)}</td><th>CBO</th><td>${esc(f?.cbo || DASH)}</td></tr><tr><th>Setor</th><td>${esc(setor || DASH)}</td><th>GHE</th><td>${esc(ghe || DASH)}</td></tr><tr><th>Jornada</th><td colspan="3">${esc(f?.cargaHoraria || DASH)}</td></tr>`;
  const pessoa = w
    ? `<tr><td class="pg-band" colspan="4">Trabalhador</td></tr><tr><th>Nome</th><td colspan="3">${esc(w.nome || DASH)}</td></tr><tr><th>CPF</th><td>${esc(fmtCpf(w.cpf) || DASH)}</td><th>Matrícula</th><td>${esc(w.matricula || DASH)}</td></tr>${funcaoRows}<tr><th>Admissão</th><td colspan="3">${fmtH(w.admissao)}</td></tr>`
    : `<tr><td class="pg-band" colspan="4">Função</td></tr>${funcaoRows}<tr><th>Trabalhadores</th><td colspan="3">${esc(f?.quantidade || DASH)}</td></tr>`;

  const atividades = f?.atividades || d.ghes.map((g) => g.ghe.descricao || '').filter(Boolean).join(' ') || '';
  let html = head;
  html += keep(`${b.h1('1', 'Identificação', { toc: false })}<table class="pgr-table os-ident"><tbody>${empresa}${pessoa}</tbody></table>`);
  html += keep(`${b.h1('2', 'Objetivo', { toc: false })}<p class="pgr-text">${esc(OS_TXT.objetivo)}</p>`);
  html += keep(`${b.h1('3', 'Descrição das atividades', { toc: false })}<p class="pgr-text">${esc(atividades || 'Atividades inerentes à função, conforme descrição do cargo e orientações do superior hierárquico.')}</p>`);
  html += riscosBlock(b.h1('4', 'Riscos ocupacionais', { toc: false }), d);
  html += prevencaoBlock(b, b.h1('5', 'Medidas de prevenção', { toc: false }), d);
  html += epiBlock(b, b.h1('6', 'EPI de uso obrigatório', { toc: false }), d);
  html += headList(b.h1('7', 'Procedimentos em caso de acidente ou emergência', { toc: false }), OS_TXT.emergencia, DASH);
  html += `${headList(b.h1('8', 'Obrigações e proibições do trabalhador', { toc: false }) + b.sub('Obrigações (NR-1, item 1.4.2; CLT, art. 158)'), OS_TXT.obrigacoes, DASH)}${headList(b.sub('É proibido'), OS_TXT.proibicoes, DASH)}<p class="pgr-text os-falta">${esc(OS_TXT.atoFaltoso)}</p>`;
  html += `${keep(`${b.h1('9', 'Direito de recusa', { toc: false })}<p class="pgr-text">${esc(OS_TXT.recusa)}</p>`)}<p class="pgr-text">${esc(OS_TXT.vigencia)}</p>`;

  const empregado = w
    ? signBlock(`<b>Empregado:</b> ${esc(w.nome || DASH)}`, [`CPF: ${esc(fmtCpf(w.cpf) || DASH)}`, 'Recebi uma via e declaro ciência', 'Data: ____/____/________'])
    : signBlock('<b>Empregado:</b> ______________________________', ['CPF: ____________________', 'Recebi uma via e declaro ciência', 'Data: ____/____/________']);
  const empregador = signBlock(`<b>Empregador:</b> ${esc(e.responsavelEmpresa || DASH)}`, ['Síndico(a) / Representante legal', esc(e.razaoSocial || '')].filter(Boolean));
  const elab = e.respSst
    ? signBlock(`<b>Elaborado por:</b> ${esc(e.respSst)}`, [esc(e.funcaoRespSst || 'Técnico de Segurança do Trabalho'), ...(e.regSst ? [`<b>Nº do registro MTE:</b> ${esc(e.regSst)}`] : [])])
    : signBlock('<b>Elaborado por:</b> ' + DASH, ['Responsável técnico pelo PGR']);
  html += `<div class="os-ciencia pg-keep">${b.h1('10', 'Ciência e assinaturas', { toc: false })}<p class="pgr-text">${esc(OS_TXT.ciencia)}</p><p class="pg-date">${esc(cidadeUf(e))}, ${esc(emissao)}.</p><div class="os-sign">${empregado}${empregador}${elab}</div></div>`;

  b.section(html, { break: !first, cls: 'os-sec' });
}

// ---------------------------------------------------------------------------
// public builder
// ---------------------------------------------------------------------------

/** Workers/funções the OS batch will cover (same rules as buildOrdemServico). */
export function ordemServicoTargets(ctx: DocContext, opts: OrdemServicoOpts = {}): { trabalhadores: LegacyTrabalhador[]; funcoes: string[] } {
  const p = ctx.project;
  const today = ctx.today || new Date();
  const ativos = (p.trabalhadores || []).filter((t) => trabalhadorAtivo(t, today));
  if (opts.trabalhadorIds && opts.trabalhadorIds.length) {
    const ids = new Set(opts.trabalhadorIds);
    return { trabalhadores: (p.trabalhadores || []).filter((t) => ids.has(t.id)), funcoes: [] };
  }
  if (opts.funcaoNomes && opts.funcaoNomes.length) return { trabalhadores: [], funcoes: opts.funcaoNomes };
  if (ativos.length) return { trabalhadores: ativos, funcoes: [] };
  return { trabalhadores: [], funcoes: (p.funcoes || []).map((f) => f.nome || '').filter(Boolean) };
}

export function buildOrdemServico(ctx: DocContext, opts: OrdemServicoOpts = {}): string {
  const a = assets(ctx);
  const p = ctx.project;
  const e = emp(p);
  const all = groups(p);
  const emissao = dataExtenso(undefined, ctx.today || new Date());
  const { trabalhadores, funcoes } = ordemServicoTargets(ctx, opts);
  const cache = new Map<string, OsData>();
  const dataOf = (nome: string): OsData => {
    const k = norm(nome);
    let d = cache.get(k);
    if (!d) {
      d = funcaoData(p, all, nome);
      cache.set(k, d);
    }
    return d;
  };
  const targets: OsTarget[] = trabalhadores.length
    ? [...trabalhadores].sort((x, y) => (x.nome || '').localeCompare(y.nome || '', 'pt-BR')).map((t) => ({ trabalhador: t, data: dataOf(t.funcao || '') }))
    : funcoes.map((n) => ({ data: dataOf(n) }));

  const b = new DocBuilder('os');
  if (!targets.length) {
    b.section(
      `<div class="os-head"><div class="os-head-t">${esc(OS_TXT.titulo)}</div><div class="os-head-s">${esc(OS_TXT.base)}</div></div><p class="pgr-text">Não há trabalhadores nem funções cadastrados para emitir a Ordem de Serviço. Cadastre as funções (e, de preferência, os trabalhadores) do condomínio e gere novamente.</p>`,
      { break: false, cls: 'os-sec' },
    );
  }
  targets.forEach((t, i) => osSection(b, e, t, i, targets.length, emissao));
  return b.render(a.logo);
}

