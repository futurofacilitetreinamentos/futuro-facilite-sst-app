// Browser-only paginator: turns the flowing HTML of a document builder
// (layout.ts) into A4 sheets with Paged.js, then draws our letterhead
// (logo, colour band, "Página | N") on every page except the cover.
// Paged.js is loaded on demand so it stays out of the main bundle.
import baseCss from './doc.css?raw';
// Estilos próprios de cada documento (um arquivo por documento, todos carregados juntos;
// as regras visuais ficam escopadas por .doc-pgr / .doc-ltcat / .doc-pcmso).
import pgrCss from './doc-pgr.css?raw';
import ltcatCss from './doc-ltcat.css?raw';
import pcmsoCss from './doc-pcmso.css?raw';
import osCss from './doc-os.css?raw';

const docCss = [baseCss, pgrCss, ltcatCss, pcmsoCss, osCss].join('\n');

export interface PaginatedDoc {
  /** Number of sheets (cover included). */
  pages: number;
  /** Removes the pages and the styles Paged.js inserted in <head>. */
  destroy(): void;
}

type PagedModule = typeof import('pagedjs');

let loader: Promise<PagedModule> | null = null;

/** Loads Paged.js once and registers our handlers (repeated table headers). */
function loadPaged(): Promise<PagedModule> {
  if (!loader) {
    loader = import('pagedjs').then((mod) => {
      mod.registerHandlers(repeatTableHeaders(mod));
      return mod;
    });
  }
  return loader;
}

interface BreakTokenLike {
  node?: Node | null;
}

/**
 * Paged.js 0.4 does not repeat <thead> on continuation pages. When a page breaks
 * inside a table, the next page's copy of that table gets the source thead back
 * (unless the table has class pg-norepeat).
 */
function repeatTableHeaders(mod: PagedModule): unknown {
  return class RepeatTableHeaders extends mod.Handler {
    private splitRefs: string[] = [];

    afterPageLayout(_page: Element, _p: unknown, breakToken: BreakTokenLike | undefined): void {
      this.splitRefs = [];
      const node = breakToken?.node;
      if (!node) return;
      let el: Element | null = node.nodeType === 1 ? (node as Element) : node.parentElement;
      while (el) {
        if (el.tagName === 'TABLE') {
          const ref = (el as HTMLElement).dataset.ref;
          if (ref) this.splitRefs.push(ref);
        }
        el = el.parentElement;
      }
    }

    layout(wrapper: Element): void {
      for (const ref of this.splitRefs) {
        const table = wrapper.querySelector(`table[data-ref="${ref}"]`);
        if (!table || table.classList.contains('pg-norepeat') || table.querySelector(':scope > thead')) continue;
        const thead = this.chunker.source.querySelector(`table[data-ref="${ref}"] > thead`);
        if (!thead) continue;
        const copy = thead.cloneNode(true) as HTMLElement;
        copy.setAttribute('data-repeated', 'true');
        const after = table.querySelector(':scope > caption, :scope > colgroup');
        table.insertBefore(copy, after ? after.nextSibling : table.firstChild);
      }
    }
  };
}

/** Logo, colour band and page number on every page (not on the cover; no number on pre-text pages). */
function decorate(target: HTMLElement, logo: string): void {
  const pages = Array.from(target.querySelectorAll<HTMLElement>('.pagedjs_page'));
  pages.forEach((page, i) => {
    if (page.classList.contains('pagedjs_capa_page')) return;
    const box = page.querySelector('.pagedjs_pagebox');
    if (!box || box.querySelector('.pg-lh-band')) return;
    if (logo) {
      // logo.jpeg is a square with wide white margins: show the cropped mark (see doc.css).
      const wrap = document.createElement('div');
      wrap.className = 'pg-lh-logo';
      const img = document.createElement('img');
      img.src = logo;
      img.alt = '';
      wrap.appendChild(img);
      box.appendChild(wrap);
    }
    const band = document.createElement('div');
    band.className = 'pg-lh-band';
    box.appendChild(band);
    if (!page.classList.contains('pagedjs_pretexto_page')) {
      const num = document.createElement('div');
      num.className = 'pg-lh-num';
      num.textContent = `Página | ${i + 1}`;
      box.appendChild(num);
    }
  });
}

/** Waits for every <img> under `el` (load or error), at most `timeoutMs`. */
export function waitImages(el: HTMLElement, timeoutMs = 4000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll('img')).filter((img) => !img.complete);
  if (!imgs.length) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let left = imgs.length;
    const done = (): void => {
      left -= 1;
      if (left <= 0) resolve();
    };
    imgs.forEach((img) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
    setTimeout(resolve, timeoutMs);
  });
}

/**
 * Paginates `html` (a builder result: `<div class="pgr-doc doc-x" data-logo>…</div>`)
 * into `target`, which must be attached to the document and not display:none.
 * The target receives the root's classes so the scoped document styles apply.
 */
export async function paginate(html: string, target: HTMLElement, opts: { imageTimeoutMs?: number } = {}): Promise<PaginatedDoc> {
  const mod = await loadPaged();
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const root = tpl.content.querySelector<HTMLElement>('.pgr-doc');
  const logo = root?.dataset.logo || '';
  const inner = root ? root.innerHTML : html;
  target.innerHTML = '';
  target.classList.add('pgr-doc', 'pg-paged');
  if (root) root.classList.forEach((c) => target.classList.add(c));
  const previewer = new mod.Previewer();
  const sheetUrl = new URL('pgr-doc.css', window.location.href).href;
  let flow;
  try {
    flow = await previewer.preview(inner, [{ [sheetUrl]: docCss }], target);
  } catch (err) {
    try {
      previewer.polisher.destroy();
    } catch {
      /* ignore */
    }
    throw err;
  }
  decorate(target, logo);
  await waitImages(target, opts.imageTimeoutMs);
  let destroyed = false;
  return {
    pages: flow.total,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      try {
        previewer.polisher.destroy();
      } catch {
        /* ignore */
      }
      target.innerHTML = '';
    },
  };
}

/** The document stylesheet as text (for un-paginated fallbacks / tests). */
export const DOC_CSS = docCss;
