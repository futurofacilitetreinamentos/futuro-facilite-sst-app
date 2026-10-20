// Port of V8Report.printDoc: renders the document into #printHost and prints once.
// Fixes the legacy double print (image-load path and the 1.8 s fallback timer
// both called window.print()).

const HOST_ID = 'printHost';
const IMG_TIMEOUT_MS = 1800;
const SETTLE_MS = 150;

export interface PrintOptions {
  /** Max wait for images before printing anyway (default 1800 ms). */
  timeoutMs?: number;
}

/**
 * Injects `html` into a `<div id="printHost" class="doc-preview">` appended to
 * <body>, waits for its images (or the timeout), calls window.print() exactly
 * once and removes the host after `afterprint`. Resolves when printing is done
 * (or immediately cleaned up if called again before it finished).
 */
export function printDoc(html: string, opts: PrintOptions = {}): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? IMG_TIMEOUT_MS;
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.className = 'doc-preview';
  host.innerHTML = html;
  document.body.appendChild(host);

  return new Promise<void>((resolve) => {
    let printed = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let fallbackCleanup: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      window.removeEventListener('afterprint', cleanup);
      if (fallbackCleanup !== undefined) clearTimeout(fallbackCleanup);
      host.remove();
      resolve();
    };

    const go = (): void => {
      if (printed) return;
      printed = true;
      if (fallback !== undefined) clearTimeout(fallback);
      window.addEventListener('afterprint', cleanup);
      setTimeout(() => {
        if (!host.isConnected) return resolve();
        window.print();
        // Browsers where print() is blocking fire afterprint before returning;
        // for those that never fire it, clean up on the next tick after a long grace period.
        fallbackCleanup = setTimeout(() => {
          if (host.isConnected) cleanup();
        }, 60_000);
      }, SETTLE_MS);
    };

    const imgs = Array.from(host.querySelectorAll('img'));
    let left = imgs.length;
    if (!left) return go();
    const done = (): void => {
      left--;
      if (left <= 0) go();
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
    if (!printed) fallback = setTimeout(go, timeoutMs);
  });
}
