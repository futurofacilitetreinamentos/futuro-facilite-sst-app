import { useState, type ReactNode } from 'react'
import { ErrorBox, Field, Modal, PanelHead, type FieldDef } from './ui'

/**
 * Lista + modal de edição para uma tabela simples.
 * Cada alteração é gravada no banco na hora (sem botão "salvar cadastro").
 */
export function CrudSection<T extends { id?: string }>({
  eyebrow, title, singular, rows, fields, blank, render, onSave, onRemove, extraForm, notice,
}: {
  eyebrow: string
  title: string
  singular: string
  rows: T[]
  fields: FieldDef<T>[]
  blank: () => T
  render: (row: T) => { title: ReactNode; meta?: ReactNode; side?: ReactNode }
  onSave: (row: T) => Promise<unknown>
  onRemove: (id: string) => Promise<unknown>
  extraForm?: (row: T, set: (patch: Partial<T>) => void) => ReactNode
  notice?: ReactNode
}) {
  const [editing, setEditing] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const set = (patch: Partial<T>) => setEditing((e) => (e ? { ...e, ...patch } : e))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    setError(null)
    try {
      await onSave(editing)
      setEditing(null)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: T) {
    if (!row.id || !confirm(`Excluir ${singular.toLowerCase()}?`)) return
    try {
      await onRemove(row.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="panel">
      <PanelHead eyebrow={eyebrow} title={title}>
        <button className="primary" onClick={() => { setError(null); setEditing(blank()) }}>+ {singular}</button>
      </PanelHead>
      {notice}
      {rows.length === 0 && <div className="empty">Nenhum registro ainda.</div>}
      {rows.map((row, i) => {
        const r = render(row)
        return (
          <div className="entity-card" key={row.id ?? i}>
            <div className="entity-head">
              <div>
                <div className="entity-title">{r.title}</div>
                {r.meta && <div className="entity-meta">{r.meta}</div>}
              </div>
              <div className="entity-actions">
                {r.side}
                <button className="outline" onClick={() => { setError(null); setEditing(row) }}>Editar</button>
                <button className="danger" onClick={() => remove(row)}>Excluir</button>
              </div>
            </div>
          </div>
        )
      })}

      {editing && (
        <Modal title={(editing.id ? 'Editar ' : 'Novo(a) ') + singular.toLowerCase()} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <ErrorBox error={error} />
            <div className="form-grid two">
              {fields.map((f) => (
                <Field key={f.key} def={f} value={editing[f.key]} onChange={(v) => set({ [f.key]: v } as Partial<T>)} />
              ))}
              {extraForm?.(editing, set)}
            </div>
            <div className="actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" className="outline" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
