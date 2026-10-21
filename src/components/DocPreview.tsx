import { useEffect, useRef, useState } from 'react'
import { buildDocContext } from '../lib/legacy'
import { printDoc } from '../reports'
import { DOC_CSS, paginate } from '../reports/paginate'
import type { PaginatedDoc } from '../reports/paginate'
import type { DocContext } from '../reports/types'
import { useCondo } from '../state/CondoProvider'
import { Modal } from './ui'

/**
 * Prévia paginada (Paged.js): as folhas A4 (retrato e paisagem) aparecem como
 * no PDF, reduzidas por escala quando a tela é mais estreita que a folha.
 */
function PagedView({ html }: { html: string }) {
  const outer = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [pages, setPages] = useState(0)

  useEffect(() => {
    const tgt = target.current
    const out = outer.current
    if (!tgt || !out) return
    let cancelled = false
    let doc: PaginatedDoc | null = null
    // Each run renders into its own host, so an aborted run (StrictMode) never touches the live one.
    const host = document.createElement('div')
    tgt.appendChild(host)
    setStatus('loading')

    const fit = () => {
      const b = box.current
      if (!b || !host.isConnected) return
      const sheets = Array.from(host.querySelectorAll<HTMLElement>('.pagedjs_page'))
      if (!sheets.length) return
      const natW = Math.max(...sheets.map((s) => s.offsetWidth)) + 2
      const natH = tgt.offsetHeight
      const avail = out.clientWidth - 24
      const s = Math.min(1, avail / natW)
      tgt.style.width = natW + 'px'
      tgt.style.transform = s < 1 ? `scale(${s})` : ''
      b.style.width = Math.ceil(natW * s) + 'px'
      b.style.height = Math.ceil(natH * s) + 'px'
    }

    paginate(html, host)
      .then((d) => {
        if (cancelled) {
          d.destroy()
          host.remove()
          return
        }
        doc = d
        setPages(d.pages)
        setStatus('ok')
        requestAnimationFrame(fit)
      })
      .catch((err: unknown) => {
        console.error(err)
        if (!cancelled) setStatus('error')
      })

    const ro = new ResizeObserver(() => fit())
    ro.observe(out)
    return () => {
      cancelled = true
      ro.disconnect()
      if (doc) {
        doc.destroy()
        host.remove()
      }
    }
  }, [html])

  return (
    <div ref={outer} className="report-preview doc-preview">
      {status === 'loading' && <div className="pg-preview-status">Paginando o documento…</div>}
      {status === 'ok' && <div className="pg-preview-status" style={{ padding: '0 0 10px' }}>{pages} página(s)</div>}
      {status === 'error' && (
        <>
          <div className="pg-preview-status">Não foi possível paginar a prévia. Conteúdo sem paginação:</div>
          <style>{DOC_CSS.replace(/@page[^{]*\{[^}]*\}/g, '')}</style>
          <div style={{ background: '#fff', padding: '12mm' }} dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
      <div ref={box} style={{ margin: '0 auto', overflow: 'hidden', display: status === 'error' ? 'none' : undefined }}>
        <div ref={target} className="pg-preview-scale" />
      </div>
    </div>
  )
}

/**
 * Botões "Prévia" e "PDF" de um documento. O contexto é montado na hora
 * a partir do banco, para o documento sempre refletir os dados salvos.
 */
export function DocButtons({
  title, build, small, disabled,
}: { title: string; build: (ctx: DocContext) => string; small?: boolean; disabled?: boolean }) {
  const { condo } = useCondo()
  const [html, setHtml] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [printing, setPrinting] = useState(false)

  async function make() {
    setBusy(true)
    try {
      return build(await buildDocContext(condo!.id))
    } catch (e) {
      alert('Não foi possível gerar o documento: ' + (e instanceof Error ? e.message : e))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function print(h: string) {
    setPrinting(true)
    try {
      await printDoc(h)
    } catch (e) {
      alert('Não foi possível imprimir o documento: ' + (e instanceof Error ? e.message : e))
    } finally {
      setPrinting(false)
    }
  }

  const cls = small ? ' small' : ''
  return (
    <>
      <button className={'outline' + cls} disabled={busy || disabled} onClick={async () => setHtml(await make())}>
        {busy ? 'Gerando…' : 'Prévia'}
      </button>
      <button className={'dark' + cls} disabled={busy || printing || disabled} onClick={async () => { const h = await make(); if (h) await print(h) }}>
        {printing ? 'Preparando…' : 'PDF'}
      </button>
      {html && (
        <Modal title={title} wide onClose={() => setHtml(null)}
          actions={<button className="primary" disabled={printing} onClick={() => print(html)}>{printing ? 'Preparando…' : 'Imprimir / PDF'}</button>}>
          <PagedView html={html} />
        </Modal>
      )}
    </>
  )
}
