// Relatório de inspeção SST. Page model: see layout.ts (no pre-text pages).
import type { DocContext, LegacyEmpresa, LegacyInspection } from './types';
import { esc, fmtH } from './html';
import { DocBuilder } from './layout';
import { assets, cardRows, checklistValues, cover, DASH } from './common';

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
    // quem assina o relatório (escolha do condomínio ou padrão da equipe) e a cidade vêm do cadastro
    respSst: ctx.project.empresa?.inspRt || ctx.project.empresa?.respSst || '',
    funcaoRespSst: (ctx.project.empresa?.inspRt ? ctx.project.empresa?.funcaoInspRt : ctx.project.empresa?.funcaoRespSst) || '',
    regSst: (ctx.project.empresa?.inspRt ? ctx.project.empresa?.regInspRt : ctx.project.empresa?.regSst) || '',
    cidadeUf: ctx.project.empresa?.cidadeUf || '',
  };
  const items = checklistValues(d);
  const c = items.filter((i) => i.status === 'Conforme').length;
  const nc = items.filter((i) => i.status === 'Não conforme').length;
  const na = items.filter((i) => i.status === 'Não se aplica').length;
  const pend = items.length - c - nc - na;
  const pct = c + nc > 0 ? Math.round((c / (c + nc)) * 100) : 0;
  const ncs = items.filter((i) => i.status === 'Não conforme');
  const b = new DocBuilder('inspecao');

  b.setCover(
    cover(a, e, {
      badge: 'SST',
      title: 'Relatório de<br>inspeção de segurança<br>do trabalho',
      // responsável técnico SST do condomínio; sem ele, o técnico digitado na inspeção
      respNome: e.respSst || d.tecnico || d.assinaturaTecnico,
      respFuncao: e.respSst ? e.funcaoRespSst || 'Técnico de Segurança do Trabalho' : 'Técnico responsável pela inspeção',
      regLabel: e.respSst && e.regSst ? 'MTE' : 'Relatório',
      respReg: e.respSst && e.regSst ? e.regSst : d.numero,
    }),
  );

  b.section(
    `${b.h1('1', 'Identificação e resumo executivo')}<table class="pgr-table"><tbody><tr><th style="width:24%">Condomínio</th><td colspan="3">${esc(d.condominio || DASH)}</td></tr><tr><th>CNPJ</th><td>${esc(d.cnpj || DASH)}</td><th style="width:18%">Relatório</th><td>${esc(d.numero || DASH)}</td></tr><tr><th>Endereço</th><td colspan="3">${esc(d.endereco || DASH)}</td></tr><tr><th>Síndico / responsável</th><td>${esc(d.sindica || DASH)}</td><th>Data da inspeção</th><td>${fmtH(d.dataVisita)}</td></tr><tr><th>Técnico responsável</th><td colspan="3">${esc(e.respSst || d.tecnico || d.assinaturaTecnico || DASH)}${e.respSst && e.regSst ? ` · Nº do registro MTE: ${esc(e.regSst)}` : ''}</td></tr><tr><th>Contato</th><td colspan="3">${esc(d.telefone || DASH)}${d.emailCondominio ? ' · ' + esc(d.emailCondominio) : ''}</td></tr><tr><th>Colaboradores</th><td colspan="3">Total ${esc(d.totalEmpregados || '0')} · Próprios ${esc(d.proprios || '0')} · Terceirizados ${esc(d.terceirizados || '0')}</td></tr></tbody></table>${b.sub('Resumo da avaliação')}<div class="pgr-kpi"><span><b>${c}</b> conformes</span><span><b>${nc}</b> não conformes</span><span><b>${na}</b> não se aplica</span><span><b>${pend}</b> pendentes</span><span><b>${pct}%</b> conformidade</span></div>${b.sub('Objetivo')}<p class="pgr-text">${esc(d.objetivo || DASH)}</p>${b.sub('Funções e jornadas')}<p class="pgr-text"><b>Funções:</b> ${esc(d.funcoes || DASH)}<br><b>Jornadas:</b> ${esc(d.jornadas || DASH)}</p>`,
  );
  b.section(
    `${b.h1('2', 'Checklist geral')}<table class="pgr-table compact"><colgroup><col style="width:7%"><col style="width:51%"><col style="width:16%"><col style="width:12%"><col style="width:14%"></colgroup><thead><tr><th>Nº</th><th>Item avaliado</th><th>Situação</th><th>Risco</th><th>Prazo</th></tr></thead><tbody>${
      items.map((it, j) => `<tr><td>${j + 1}</td><td>${esc(it.titulo)}</td><td>${esc(it.status || 'Pendente')}</td><td>${esc(it.risco || DASH)}</td><td>${fmtH(it.prazo)}</td></tr>`).join('') ||
      '<tr><td colspan="5">Nenhum item avaliado.</td></tr>'
    }</tbody></table>`,
  );
  let s3 = b.h1('3', 'Não conformidades');
  if (!ncs.length) s3 += `<p class="pgr-text">Não foram registradas não conformidades nos itens avaliados.</p>`;
  ncs.forEach((it, idx) => {
    const photos = it.photos || [];
    s3 += `${b.h2('3.' + (idx + 1), it.titulo || 'Não conformidade')}<table class="pgr-table"><tbody><tr><th style="width:20%">Situação</th><td>Não conforme</td><th style="width:16%">Risco</th><td>${esc(it.risco || DASH)}</td></tr><tr><th>Prazo</th><td>${fmtH(it.prazo)}</td><th>Responsável</th><td>${esc(it.responsavel || 'Administração do condomínio')}</td></tr></tbody></table>${b.sub('Observação técnica')}<p class="pgr-text">${esc(it.obs || 'Não informada')}</p>${b.sub('Medida recomendada')}<p class="pgr-text">${esc(it.acao || 'Não informada')}</p>`;
    if (photos.length) s3 += cardRows(photos.slice(0, 2).map((src) => `<div class="pgr-foto-card"><img src="${esc(src)}" alt=""></div>`));
    if (photos.length > 2) {
      s3 += `${b.sub('Registro complementar')}${cardRows(photos.slice(2).map((src, n) => `<div class="pgr-foto-card"><img src="${esc(src)}" alt=""><b>${esc(it.titulo)} — foto ${n + 3}</b></div>`))}`;
    }
  });
  b.section(s3);
  const allPhotos: { src: string; title: string; status: string }[] = [];
  items.forEach((it) => (it.photos || []).forEach((src) => allPhotos.push({ src, title: it.titulo || '', status: it.status || '' })));
  if (d.fotoCapa) allPhotos.unshift({ src: d.fotoCapa, title: 'Capa da visita', status: '' });
  b.section(
    `${b.h1('4', 'Registro fotográfico')}${
      allPhotos.length
        ? cardRows(allPhotos.map((f) => `<div class="pgr-foto-card"><img src="${esc(f.src)}" alt=""><b>${esc(f.title)}</b><span>${esc(f.status || '')}</span></div>`))
        : `<p class="pgr-text">Nenhuma foto foi anexada nesta inspeção.</p>`
    }`,
  );
  b.section(
    `${b.h1('5', 'Plano de ação')}${
      ncs.length
        ? `<table class="pgr-table compact"><colgroup><col style="width:24%"><col style="width:10%"><col style="width:36%"><col style="width:18%"><col style="width:12%"></colgroup><thead><tr><th>Não conformidade</th><th>Risco</th><th>Medida corretiva</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${ncs
            .map(
              (it) =>
                `<tr><td>${esc(it.titulo)}</td><td>${esc(it.risco || DASH)}</td><td>${esc(it.acao || DASH)}</td><td>${esc(it.responsavel || 'Administração do condomínio')}</td><td>${fmtH(it.prazo)}</td></tr>`,
            )
            .join('')}</tbody></table>`
        : `<p class="pgr-text">Não há ações corretivas registradas.</p>`
    }`,
  );
  b.section(
    `${b.h1('6', 'Conclusão técnica e ciência')}${b.sub('Conclusão')}<p class="pgr-text">${esc(d.conclusao || 'Não informada')}</p>${b.sub('Recomendações gerais')}<p class="pgr-text">${esc(d.recomendacoes || 'Não informadas')}</p><p class="pgr-text">Este relatório registra as condições observadas na data da inspeção. As recomendações devem ser analisadas e implementadas conforme a prioridade dos riscos e a legislação aplicável.</p><div class="pg-sign-grid" style="margin-top:22mm"><div class="pg-sign-block">${esc(d.assinaturaSindica || d.sindica || 'Responsável pelo condomínio')}<br>Responsável pelo condomínio</div>${e.respSst
      ? `<div class="pg-sign-block"><b>Responsável Técnico:</b> ${esc(e.respSst)}<br>${esc(e.funcaoRespSst || 'Técnico de Segurança do Trabalho')}${e.regSst ? `<br><b>Nº do registro MTE:</b> ${esc(e.regSst)}` : ''}</div>`
      : `<div class="pg-sign-block">${esc(d.assinaturaTecnico || d.tecnico || 'Responsável pela inspeção')}<br>Responsável pela inspeção</div>`}</div>`,
  );
  return b.render(a.logo);
}
