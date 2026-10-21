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
  /** Texto da opção vazia dos selects (padrão "— selecione —") */
  emptyLabel?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email'
  maxLength?: number
}

/** Opções para campos sim/não/não avaliado gravados como boolean | null */
export const BOOL_OPTIONS: Option[] = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' },
]

/** Converte o valor de um select BOOL_OPTIONS ('' = não avaliado) para boolean | null */
export function toBool(v: unknown): boolean | null {
  if (v === true || v === 'true') return true
  if (v === false || v === 'false') return false
  return null
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
        <option value="">{def.emptyLabel ?? '— selecione —'}</option>
        {normOptions(def.options).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  } else {
    input = (
      <input
        {...common} type={def.type ?? 'text'} min={def.min} max={def.max} inputMode={def.inputMode} maxLength={def.maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <label className={def.span ? 'span2' : undefined}>
      {def.label}
      {input}
    </label>
  )
}

/** Grupo recolhível de campos dentro de um formulário (ocupa a linha inteira). */
export function Collapsible({
  title, hint, children, defaultOpen,
}: { title: string; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="span2 collapsible" open={defaultOpen}>
      <summary>
        {title}
        {hint && <span>{hint}</span>}
      </summary>
      <div className="form-grid two">{children}</div>
    </details>
  )
}

/** Máscara 00000-000 */
export function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
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
