import { useEffect, type ReactNode } from 'react'

export function Modal({
  title, onClose, children, wide, actions,
}: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' report-modal' : '')} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <div className="actions">
            {actions}
            <button className="outline" onClick={onClose}>Fechar</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PanelHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="panel-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <div className="error-box">{msg}</div>
}

export function Loading({ text = 'Carregando…' }: { text?: string }) {
  return <div className="loading">{text}</div>
}

// ---------------------------------------------------------------------------
// Campos de formulário controlados
// ---------------------------------------------------------------------------

export type Option = { value: string; label: string }

export type FieldDef<T> = {
  key: keyof T & string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'email' | 'select'
  options?: Option[] | readonly string[]
  required?: boolean
  span?: boolean
  placeholder?: string
  min?: number
  max?: number
}

function normOptions(o: FieldDef<unknown>['options']): Option[] {
  return (o ?? []).map((x) => (typeof x === 'string' ? { value: x, label: x } : x))
}

export function Field<T>({
  def, value, onChange,
}: { def: FieldDef<T>; value: unknown; onChange: (v: string) => void }) {
  const v = value == null ? '' : String(value)
  const common = { value: v, required: def.required, placeholder: def.placeholder }
  let input: ReactNode
  if (def.type === 'textarea') {
    input = <textarea {...common} onChange={(e) => onChange(e.target.value)} />
  } else if (def.type === 'select') {
    input = (
      <select {...common} onChange={(e) => onChange(e.target.value)}>
        <option value="">— selecione —</option>
        {normOptions(def.options).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  } else {
    input = (
      <input {...common} type={def.type ?? 'text'} min={def.min} max={def.max} onChange={(e) => onChange(e.target.value)} />
    )
  }
  return (
    <label className={def.span ? 'span2' : undefined}>
      {def.label}
      {input}
    </label>
  )
}

/** Máscara 00.000.000/0000-00 */
export function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}
