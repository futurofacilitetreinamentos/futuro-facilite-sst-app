// Números e valores por extenso (pt-BR) e formatação em reais.
// Funções puras, sem dependências (rodam também fora do Vite, ex.: `npx tsx`).

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** 0 … 999 (fem = concorda com substantivo feminino: uma, duas, duzentas…). */
function ate999(n: number, fem = false): string {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const uni = (u: number): string => (fem && u === 1 ? 'uma' : fem && u === 2 ? 'duas' : UNIDADES[u]);
  const partes: string[] = [];
  if (c) partes.push(fem && c > 1 ? CENTENAS[c].replace(/os$/, 'as') : CENTENAS[c]);
  if (r) {
    if (r < 10) partes.push(uni(r));
    else if (r < 20) partes.push(DEZ_A_DEZENOVE[r - 10]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u ? `${DEZENAS[d]} e ${uni(u)}` : DEZENAS[d]);
    }
  }
  return partes.length ? partes.join(' e ') : 'zero';
}

const ESCALAS: [string, string][] = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
  ['trilhão', 'trilhões'],
];

/**
 * Inteiro não negativo por extenso: 16 → "dezesseis", 1420 → "mil quatrocentos e vinte",
 * 1000000 → "um milhão". Negativos recebem "menos"; frações são truncadas.
 */
export function numeroExtenso(valor: number, feminino = false): string {
  if (!Number.isFinite(valor)) return '';
  let n = Math.trunc(Math.abs(valor));
  if (n === 0) return 'zero';
  const grupos: number[] = [];
  while (n > 0) {
    grupos.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  if (grupos.length > ESCALAS.length) return String(Math.trunc(valor));
  const partes: { txt: string; v: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    let txt: string;
    if (i === 0) txt = ate999(g, feminino);
    else if (i === 1) txt = g === 1 ? 'mil' : `${ate999(g, feminino)} mil`;
    else txt = `${ate999(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`;
    partes.push({ txt, v: g });
  }
  // "e" antes do último grupo quando ele é < 100 ou centena exata (mil e vinte, mil e quinhentos);
  // nos demais casos só espaço (mil quatrocentos e vinte).
  let out = partes[0].txt;
  for (let k = 1; k < partes.length; k++) {
    const p = partes[k];
    const ultimo = k === partes.length - 1;
    out += ultimo && (p.v < 100 || p.v % 100 === 0) ? ` e ${p.txt}` : ` ${p.txt}`;
  }
  return (valor < 0 ? 'menos ' : '') + out;
}

/**
 * Valor em reais por extenso: 2850 → "dois mil oitocentos e cinquenta reais",
 * 237.5 → "duzentos e trinta e sete reais e cinquenta centavos", 1000000 → "um milhão de reais".
 */
export function valorExtenso(valor: number): string {
  if (!Number.isFinite(valor)) return '';
  const totalCentavos = Math.round(Math.abs(valor) * 100);
  const reais = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const txt = numeroExtenso(reais);
    // "de reais" depois de milhão/bilhão exatos ("um milhão de reais", "dois milhões de reais")
    const de = reais >= 1_000_000 && reais % 1_000_000 === 0 ? ' de' : '';
    partes.push(`${txt}${de} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos > 0) partes.push(`${numeroExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  if (!partes.length) return 'zero real';
  return (valor < 0 ? 'menos ' : '') + partes.join(' e ');
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1234.5 → "R$ 1.234,50" (espaço normal, não o NBSP do Intl). Não numérico → "R$ 0,00". */
export function formatBRL(valor: number): string {
  const v = Number.isFinite(valor) ? Math.round(valor * 100) / 100 : 0;
  return BRL.format(v || 0).replace(/ /g, ' ');
}

/** "16 (dezesseis)" — número seguido do extenso entre parênteses (feminino: "2 (duas)"). */
export function numeroComExtenso(n: number, feminino = false): string {
  const v = Math.trunc(Number.isFinite(n) ? n : 0);
  return `${v} (${numeroExtenso(v, feminino)})`;
}

/** "R$ 2.850,00 (dois mil oitocentos e cinquenta reais)" */
export function valorComExtenso(valor: number): string {
  return `${formatBRL(valor)} (${valorExtenso(valor)})`;
}

const ORD_UNID = ['', 'primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta', 'sétima', 'oitava', 'nona'];
const ORD_DEZ = ['', 'décima', 'vigésima', 'trigésima', 'quadragésima', 'quinquagésima', 'sexagésima', 'septuagésima', 'octogésima', 'nonagésima'];

/** Ordinal feminino (1 … 99): 1 → "primeira", 12 → "décima segunda", 21 → "vigésima primeira". */
export function ordinalFeminino(n: number): string {
  const v = Math.trunc(n);
  if (!(v >= 1 && v <= 99)) return String(v);
  const d = Math.floor(v / 10);
  const u = v % 10;
  return [ORD_DEZ[d], ORD_UNID[u]].filter(Boolean).join(' ');
}
