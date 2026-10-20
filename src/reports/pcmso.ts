// Port of v8-src/js/pcmso.js (PCMSOData.plan): exam planning per função.
import type { LegacyProject, LegacyRisco } from './types';

export interface PcmsoExame {
  exame: string;
  esocial: string;
  tipos: string;
  periodo: string;
  motivo: string;
}

export interface PcmsoFuncaoPlan {
  funcao: string;
  setor: string;
  qtd: string;
  atividades: string;
  riscos: LegacyRisco[];
  exames: PcmsoExame[];
}

export interface PcmsoPlan {
  medico: { nome: string; crm: string };
  byFunc: PcmsoFuncaoPlan[];
  riscos: LegacyRisco[];
  nExames: number;
  nFuncoes: number;
}

export const PCMSO_BASE: PcmsoExame = { exame: 'Avaliação clínica ocupacional', esocial: '0295', tipos: 'A / P / R / M / D', periodo: 'Anual', motivo: 'NR-7 — avaliação clínica de todos os trabalhadores' };
const HEMO: PcmsoExame = { exame: 'Hemograma completo', esocial: '0693', tipos: 'A / P / D', periodo: 'Anual', motivo: 'Exame complementar de base (eSocial tabela 27)' };

function addUnique(arr: PcmsoExame[], item: PcmsoExame): void {
  if (!arr.some((x) => x.exame === item.exame)) arr.push(item);
}

function extras(r: LegacyRisco, funcao: string): PcmsoExame[] {
  const g = String(r.grupo || '').toLowerCase();
  const p = (String(r.perigo || '') + ' ' + String(r.dano || '') + ' ' + String(r.fonte || '')).toLowerCase();
  const f = String(funcao || r.funcao || r.ghe || '').toLowerCase();
  const list: PcmsoExame[] = [];
  if (/ru[ií]do|auditiv|barulho/.test(p + f) || /porteiro|vigilante/.test(f))
    list.push({ exame: 'Audiometria tonal', esocial: '0281', tipos: 'A / P / D', periodo: 'Anual', motivo: r.perigo || 'Exposição a ruído / comunicação no trabalho' });
  if (/poeira|fumos|vapor|químico|cloro|limpeza|solvente|gás|produto qu[ií]m/.test(p) || g.includes('quím'))
    list.push({ exame: 'Espirometria', esocial: '0523', tipos: 'A / P / D', periodo: 'Anual', motivo: r.perigo || 'Risco químico / respiratório' });
  if (/biol|esgoto|lixo|res[ií]duo|secre|limpeza|jardin|fossa/.test(p + f) || g.includes('biol'))
    list.push({ exame: 'Avaliação de risco biológico e atualização vacinal', esocial: '', tipos: 'A / P', periodo: 'Anual', motivo: r.perigo || 'Risco biológico' });
  if (/ergo|postura|levan|lomb|repetitiv|sobrecarga|peso/.test(p) || g.includes('ergo'))
    list.push({ exame: 'Avaliação osteomuscular', esocial: '', tipos: 'A / P / R', periodo: 'Anual', motivo: r.perigo || 'Risco ergonômico' });
  if (/vis[aã]o|altura|elétr|motorista|porteiro|vigilante|queda/.test(p + f) || g.includes('acidente'))
    list.push({ exame: 'Acuidade visual', esocial: '0105', tipos: 'A / P', periodo: 'Anual', motivo: r.perigo || 'Função de vigilância / risco de acidente' });
  if (/psico|ass[eé]dio|estresse|mental|burnout/.test(p) || g.includes('psico'))
    list.push({ exame: 'Avaliação de saúde mental relacionada ao trabalho', esocial: '', tipos: 'A / P / R', periodo: 'Anual', motivo: r.perigo || 'Risco psicossocial' });
  if (/calor|t[ée]rmic/.test(p))
    list.push({ exame: 'Avaliação clínica para sobrecarga térmica', esocial: '', tipos: 'A / P', periodo: 'Anual', motivo: r.perigo || 'Exposição ao calor' });
  return list;
}

function linkedRiscos(riscos: LegacyRisco[], nome: string): LegacyRisco[] {
  return (riscos || []).filter((r) => {
    const rf = String(r.funcao || '').trim();
    const rg = String(r.ghe || '').trim();
    if (!rf && !rg) return true;
    const n = String(nome || '').toLowerCase();
    return rf === nome || rg === nome || rf.toLowerCase() === n || rg.toLowerCase().includes(n);
  });
}

export function pcmsoPlanFor(p: LegacyProject): PcmsoPlan {
  const funcoes = p.funcoes || [];
  const riscos = p.riscos || [];
  let names = funcoes.map((f) => f.nome || '').filter(Boolean);
  if (!names.length) names = [...new Set(riscos.map((r) => r.funcao || r.ghe || '').filter(Boolean))];
  if (!names.length) names = ['Trabalhadores do condomínio'];
  const byFunc = names.map((nome) => {
    const f = funcoes.find((x) => x.nome === nome) || { nome, quantidade: '', setor: '', atividades: '' };
    const linked = linkedRiscos(riscos, nome);
    const exames: PcmsoExame[] = [{ ...PCMSO_BASE }, { ...HEMO }];
    linked.forEach((r) => extras(r, nome).forEach((e) => addUnique(exames, e)));
    return { funcao: f.nome || '', setor: f.setor || '', qtd: f.quantidade || '', atividades: f.atividades || '', riscos: linked, exames };
  });
  return {
    medico: { nome: p.empresa?.medicoTrabalho || '', crm: p.empresa?.crmMedico || '' },
    byFunc,
    riscos,
    nExames: byFunc.reduce((a, f) => a + f.exames.length, 0),
    nFuncoes: byFunc.length,
  };
}
