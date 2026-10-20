import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBox, Field, PanelHead, maskCnpj, type FieldDef } from '../components/ui'
import { useEquipe, useRemove, useSave } from '../lib/db'
import type { Condominio, EquipeTipo } from '../lib/types'
import { useCondo } from '../state/CondoProvider'
import { useAuth } from '../auth/AuthProvider'

type Form = Omit<Condominio, 'id' | 'drps_token' | 'legacy_id' | 'updated_at' | 'num_trabalhadores'> & {
  id?: string
  num_trabalhadores: string
}

const blank = (): Form => ({
  razao_social: '', nome_fantasia: '', cnpj: '', cnae: '', grau_risco: '', num_trabalhadores: '',
  endereco: '', responsavel_empresa: '', contato_empresa: '', email_empresa: '',
  data_elaboracao: new Date().toISOString().slice(0, 10), atividade_empresa: 'Atividades de administração de condomínios prediais',
  resp_sst_id: null, medico_id: null, engenheiro_id: null,
})

const FIELDS: FieldDef<Form>[] = [
  { key: 'razao_social', label: 'Razão social *', required: true, span: true },
  { key: 'nome_fantasia', label: 'Nome fantasia' },
  { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { key: 'cnae', label: 'CNAE' },
  { key: 'grau_risco', label: 'Grau de risco', type: 'select', options: ['1', '2', '3', '4'] },
  { key: 'num_trabalhadores', label: 'Nº de trabalhadores', type: 'number', min: 0 },
  { key: 'data_elaboracao', label: 'Data de elaboração', type: 'date' },
  { key: 'endereco', label: 'Endereço', span: true },
  { key: 'responsavel_empresa', label: 'Responsável (síndico)' },
  { key: 'contato_empresa', label: 'Telefone' },
  { key: 'email_empresa', label: 'E-mail', type: 'email' },
  { key: 'atividade_empresa', label: 'Atividade', span: true },
]

const RESP: { key: 'resp_sst_id' | 'medico_id' | 'engenheiro_id'; tipo: EquipeTipo; label: string }[] = [
  { key: 'resp_sst_id', tipo: 'sst', label: 'Responsável técnico SST' },
  { key: 'medico_id', tipo: 'medico', label: 'Médico do trabalho (PCMSO)' },
  { key: 'engenheiro_id', tipo: 'engenheiro', label: 'Engenheiro de segurança (LTCAT)' },
]

export default function CondominioPage() {
  const { condo, setCondoId } = useCondo()
  const { isAdmin } = useAuth()
  const { data: equipe = [] } = useEquipe()
  const save = useSave<Partial<Condominio>>('condominios')
  const remove = useRemove('condominios')
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const novo = params.get('novo') === '1' || !condo
  const [form, setForm] = useState<Form>(blank)
  const [ok, setOk] = useState('')

  useEffect(() => {
    if (novo) setForm(blank())
    else if (condo) setForm({ ...condo, num_trabalhadores: condo.num_trabalhadores?.toString() ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novo, condo?.id, condo?.updated_at])

  const set = (k: keyof Form, v: string | null) =>
    setForm((f) => ({ ...f, [k]: k === 'cnpj' && v ? maskCnpj(v) : v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { id, num_trabalhadores, ...rest } = form
    const row: Partial<Condominio> = {
      ...rest,
      id: novo ? undefined : id,
      num_trabalhadores: num_trabalhadores === '' ? null : Number(num_trabalhadores),
      data_elaboracao: rest.data_elaboracao || null,
    }
    const saved = await save.mutateAsync(row)
    setCondoId(saved.id)
    setParams({})
    setOk('Cadastro salvo.')
  }

  async function del() {
    if (!condo || !confirm(`Excluir o condomínio "${condo.razao_social}" e TODOS os dados ligados a ele (inspeções, riscos, DRPS)?`)) return
    await remove.mutateAsync(condo.id)
    setCondoId(null)
    nav('/')
  }

  return (
    <div className="view">
      <form className="panel" onSubmit={submit}>
        <PanelHead eyebrow="CADASTRO CENTRAL" title={novo ? 'Novo condomínio' : 'Dados do condomínio'}>
          {!novo && isAdmin && <button type="button" className="danger" onClick={del}>Excluir</button>}
          {novo && condo && <button type="button" className="outline" onClick={() => setParams({})}>Cancelar</button>}
          <button className="primary" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar cadastro'}</button>
        </PanelHead>
        <div className="notice">
          Estes dados alimentam a inspeção, o PGR, PCMSO, LTCAT e o DRPS. Os demais módulos ficam liberados depois que a razão social é salva.
        </div>
        <ErrorBox error={save.error} />
        {ok && <div className="ok-box">{ok}</div>}
        <div className="form-grid two">
          {FIELDS.map((f) => (
            <Field key={f.key} def={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
        <h3 style={{ marginTop: 20 }}>Profissionais responsáveis</h3>
        <div className="form-grid three">
          {RESP.map((r) => {
            const opts = equipe.filter((m) => m.tipo === r.tipo)
            return (
              <label key={r.key}>
                {r.label}
                <select value={form[r.key] ?? ''} onChange={(e) => set(r.key, e.target.value || null)}>
                  <option value="">— nenhum —</option>
                  {opts.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}{m.registro ? ` (${m.registro})` : ''}</option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
        {equipe.length === 0 && (
          <p className="entity-meta">Cadastre os profissionais em <a href="#/equipe">Equipe técnica</a>.</p>
        )}
      </form>
    </div>
  )
}
