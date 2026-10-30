// Geradores da Proposta Comercial e do Contrato de Prestação de Serviços.
// Reproduzem os modelos da empresa (Proposta Villa Borghese 2026 / Contrato
// Acqua 2026): papel timbrado com o logo grande e as ondas verde/azul no topo,
// rodapé com e-mail e WhatsApp, fonte serifada (Cambria), sem capa.
// Saída: HTML corrido para o paginador (paginate.ts); estilos em doc-comercial.css.
// O timbre usa o gancho do motor: data-logo = imagem do cabeçalho (desenhada em
// toda página por decorate(); o CSS a estica na largura da folha) e a faixa
// .pg-lh-band vira a barra verde/azul do rodapé. O texto do rodapé (contatos)
// é um elemento "running" do Paged.js repetido em todas as páginas.
import type { ClausulaContrato } from '../lib/types';
import type { ContratoDocData, PropostaDocData } from './comercial-types';
import { CONTRATO_TEXTOS, PROPOSTA_TEXTOS } from './comercial-texts';
import { dataExtenso } from './evolue';
import { esc, fmt } from './html';
import { formatBRL, numeroComExtenso, ordinalFeminino, valorComExtenso } from './extenso';
import { DocBuilder } from './layout';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Linha para preencher à mão (dado ausente). */
const BLANK = '<span class="cm-blank">________</span>';

function txt(v: unknown): string {
  return String(v ?? '').trim();
}

/** Valor do usuário escapado, ou a linha em branco. */
function val(v: unknown): string {
  const s = txt(v);
  return s ? esc(s) : BLANK;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(num(n) * 100) / 100;
}

function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, '0');
}

const ROMANOS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function romano(n: number): string {
  let r = '';
  let v = Math.max(1, Math.trunc(n));
  for (const [k, s] of ROMANOS) {
    while (v >= k) {
      r += s;
      v -= k;
    }
  }
  return r;
}

/** Texto de template (confiável na estrutura, mas digitado na configuração): escapa e aplica **negrito**. */
function richTpl(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

/** "Endereço, Cidade/UF" — acrescenta a cidade só se ainda não estiver no endereço. */
function enderecoCompleto(endereco: string, cidade: string): string {
  const e = txt(endereco);
  const c = txt(cidade);
  if (!e) return '';
  if (!c) return e;
  const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(e).includes(norm(c)) ? e : `${e}, ${c}`;
}

/** Timbre: imagem do cabeçalho (data-logo) + rodapé com os contatos (running element). */
function rodape(base: string, email: string, telefone: string): string {
  const itens: string[] = [];
  if (txt(email)) itens.push(`<span class="cm-rod-i"><img src="${esc(base + 'comercial/icone-email.png')}" alt="">${esc(txt(email))}</span>`);
  if (txt(telefone)) itens.push(`<span class="cm-rod-i"><img src="${esc(base + 'comercial/icone-whatsapp.png')}" alt="">${esc(txt(telefone))}</span>`);
  return `<div class="cm-rodape"><div class="cm-rod-linha"></div><div class="cm-rod-c">${itens.join('')}</div></div>`;
}

function cabecalho(base: string): string {
  return base + 'comercial/cabecalho.png';
}

// ---------------------------------------------------------------------------
// Proposta comercial
// ---------------------------------------------------------------------------

/** Linhas de "Serviços inclusos": descricao_proposta de cada item, partida em ';', sem repetidos. */
function servicosInclusos(d: PropostaDocData): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of d.itens || []) {
    const partes = txt(it.descricao_proposta || it.nome).split(';');
    for (const p of partes) {
      const t = p.trim().replace(/[.;]+$/, '').trim();
      const k = t.toLowerCase();
      if (t && !seen.has(k)) {
        seen.add(k);
        out.push(t);
      }
    }
  }
  return out;
}

function itemTotal(it: PropostaDocData['itens'][number]): number {
  const t = num(it.total);
  return t || round2(num(it.quantidade) * num(it.preco_unit));
}

function itemLabel(it: PropostaDocData['itens'][number]): string {
  const nome = txt(it.nome) || txt(it.descricao_proposta).split(';')[0].trim();
  const q = Math.trunc(num(it.quantidade));
  if (it.unidade === 'por_colaborador' && q > 0) return `${nome} (${pad2(q)} ${q === 1 ? 'colaborador' : 'colaboradores'})`;
  if (it.unidade !== 'por_colaborador' && q > 1) return `${nome} (${q}×)`;
  return nome;
}

function valorCell(v: number, destaque = false): string {
  const s = esc(formatBRL(v));
  return destaque ? `<span class="cm-hl">${s}</span>` : s;
}

export function buildProposta(d: PropostaDocData): string {
  const T = PROPOSTA_TEXTOS;
  const base = d.assetsBase || '';
  const e = d.empresa;
  const c = d.cliente;
  const doc = new DocBuilder('comercial');
  const empresaNome = txt(e.nome_fantasia) || txt(e.razao_social);
  const titulo = `<p class="cm-titulo">${esc(T.titulo)}</p>`;

  // ---- página 1: identificação, solução, serviços inclusos
  const ident: string[] = [];
  ident.push(`<p><b>Empresa:</b> ${val(empresaNome)}</p>`);
  ident.push(`<p><b>Cliente:</b> ${val(txt(c.razaoSocial) || txt(c.nomeFantasia))}</p>`);
  if (txt(c.cnpj)) ident.push(`<p><b>CNPJ:</b> ${esc(txt(c.cnpj))}</p>`);
  ident.push(`<p><b>Data:</b> ${txt(d.data) ? esc(dataExtenso(d.data)) : BLANK}</p>`);
  const numero = txt(d.numero);
  if (numero && !/^rascunho$/i.test(numero)) ident.push(`<p><b>Proposta nº:</b> ${esc(numero)}</p>`);

  const solucao = T.solucao.map((p) => `<p class="cm-p">${esc(p).replace(/\{\{\s*empresa\s*\}\}/g, esc(empresaNome || 'contratada'))}</p>`).join('');
  const servicos = servicosInclusos(d);
  const lista = servicos.length
    ? `<ul class="cm-check">${servicos.map((s, i) => `<li>${esc(s)}${i === servicos.length - 1 ? '.' : ';'}</li>`).join('')}</ul>`
    : `<p class="cm-p">${BLANK}</p>`;

  doc.section(
    `${rodape(base, e.email, e.telefone)}${titulo}<p class="cm-sub">${esc(T.subtitulo)}</p><div class="cm-ident">${ident.join('')}</div>` +
      `<p class="cm-sub cm-gap">${esc(T.solucaoTitulo)}</p>${solucao}` +
      `<p class="cm-sub cm-gap">${esc(T.servicosTitulo)}</p>${lista}`,
    { break: false, cls: 'cm-sec' },
  );

  // ---- página 2: resumo (valores), nota, condições gerais
  const itens = (d.itens || []).filter((it) => itemTotal(it) > 0);
  const linhas = (itens.length ? itens : d.itens || []).map(
    (it) => `<tr><td>${esc(itemLabel(it))}</td><td class="cm-v">${itemTotal(it) > 0 ? valorCell(itemTotal(it)) : 'Incluso'}</td></tr>`,
  );
  const subtotal = round2((d.itens || []).reduce((s, it) => s + itemTotal(it), 0));
  const desconto = round2(d.desconto);
  const avista = round2(d.valorAvista);
  const parcelas = Math.max(1, Math.trunc(num(d.parcelas)) || 1);
  const prazo = round2(d.valorPrazo);
  const tot: string[] = [];
  tot.push(`<tr class="cm-tot cm-tot1"><td><b>VALOR TOTAL DOS SERVIÇOS</b></td><td class="cm-v">${valorCell(subtotal)}</td></tr>`);
  if (desconto > 0) tot.push(`<tr class="cm-tot"><td><b>DESCONTO</b></td><td class="cm-v">− ${valorCell(desconto)}</td></tr>`);
  tot.push(`<tr class="cm-tot"><td><b>VALOR TOTAL DA PROPOSTA (À VISTA)</b></td><td class="cm-v"><b>${valorCell(avista, true)}</b></td></tr>`);
  if (parcelas > 1 && prazo > 0) {
    const parcela = round2(prazo / parcelas);
    tot.push(
      `<tr class="cm-tot"><td><b>VALOR PROPOSTA A PRAZO 01 + ${pad2(parcelas - 1)}</b></td><td class="cm-v"><b>${valorCell(prazo, true)}</b><span class="cm-parc">${parcelas}× de ${esc(formatBRL(parcela))}</span></td></tr>`,
    );
  }
  const tabela = `<table class="cm-resumo pg-norepeat"><colgroup><col style="width:68%"><col style="width:32%"></colgroup><thead><tr><th class="cm-th-d">Descrição</th><th class="cm-th-v">Valor</th></tr></thead><tbody>${linhas.join('')}${tot.join('')}</tbody></table>`;

  const validade = txt(d.validade) ? fmt(d.validade) : '____/____/______';
  const condicoes = (d.condicoes || [])
    .map((x) => txt(x))
    .filter(Boolean)
    .map((x) => `<li>${esc(x).replace(/\{\{\s*validade\s*\}\}/g, esc(validade)).replace(/\{\{\s*([\w.]+)\s*\}\}/g, '<span class="cm-unk">[[$1]]</span>')}</li>`);
  const obs = txt(d.observacoes);

  doc.section(
    `${titulo}<p class="cm-sub">${esc(T.resumoTitulo)}</p>${tabela}` +
      `<p class="cm-nota">${richTpl(T.notaExames)}</p>` +
      (condicoes.length ? `<div class="cm-keep-head"><p class="cm-sub">${esc(T.condicoesTitulo)}</p></div><ul class="cm-bul">${condicoes.join('')}</ul>` : '') +
      (obs ? `<p class="cm-sub cm-gap">${esc(T.observacoesTitulo)}</p><p class="cm-p cm-pre">${esc(obs)}</p>` : ''),
    { cls: 'cm-sec' },
  );

  return doc.render(cabecalho(base));
}

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

/** Mapa marcador → HTML (valores já escapados). */
function marcadores(d: ContratoDocData): Record<string, string> {
  const e = d.empresa;
  const c = d.cliente;
  const colab = Math.trunc(num(d.colaboradores));
  const parcelas = Math.max(1, Math.trunc(num(d.parcelas)) || 1);
  const total = round2(d.valorTotal);
  const parcela = round2(d.valorParcela) || round2(total / parcelas);
  const dia = Math.trunc(num(d.diaVencimento));
  const vig = Math.trunc(num(d.vigenciaMeses));
  const cpf = (v: string): string => (txt(v) ? esc(txt(v)) : BLANK);

  const representante = `${val(e.representante_nome)}, RG nº ${val(e.representante_rg)}, CPF nº ${cpf(e.representante_cpf)}`;
  const sindico = `${val(c.sindicoNome)}, CPF nº ${cpf(c.sindicoCpf)}`;
  const diaTxt = dia > 0 ? String(dia) : '';

  let forma: string;
  if (parcelas <= 1) {
    forma = `em <b>parcela única de ${total > 0 ? esc(formatBRL(total)) : BLANK}</b>, na assinatura deste contrato`;
  } else {
    const rest = parcelas - 1;
    forma =
      `em <b>${esc(numeroComExtenso(parcelas, true))} parcelas mensais de ${parcela > 0 ? esc(formatBRL(parcela)) : BLANK}</b>, ` +
      `sendo a primeira na assinatura deste contrato e as demais em ${esc(numeroComExtenso(rest, true))} ${rest === 1 ? 'parcela mensal' : 'parcelas mensais consecutivas'}, ` +
      `com vencimento todo dia ${diaTxt ? esc(diaTxt) : BLANK} de cada mês`;
  }

  return {
    'contratada.razao_social': val(e.razao_social),
    'contratada.nome_fantasia': val(e.nome_fantasia),
    'contratada.cnpj': val(e.cnpj),
    'contratada.endereco': val(enderecoCompleto(e.endereco, e.cidade_uf)),
    'contratada.cep': val(e.cep),
    'contratada.representante': representante,
    'contratante.razao_social': val(txt(c.razaoSocial) || txt(c.nomeFantasia)),
    'contratante.nome_fantasia': val(c.nomeFantasia),
    'contratante.cnpj': val(c.cnpj),
    'contratante.endereco': val(enderecoCompleto(c.endereco, c.cidadeUf)),
    'contratante.cep': val(c.cep),
    'contratante.sindico': sindico,
    servicos: (d.servicos || []).map((s) => txt(s).replace(/[.;]+$/, '')).filter(Boolean).map(esc).join('; ') || BLANK,
    colaboradores: colab > 0 ? String(colab) : BLANK,
    colaboradores_extenso: colab > 0 ? esc(numeroComExtenso(colab)) : BLANK,
    valor_total: total > 0 ? esc(formatBRL(total)) : BLANK,
    valor_total_extenso: total > 0 ? esc(valorComExtenso(total)) : BLANK,
    parcelas: String(parcelas),
    parcelas_extenso: esc(numeroComExtenso(parcelas, true)),
    valor_parcela: parcela > 0 ? esc(formatBRL(parcela)) : BLANK,
    parcelas_restantes: esc(numeroComExtenso(parcelas - 1, true)),
    dia_vencimento: diaTxt ? esc(diaTxt) : BLANK,
    forma_pagamento: forma,
    vigencia_meses: vig > 0 ? String(vig) : BLANK,
    vigencia_extenso: vig > 0 ? esc(numeroComExtenso(vig)) : BLANK,
    foro: val(e.foro),
    cidade: val(e.cidade_uf),
    data_assinatura: txt(d.dataAssinatura) ? esc(dataExtenso(d.dataAssinatura)) : BLANK,
    numero: val(d.numero),
  };
}

/** Escapa a linha do template, aplica **negrito** e troca os marcadores. */
function linha(s: string, m: Record<string, string>): string {
  return richTpl(s).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_x, k: string) => (k in m ? m[k] : `<span class="cm-unk">[[${esc(k)}]]</span>`));
}

const RX_PARAG = /^(§\s*\d+\s*[º°o]?|Par[áa]grafo\s+(?:[úu]nico|primeiro|segundo|terceiro|quarto|quinto|sexto|s[ée]timo|oitavo|nono|d[ée]cimo)\s*[.:–-]?)\s*/i;

/** Corpo de uma cláusula conforme a convenção de comercial-texts.ts. */
function corpoClausula(texto: string, d: ContratoDocData, m: Record<string, string>): string {
  const out: string[] = [];
  let lista: { tipo: 'ul' | 'ol'; itens: string[] } | null = null;
  const fecha = (): void => {
    if (!lista) return;
    out.push(
      lista.tipo === 'ul'
        ? `<ul class="cm-bul">${lista.itens.map((x) => `<li>${x}</li>`).join('')}</ul>`
        : `<ol class="cm-rom">${lista.itens.map((x, i) => `<li><span class="cm-rn">${romano(i + 1)} –</span><span class="cm-rt">${x}</span></li>`).join('')}</ol>`,
    );
    lista = null;
  };
  const item = (tipo: 'ul' | 'ol', html: string): void => {
    if (lista && lista.tipo !== tipo) fecha();
    if (!lista) lista = { tipo, itens: [] };
    lista.itens.push(html);
  };

  for (const raw of String(texto || '').split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    if (/^\{\{\s*servicos\s*\}\}$/.test(l)) {
      fecha();
      const sv = (d.servicos || []).map((s) => txt(s).replace(/[.;]+$/, '').trim()).filter(Boolean);
      if (!sv.length) item('ol', BLANK);
      sv.forEach((s, i) => item('ol', linha(s, m) + (i === sv.length - 1 ? '.' : ';')));
      fecha();
      continue;
    }
    const b = /^-\s+(.*)$/.exec(l);
    if (b) {
      item('ul', linha(b[1], m));
      continue;
    }
    const r = /^#\s+(.*)$/.exec(l);
    if (r) {
      item('ol', linha(r[1], m));
      continue;
    }
    fecha();
    const p = RX_PARAG.exec(l);
    if (p && !l.startsWith('**')) {
      out.push(`<p class="cm-p"><b>${esc(p[1].trim())}</b> ${linha(l.slice(p[0].length), m)}</p>`);
    } else {
      out.push(`<p class="cm-p">${linha(l, m)}</p>`);
    }
  }
  fecha();
  return out.join('');
}

export function buildContrato(d: ContratoDocData): string {
  const base = d.assetsBase || '';
  const e = d.empresa;
  const c = d.cliente;
  const m = marcadores(d);
  const doc = new DocBuilder('comercial');

  const blocos: string[] = [];
  let n = 0;
  (d.clausulas || []).forEach((cl: ClausulaContrato) => {
    const titulo = txt(cl?.titulo);
    const corpo = corpoClausula(cl?.texto || '', d, m);
    if (!titulo) {
      if (corpo) blocos.push(`<div class="cm-cl cm-cl-sem">${corpo}</div>`);
      return;
    }
    let t: string;
    if (/^cl[áa]usula\b/i.test(titulo)) t = titulo;
    else {
      n += 1;
      t = `CLÁUSULA ${ordinalFeminino(n).toUpperCase()} – ${titulo}`;
    }
    blocos.push(`<div class="cm-cl"><h2 class="cm-h">${linha(t, m)}</h2>${corpo}</div>`);
  });

  const cidade = txt(e.cidade_uf);
  const ano = new Date().getFullYear();
  const data = txt(d.dataAssinatura)
    ? `${cidade ? esc(cidade) : BLANK}, ${esc(dataExtenso(d.dataAssinatura))}.`
    : `${cidade ? esc(cidade) : BLANK}, _____ de ____________________ de ${ano}.`;

  const contratadaNome = txt(e.razao_social);
  const contratanteNome = txt(c.razaoSocial) || txt(c.nomeFantasia);
  const assin = (nome: string, papel: string, quem: string): string =>
    `<div class="cm-ass"><div class="cm-ass-l"></div><p class="cm-ass-n">${nome ? esc(nome) : BLANK}</p>${quem ? `<p class="cm-ass-q">${esc(quem)}</p>` : ''}<p class="cm-ass-p">${esc(papel)}</p></div>`;
  const testemunha = (i: number): string =>
    `<div class="cm-test"><div class="cm-ass-l"></div><p>${i}. Nome: ______________________________</p><p>CPF: ________________________________</p></div>`;

  const repr = txt(e.representante_nome);
  const sind = txt(c.sindicoNome);
  const fecho =
    `<div class="cm-assinaturas pg-keep"><div class="cm-fecho"><p class="cm-p">${esc(CONTRATO_TEXTOS.fecho)}</p><p class="cm-data">${data}</p></div>` +
    `<div class="cm-ass-g">${assin(contratadaNome, 'CONTRATADA', repr ? `Representante legal: ${repr}` : '')}${assin(
      contratanteNome,
      'CONTRATANTE',
      sind ? `Síndico(a): ${sind}` : '',
    )}</div><p class="cm-test-t">Testemunhas:</p><div class="cm-test-g">${testemunha(1)}${testemunha(2)}</div></div>`;

  doc.section(rodape(base, e.email, e.telefone), { break: false, cls: 'cm-sec cm-sec-rod' });
  doc.section(`<h1 class="cm-titulo cm-titulo-ct">${esc(CONTRATO_TEXTOS.titulo)}</h1>${blocos.join('')}${fecho}`, {
    break: false,
    cls: 'cm-sec',
  });

  return doc.render(cabecalho(base));
}
