// printDoc: paginates the document (Paged.js, see paginate.ts) into #printHost,
// prints it exactly once (landscape sheets print landscape through the named
// @page rules in report.css) and removes the host afterwards.

import { paginate } from './paginate';
import type { PaginatedDoc } from './paginate';

const HOST_ID = 'printHost';
const SETTLE_MS = 150;

export interface PrintOptions {
  /** Max wait for images after pagination (default 4000 ms). */
  timeoutMs?: number;
}

let current: { host: HTMLElement; doc: PaginatedDoc | null } | null = null;

function teardown(): void {
  if (!current) return;
  current.doc?.destroy();
  current.host.remove();
  current = null;
}

/**
 * Renders `html` (a builder result) paginated into `<div id="printHost">`,
 * calls window.print() once and cleans up after `afterprint`. Resolves when
 * printing is done (or immediately if a newer call replaced this one).
 */
export async function printDoc(html: string, opts: PrintOptions = {}): Promise<void> {
  teardown();
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  const mine = { host, doc: null as PaginatedDoc | null };
  current = mine;
  try {
    mine.doc = await paginate(html, host, { imageTimeoutMs: opts.timeoutMs });
  } catch (err) {
    if (current === mine) teardown();
    throw err;
  }
  if (current !== mine) {
    mine.doc.destroy();
    host.remove();
    return;
  }
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  if (current !== mine) return;
  return new Promise<void>((resolve) => {
    let done = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const finish = (): void => {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', finish);
      if (fallback !== undefined) clearTimeout(fallback);
      if (current === mine) teardown();
      resolve();
    };
    window.addEventListener('afterprint', finish);
    window.print();
    // Browsers that never fire afterprint: clean up after a long grace period.
    fallback = setTimeout(finish, 60_000);
  });
}
