// Small HTML helpers shared by the document generators (V8Report.esc / fmt).

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** HTML-escape any value (null/undefined → ''). Use for every user-provided string. */
export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (m) => ESC_MAP[m]);
}

/** ISO date `YYYY-MM-DD` → `DD/MM/YYYY`; empty → '-'; anything else returned as is (NOT escaped). */
export function fmt(d?: string | null): string {
  if (!d) return '-';
  const p = String(d).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

/** fmt() + esc(), for direct interpolation into HTML. */
export function fmtH(d?: string | null): string {
  return esc(fmt(d));
}
