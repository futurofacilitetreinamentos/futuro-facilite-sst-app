import { useState } from 'react'
import { buildDocContext } from '../lib/legacy'
import { printDoc } from '../reports'
import type { DocContext } from '../reports/types'
import { useCondo } from '../state/CondoProvider'
import { Modal } from './ui'

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

  const cls = small ? ' small' : ''
  return (
    <>
      <button className={'outline' + cls} disabled={busy || disabled} onClick={async () => setHtml(await make())}>
        {busy ? 'Gerando…' : 'Prévia'}
      </button>
      <button className={'dark' + cls} disabled={busy || disabled} onClick={async () => { const h = await make(); if (h) printDoc(h) }}>
        PDF
      </button>
      {html && (
        <Modal title={title} wide onClose={() => setHtml(null)}
          actions={<button className="primary" onClick={() => printDoc(html)}>Imprimir / PDF</button>}>
          <div className="report-preview doc-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </Modal>
      )}
    </>
  )
}
