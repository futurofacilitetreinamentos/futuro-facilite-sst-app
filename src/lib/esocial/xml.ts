// Montagem de XML simples (sem dependências). Elementos com valor vazio/undefined
// são omitidos, o que corresponde aos campos opcionais (minOccurs="0") do XSD.

export interface XmlNode {
  n: string
  a?: Record<string, string>
  /** filhos; null/undefined/false são ignorados */
  c?: (XmlNode | null | undefined | false)[]
  /** conteúdo de texto (para elementos simples) */
  t?: string
}

export const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Elemento simples; retorna null quando o valor é vazio (campo omitido). */
export function el(n: string, v: string | number | null | undefined): XmlNode | null {
  if (v === null || v === undefined) return null
  const t = String(v)
  return t === '' ? null : { n, t }
}

/** Grupo; retorna null quando não tem nenhum filho (grupo omitido). */
export function grp(n: string, c: XmlNode['c'], a?: Record<string, string>): XmlNode | null {
  const filhos = (c ?? []).filter(Boolean)
  return filhos.length ? { n, a, c: filhos } : null
}

function render(node: XmlNode, ind: string, out: string[]) {
  const attrs = node.a ? Object.entries(node.a).map(([k, v]) => ` ${k}="${esc(v)}"`).join('') : ''
  const filhos = (node.c ?? []).filter((x): x is XmlNode => Boolean(x))
  if (filhos.length) {
    out.push(`${ind}<${node.n}${attrs}>`)
    for (const f of filhos) render(f, ind + '  ', out)
    out.push(`${ind}</${node.n}>`)
  } else {
    out.push(`${ind}<${node.n}${attrs}>${esc(node.t ?? '')}</${node.n}>`)
  }
}

export function toXml(root: XmlNode): string {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>']
  render(root, '', out)
  return out.join('\n') + '\n'
}
