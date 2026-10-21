// Page model of the generated documents (phase A engine).
//
// Builders emit FLOWING HTML: a root `<div class="pgr-doc doc-<kind>">` whose
// direct children are `<section>` blocks. The paginator (paginate.ts, Paged.js)
// cuts them into A4 sheets, so nothing is clipped any more. Page geometry,
// letterhead and typography live in doc.css.
//
// Hooks a builder can use (all are plain CSS classes on a top-level <section>):
//   pg-break      → starts on a new page (break-before: page)
//   pg-landscape  → named page `paisagem` (A4 landscape, starts on a new page)
//   pg-pretexto   → named page `pretexto`: letterhead without "Página | N"
//                   (revisões, apresentação, sumário). Starts on a new page.
//   pg-capa       → named page `capa`: no margins, no letterhead (cover only)
// Inside a section:
//   <div class="pg-break-before"></div> / class pg-break on any block → new page
//   pg-keep (break-inside: avoid) on any block that must not be split
//   tables: <thead> rows are repeated on continuation pages unless the table
//   has class pg-norepeat; rows never split.
//
// The sumário is built from the headings registered through DocBuilder
// (h1/h2/h3/title) and gets real page numbers from Paged.js target-counter().
import { esc } from './html';

export type TocLevel = 0 | 1 | 2 | 3;

export interface TocEntry {
  level: TocLevel;
  /** Number without trailing dot ('4.1'); '' for unnumbered entries. */
  num: string;
  title: string;
  id: string;
}

export interface SectionOpts {
  /** Start on a new page (default true). Ignored when landscape/pretexto change the named page (always breaks). */
  break?: boolean;
  /** A4 landscape page(s). */
  landscape?: boolean;
  /** Pre-text page: letterhead without page number. */
  pretexto?: boolean;
  /** Extra classes. */
  cls?: string;
}

export interface HeadingOpts {
  /** Register in the sumário (default true). */
  toc?: boolean;
  /** Extra classes on the heading. */
  cls?: string;
}

const TOC_MARK = '<!--PG-SUMARIO-->';

/** Collects sections + sumário entries of one document. */
export class DocBuilder {
  readonly kind: string;
  private readonly sections: string[] = [];
  private readonly toc: TocEntry[] = [];
  private seq = 0;
  private cover = '';

  constructor(kind: string) {
    this.kind = kind;
  }

  private nextId(): string {
    this.seq += 1;
    return `${this.kind}-s${this.seq}`;
  }

  /** Numbered heading. `num` without trailing dot ('1', '4.1', '7.1.1'). Title is plain text (escaped; printed uppercase by CSS). */
  h(level: 1 | 2 | 3, num: string, title: string, opts: HeadingOpts = {}): string {
    const id = this.nextId();
    if (opts.toc !== false) this.toc.push({ level, num, title, id });
    const tag = `h${level}`;
    const n = num ? `<span class="pg-hn">${esc(num)}.</span>` : '';
    return `<${tag} class="pg-h pg-h${level}${opts.cls ? ' ' + opts.cls : ''}" id="${id}">${n}<span class="pg-ht">${esc(title)}</span></${tag}>`;
  }

  h1(num: string, title: string, opts?: HeadingOpts): string {
    return this.h(1, num, title, opts);
  }

  h2(num: string, title: string, opts?: HeadingOpts): string {
    return this.h(2, num, title, opts);
  }

  h3(num: string, title: string, opts?: HeadingOpts): string {
    return this.h(3, num, title, opts);
  }

  /**
   * Unnumbered title (APRESENTAÇÃO, ANEXO, APÊNDICE A – …). `toc` = sumário level
   * (omit to keep it out of the sumário). Rendered as a level-1 heading look.
   */
  title(text: string, toc?: TocLevel, cls = ''): string {
    const id = this.nextId();
    if (toc !== undefined) this.toc.push({ level: toc, num: '', title: text, id });
    return `<h1 class="pg-h pg-h1 pg-hu${cls ? ' ' + cls : ''}" id="${id}"><span class="pg-ht">${esc(text)}</span></h1>`;
  }

  /** Sub-title that is not part of the numbering nor of the sumário (bold, uppercase). */
  sub(text: string): string {
    return `<h4 class="pg-sub">${esc(text)}</h4>`;
  }

  /** Placeholder replaced by the sumário when the document is rendered (put it inside a section). */
  sumario(): string {
    return TOC_MARK;
  }

  setCover(html: string): void {
    this.cover = html;
  }

  /** Adds a top-level section. */
  section(html: string, opts: SectionOpts = {}): void {
    const cls = ['pg-sec'];
    if (opts.break !== false) cls.push('pg-break');
    if (opts.landscape) cls.push('pg-landscape');
    if (opts.pretexto) cls.push('pg-pretexto');
    if (opts.cls) cls.push(opts.cls);
    this.sections.push(`<section class="${cls.join(' ')}">${html}</section>`);
  }

  entries(): readonly TocEntry[] {
    return this.toc;
  }

  /** Final HTML. `logo` = letterhead logo URL (used by the paginator). */
  render(logo: string): string {
    const body = this.sections.join('').replace(TOC_MARK, sumarioHtml(this.toc));
    return `<div class="pgr-doc doc-${esc(this.kind)}" data-logo="${esc(logo)}">${this.cover}${body}</div>`;
  }
}

/** Sumário: uppercase entries, indentation per level, dotted leaders, page number via target-counter (doc.css). */
export function sumarioHtml(entries: readonly TocEntry[]): string {
  const rows = entries
    .map((e) => `<a class="pg-toc-row pg-toc-l${e.level}" href="#${esc(e.id)}"><span class="pg-toc-n">${e.num ? esc(e.num) + '.' : ''}</span><span class="pg-toc-t">${esc(e.title)}</span><span class="pg-toc-d"></span></a>`)
    .join('');
  return `<div class="pg-toc"><h2 class="pg-toc-title">Sumário</h2>${rows}</div>`;
}

/** Table caption: "Tabela: texto" (label bold-italic, text italic). */
export function caption(text: string, label = 'Tabela:'): string {
  return `<p class="pg-caption"><b><i>${esc(label)}</i></b> <i>${esc(text)}</i></p>`;
}

/** Paragraph(s) of body text (escaped). */
export function para(text: string, cls = ''): string {
  return `<p class="pgr-text${cls ? ' ' + cls : ''}">${esc(text)}</p>`;
}

/** Bullet list (items escaped). */
export function bullets(items: readonly string[]): string {
  return `<ul class="pg-ul">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
}
