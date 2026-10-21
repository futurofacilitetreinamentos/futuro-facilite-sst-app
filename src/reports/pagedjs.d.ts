// Minimal typings for the parts of Paged.js (pagedjs@0.4.3) used by paginate.ts.
declare module 'pagedjs' {
  export interface PagedFlow {
    total: number;
    pages: unknown[];
    performance: number;
  }

  export interface PagedChunker {
    source: DocumentFragment;
    pagesArea: HTMLElement;
    destroy(): void;
  }

  export interface PagedPolisher {
    destroy(): void;
  }

  export class Previewer {
    constructor(options?: Record<string, unknown>);
    polisher: PagedPolisher;
    chunker: PagedChunker;
    preview(content: string | DocumentFragment, stylesheets: (string | Record<string, string>)[], renderTo: HTMLElement): Promise<PagedFlow>;
  }

  export class Handler {
    constructor(chunker: unknown, polisher: unknown, caller: unknown);
    chunker: PagedChunker;
  }

  export function registerHandlers(...handlers: unknown[]): void;
}
