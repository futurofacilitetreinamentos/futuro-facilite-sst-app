import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorBox, PanelHead, fmtDate } from '../components/ui'
import { useChildren, useEquipe, useProfiles, useSave } from '../lib/db'
import type { Agendamento } from '../lib/types'
import { useCondo } from '../state/CondoProvider'

const STATUS_BADGE = { agendada: 'warn', realizada: 'ok', cancelada: 'bad' } as const

export default function AgendaPage() {
  const { condo } = useCondo()
  const { data = [] } = useChildren('agendamentos', condo?.id)
  const { data: equipe = [] } = useEquipe()
  const { data: users = [] } = useProfiles()
  const save = useSave<Partial<Agendamento>>('agendamentos')
  const nav = useNavigate()
  const [form, setForm] = useState({ data: '', hora: '', tecnico: '', obs: '' })

  const tecnicos = [...new Set([...equipe.filter((m) => m.tipo === 'sst').map((m) => m.nome), ...users.map((u) => u.nome)].filter(Boolean))]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await save.mutateAsync({ condominio_id: condo!.id, data: form.data, hora: form.hora || null, tecnico: form.tecnico, obs: form.obs })
    setForm({ data: '', hora: '', tecnico: '', obs: '' })
  }

  return (
    <div className="view">
      <form className="panel" onSubmit={submit}>
        <PanelHead eyebrow="AGENDA" title="Agendar inspeção">
          <button className="primary" disabled={save.isPending}>Agendar</button>
        </PanelHead>
        <ErrorBox error={save.error} />
        <div className="form-grid two">
          <label>Data *<input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
          <label>Hora<input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></label>
          <label>
            Técnico
            <input list="tecnicos" value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} />
            <datalist id="tecnicos">{tecnicos.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label>Observações<input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></label>
        </div>
      </form>

      <section className="panel">
        <PanelHead eyebrow="AGENDA" title="Visitas do condomínio" />
        {data.length === 0 && <div className="empty">Nenhuma visita agendada.</div>}
        {data.map((a) => (
          <div className="history-item" key={a.id}>
            <div>
              <div className="history-title">
                {fmtDate(a.data)} {a.hora?.slice(0, 5)} <span className={'badge ' + STATUS_BADGE[a.status]}>{a.status}</span>
              </div>
              <div className="history-meta">{[a.tecnico, a.obs].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="history-actions">
              {a.status === 'agendada' && (
                <>
                  <button className="primary small" onClick={() => nav(`/inspecao/nova?agenda=${a.id}`)}>Iniciar inspeção</button>
                  <button
                    className="outline small"
                    onClick={() => confirm('Cancelar este agendamento?') && save.mutate({ id: a.id, status: 'cancelada' })}
                  >Cancelar</button>
                </>
              )}
              {a.status === 'cancelada' && (
                <button className="outline small" onClick={() => save.mutate({ id: a.id, status: 'agendada' })}>Reabrir</button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
