// NR-1 / DRPS — Diagnóstico de riscos psicossociais relacionados ao trabalho.
// Page model: see layout.ts.
import type { DocContext } from './types';
import { esc } from './html';
import { NR1_TEXTS } from './evolue';
import { scoreDrps } from './drps';
import { caption, DocBuilder } from './layout';
import {
  AGRAVO_FALLBACK,
  apresentacaoSection,
  assets,
  cover,
  DASH,
  DRPS_ESCALA,
  drpsRows,
  drpsSetores,
  drpsTopics,
  emp,
  identTable,
  respBlock,
  revisoesSection,
  sumarioSection,
} from './common';

export function buildNR1(ctx: DocContext): string {
  const p = ctx.project;
  const a = assets(ctx);
  const e = emp(p);
  const T = NR1_TEXTS;
  const dr = scoreDrps(ctx.drps || []);
  const topics = drpsTopics(dr);
  const nResp = dr.n || 0;
  const setores = drpsSetores(dr);
  const rows = drpsRows(topics, nResp);
  const fontes = topics
    .map((t) => {
      const cls = t.gravidadeN >= 3 ? ' class="alta"' : '';
      return `<tr${cls}><td>${esc(t.nome)}</td><td>${nResp ? esc(t.gravidade || DASH) : 'A avaliar'}</td><td>${esc(t.fonte || '')}</td></tr>`;
    })
    .join('');
  const d = new DocBuilder('nr1');

  d.setCover(
    cover(a, e, {
      badge: 'NR-1',
      title: 'Diagnóstico de<br>riscos psicossociais<br>relacionados ao trabalho',
      respNome: e.respSst,
      respFuncao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho',
      regLabel: 'MTE',
      respReg: e.regSst,
    }),
  );
  revisoesSection(d, e, 'Diagnóstico coletivo de riscos psicossociais (DRPS / NR-1)');
  apresentacaoSection(d, T.apresentacao);
  sumarioSection(d);

  d.section(
    `${d.h1('1', 'Identificação da organização')}${caption('Identificação da organização')}${identTable(e)}${d.sub('Responsável técnico')}<table class="pgr-table"><tbody><tr><th style="width:30%">SST</th><td>${esc(e.respSst || DASH)}${e.regSst ? ' · MTE ' + esc(e.regSst) : ''}</td></tr></tbody></table>`,
  );
  d.section(
    `${d.h1('2', 'Objetivo e fundamento legal')}<p class="pgr-text">${esc(T.objetivo)}</p>${d.h1('3', 'Metodologia do DRPS')}<p class="pgr-text">${esc(T.metodo)}</p><div class="pgr-kpi"><span><b>${nResp}</b> resposta(s) coletiva(s)</span><span><b>${(dr.altos || []).length}</b> tópico(s) em gravidade alta</span><span>Setores: ${setores}</span></div><p class="pgr-text">${
      nResp ? 'O diagnóstico abaixo consolida as respostas já registradas neste condomínio.' : 'O DRPS ainda não foi aplicado neste condomínio. As tabelas permanecem abertas até a coleta das respostas dos trabalhadores.'
    }</p>`,
    { break: false },
  );
  d.section(
    `${d.h1('4', 'Resultado coletivo por tópico')}${caption('Resultado coletivo por tópico')}<table class="pgr-table compact"><thead><tr><th>Tópico / fator psicossocial</th><th style="width:16%">Média (1–3)</th><th style="width:16%">Gravidade</th></tr></thead><tbody>${rows}</tbody></table><p class="pgr-text">${DRPS_ESCALA}</p>`,
  );
  d.section(
    `${d.h1('5', 'Fontes geradoras e agravos')}${caption('Fonte geradora por tópico')}<table class="pgr-table compact"><thead><tr><th style="width:30%">Tópico</th><th style="width:14%">Gravidade</th><th>Fonte geradora (circunstâncias)</th></tr></thead><tbody>${fontes}</tbody></table><p class="pgr-text"><b>Possíveis agravos:</b> ${esc(topics[0]?.agravo || AGRAVO_FALLBACK)}</p>`,
  );
  d.section(`${d.h1('6', 'Medidas organizacionais e integração com o PGR')}<p class="pgr-text">${esc(T.medidas)}</p><p class="pgr-text">${esc(T.confidencial)}</p><p class="pgr-text">${esc(T.final)}</p>`);
  d.section(
    respBlock(ctx, d, e, {
      num: '7',
      titulo: 'Responsabilidade técnica',
      texto:
        'A produção técnica contida neste diagnóstico de riscos psicossociais relacionados ao trabalho (NR-1 / DRPS), elaborado com base no cadastro da organização e nas respostas coletivas dos trabalhadores, é de responsabilidade do profissional competente abaixo especificado, sob supervisão da Futuro Facilite Treinamentos.',
      signers: [
        { label: 'Responsável Técnico:', nome: e.respSst, funcao: e.funcaoRespSst || 'Técnico de Segurança do Trabalho', regLabel: 'Nº do registro MTE:', reg: e.regSst },
        { nome: e.responsavelEmpresa || 'Responsável pela organização', funcao: 'Representante da organização' },
      ],
    }),
  );
  return d.render(a.logo);
}
