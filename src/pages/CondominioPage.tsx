import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CrudSection } from '../components/CrudSection'
import { ErrorBox, Field, PanelHead, fmtDate, maskCep, maskCnpj, type FieldDef } from '../components/ui'
import { useChildren, useEquipe, useRemove, useSave } from '../lib/db'
import { DOCUMENTOS_REVISAO, type Condominio, type DocRevisao, type EquipeTipo } from '../lib/types'
import { DOCS_ASSINATURA, padraoDe, signatario } from '../lib/signatarios'
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
  // assinantes vazios = usa o padrão marcado na Equipe técnica (lib/signatarios.ts)
  resp_sst_id: null, aux_sst_id: null, inspecao_rt_id: null, nr1_rt_id: null, medico_id: null, ltcat_rt_id: null,
  engenheiro_id: null,
  cep: '', cidade_uf: 'Brasília-DF', ltcat_rt: 'medico',
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
  { key: 'cep', label: 'CEP', placeholder: '00000-000', inputMode: 'numeric', maxLength: 9 },
  { key: 'cidade_uf', label: 'Cidade/UF', placeholder: 'Brasília-DF' },
  { key: 'responsavel_empresa', label: 'Responsável (síndico)' },
  { key: 'contato_empresa', label: 'Telefone' },
  { key: 'email_empresa', label: 'E-mail', type: 'email' },
  { key: 'atividade_empresa', label: 'Atividade', span: true },
]

const TIPO_LABEL: Record<EquipeTipo, string> = { sst: 'Segurança do trabalho', medico: 'Médico do trabalho', engenheiro: 'Engenheiro de segurança' }

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
    setForm((f) => ({ ...f, [k]: k === 'cnpj' && v ? maskCnpj(v) : k === 'cep' && v ? maskCep(v) : v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { id, num_trabalhadores, ...rest } = form
    const row: Partial<Condominio> = {
      ...rest,
      id: novo ? undefined : id,
      num_trabalhadores: num_trabalhadores === '' ? null : Number(num_trabalhadores),
      data_elaboracao: rest.data_elaboracao || null,
    }
    // mantém o campo antigo ltcat_rt coerente com quem foi escolhido para o LTCAT
    const lt = equipe.find((m) => m.id === rest.ltcat_rt_id)
    if (lt) row.ltcat_rt = lt.tipo === 'medico' ? 'medico' : 'engenheiro'
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
        <h3 style={{ marginTop: 24 }}>Quem assina os documentos</h3>
        <p className="entity-meta" style={{ margin: '0 0 12px' }}>
          Deixe em “Padrão” para usar quem está marcado na <a href="#/equipe">Equipe técnica</a>. Escolha outro profissional só
          quando este condomínio for assinado por outra pessoa.
        </p>
        <div className="form-grid two">
          {DOCS_ASSINATURA.map((d) => {
            const padrao = padraoDe(d.doc, equipe)
            const { num_trabalhadores: _n, ...semNum } = form
            void _n
            const efetivo = signatario(d.doc, semNum, equipe)
            const opts = equipe.filter((m) => d.tipos.includes(m.tipo))
            return (
              <label key={d.doc}>
                {d.label}
                <select value={(form[d.campo] as string | null) ?? ''} onChange={(e) => set(d.campo, e.target.value || null)}>
                  <option value="">{padrao ? `Padrão: ${padrao.nome}` : '— sem padrão definido —'}</option>
                  {opts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}{m.registro ? ` (${m.registro})` : ''}{d.tipos.length > 1 ? ` · ${TIPO_LABEL[m.tipo]}` : ''}
                    </option>
                  ))}
                </select>
                {!efetivo.membro && <span className="field-hint warn">Ninguém assina este documento. Marque um padrão na Equipe técnica.</span>}
                {efetivo.origem === 'anterior' && <span className="field-hint">Assina: {efetivo.membro?.nome} (cadastro anterior)</span>}
              </label>
            )
          })}
        </div>
      </form>
      {!novo && condo && <RevisoesSection condoId={condo.id} />}
    </div>
  )
}

type RevForm = Omit<DocRevisao, 'id'> & { id?: string }
const docLabel = (d: string) => DOCUMENTOS_REVISAO.find((x) => x.value === d)?.label ?? d

/** Tabela "Revisões" da 2ª página de cada documento (doc_revisoes). */
function RevisoesSection({ condoId }: { condoId: string }) {
  const { data = [], error } = useChildren('doc_revisoes', condoId)
  const save = useSave<RevForm>('doc_revisoes')
  const remove = useRemove('doc_revisoes')
  const order = DOCUMENTOS_REVISAO.map((d) => d.value as string)
  const rows = [...data].sort((a, b) =>
    order.indexOf(a.documento) - order.indexOf(b.documento) || a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true }))
  const nextNumero = (doc: string) => {
    const nums = data.filter((r) => r.documento === doc).map((r) => parseInt(r.numero, 10)).filter(Number.isFinite)
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')
  }
  const fields: FieldDef<RevForm>[] = [
    { key: 'documento', label: 'Documento *', type: 'select', options: DOCUMENTOS_REVISAO, required: true },
    { key: 'numero', label: 'Nº da revisão *', required: true, placeholder: '001', inputMode: 'numeric' },
    { key: 'data', label: 'Data', type: 'date' },
    { key: 'itens', label: 'Itens revisados', type: 'textarea', span: true, placeholder: 'Documento-Base e Anexos' },
  ]
  return (
    <CrudSection<RevForm>
      eyebrow="CONTROLE DE REVISÕES" title="Revisões dos documentos" singular="Revisão" rows={rows} fields={fields}
      blank={() => ({
        condominio_id: condoId, documento: 'pgr', numero: nextNumero('pgr'),
        data: new Date().toISOString().slice(0, 10), itens: data.some((r) => r.documento === 'pgr') ? '' : 'Documento-Base e Anexos',
      })}
      render={(r) => ({
        title: <>{docLabel(r.documento)} · revisão {r.numero || '—'}</>,
        meta: [fmtDate(r.data), r.itens].filter(Boolean).join(' · '),
      })}
      onSave={(r) => save.mutateAsync({ ...r, data: r.data || null })}
      onRemove={(id) => remove.mutateAsync(id)}
      notice={
        <>
          <div className="notice">
            Sem revisões cadastradas, cada documento mostra a revisão 001 com a data de elaboração (“Documento-Base e Anexos”).
          </div>
          {error && <ErrorBox error={'Não foi possível carregar as revisões (a migração 0002 já foi aplicada no banco?): ' + (error instanceof Error ? error.message : String(error))} />}
        </>
      }
    />
  )
}
