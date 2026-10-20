import { CrudSection } from '../components/CrudSection'
import type { FieldDef } from '../components/ui'
import { fmtDate } from '../components/ui'
import { useChildren, useGhes, useRemove, useSave, useSaveGhe } from '../lib/db'
import { GRUPOS_RISCO, STATUS_RISCO, type Funcao, type Ghe, type Risco, type Setor } from '../lib/types'
import { riskLevel } from '../reports/risk'
import { useCondo } from '../state/CondoProvider'

type New<T> = Omit<T, 'id'> & { id?: string }
const nullIfEmpty = (v: string | null | undefined) => (v ? v : null)

export function SetoresPage() {
  const { condo } = useCondo()
  const { data = [] } = useChildren('setores', condo?.id)
  const save = useSave<New<Setor>>('setores')
  const remove = useRemove('setores')
  const fields: FieldDef<New<Setor>>[] = [
    { key: 'nome', label: 'Nome do setor *', required: true },
    { key: 'ambiente', label: 'Ambiente', placeholder: 'Ex.: interno, coberto, ventilação natural' },
    { key: 'descricao', label: 'Descrição', type: 'textarea', span: true },
  ]
  return (
    <div className="view">
      <CrudSection<New<Setor>>
        eyebrow="CADASTRO TÉCNICO" title="Setores / ambientes" singular="Setor" rows={data} fields={fields}
        blank={() => ({ condominio_id: condo!.id, nome: '', ambiente: '', descricao: '' })}
        render={(s) => ({ title: s.nome, meta: [s.ambiente, s.descricao].filter(Boolean).join(' · ') })}
        onSave={(r) => save.mutateAsync(r)} onRemove={(id) => remove.mutateAsync(id)}
      />
    </div>
  )
}

type FuncaoForm = Omit<New<Funcao>, 'quantidade'> & { quantidade: string | number }

export function FuncoesPage() {
  const { condo } = useCondo()
  const { data = [] } = useChildren('funcoes', condo?.id)
  const { data: setores = [] } = useChildren('setores', condo?.id)
  const save = useSave<New<Funcao>>('funcoes')
  const remove = useRemove('funcoes')
  const setorOpts = setores.map((s) => ({ value: s.id, label: s.nome }))
  const fields: FieldDef<FuncaoForm>[] = [
    { key: 'nome', label: 'Função / cargo *', required: true },
    { key: 'setor_id', label: 'Setor', type: 'select', options: setorOpts },
    { key: 'quantidade', label: 'Nº de trabalhadores', type: 'number', min: 0 },
    { key: 'cbo', label: 'CBO' },
    { key: 'atividades', label: 'Atividades', type: 'textarea', span: true },
  ]
  const setorName = (id: string | null) => setores.find((s) => s.id === id)?.nome
  return (
    <div className="view">
      <CrudSection<FuncaoForm>
        eyebrow="CADASTRO TÉCNICO" title="Cargos e funções" singular="Função" rows={data} fields={fields}
        blank={() => ({ condominio_id: condo!.id, nome: '', setor_id: null, quantidade: '1', cbo: '', atividades: '' })}
        render={(f) => ({
          title: f.nome,
          meta: [setorName(f.setor_id), `${f.quantidade} trabalhador(es)`, f.cbo && `CBO ${f.cbo}`].filter(Boolean).join(' · '),
        })}
        onSave={(r) => save.mutateAsync({ ...r, setor_id: nullIfEmpty(r.setor_id), quantidade: Number(r.quantidade) || 0 })}
        onRemove={(id) => remove.mutateAsync(id)}
        notice={setores.length === 0 ? <div className="notice">Cadastre os setores primeiro para vincular as funções.</div> : undefined}
      />
    </div>
  )
}

export function GhePage() {
  const { condo } = useCondo()
  const { data = [] } = useGhes(condo?.id)
  const { data: setores = [] } = useChildren('setores', condo?.id)
  const { data: funcoes = [] } = useChildren('funcoes', condo?.id)
  const save = useSaveGhe()
  const remove = useRemove('ghes')
  type Row = New<Ghe>
  const fields: FieldDef<Row>[] = [
    { key: 'nome', label: 'Nome do GHE *', required: true },
    { key: 'setor_id', label: 'Setor', type: 'select', options: setores.map((s) => ({ value: s.id, label: s.nome })) },
    { key: 'descricao', label: 'Descrição', type: 'textarea', span: true },
  ]
  return (
    <div className="view">
      <CrudSection<Row>
        eyebrow="CADASTRO TÉCNICO" title="Grupos homogêneos de exposição (GHE)" singular="GHE" rows={data} fields={fields}
        blank={() => ({ condominio_id: condo!.id, nome: '', setor_id: null, descricao: '', funcao_ids: [] })}
        render={(g) => ({
          title: g.nome,
          meta: [
            setores.find((s) => s.id === g.setor_id)?.nome,
            funcoes.filter((f) => g.funcao_ids.includes(f.id)).map((f) => f.nome).join(', ') || 'sem funções vinculadas',
          ].filter(Boolean).join(' · '),
        })}
        extraForm={(g, set) => (
          <div className="span2">
            <label>Funções do GHE</label>
            <div className="check-list">
              {funcoes.map((f) => (
                <label key={f.id}>
                  <input
                    type="checkbox" checked={g.funcao_ids.includes(f.id)}
                    onChange={(e) => set({
                      funcao_ids: e.target.checked ? [...g.funcao_ids, f.id] : g.funcao_ids.filter((x) => x !== f.id),
                    })}
                  />
                  {f.nome}
                </label>
              ))}
              {funcoes.length === 0 && <span className="entity-meta">Nenhuma função cadastrada.</span>}
            </div>
          </div>
        )}
        onSave={(r) => save.mutateAsync({ ...r, setor_id: nullIfEmpty(r.setor_id) })}
        onRemove={(id) => remove.mutateAsync(id)}
      />
    </div>
  )
}

type RiscoForm = Omit<New<Risco>, 'prob' | 'sev'> & { prob: string | number; sev: string | number }

const PROB = [
  { value: '1', label: '1 — Rara' }, { value: '2', label: '2 — Improvável' }, { value: '3', label: '3 — Possível' },
  { value: '4', label: '4 — Provável' }, { value: '5', label: '5 — Quase certa' },
]
const SEV = [
  { value: '1', label: '1 — Insignificante' }, { value: '2', label: '2 — Leve' }, { value: '3', label: '3 — Moderada' },
  { value: '4', label: '4 — Grave' }, { value: '5', label: '5 — Gravíssima' },
]

export function RiscosPage() {
  const { condo } = useCondo()
  const { data = [] } = useChildren('riscos', condo?.id)
  const { data: ghes = [] } = useGhes(condo?.id)
  const { data: funcoes = [] } = useChildren('funcoes', condo?.id)
  const save = useSave<New<Risco>>('riscos')
  const remove = useRemove('riscos')
  const fields: FieldDef<RiscoForm>[] = [
    { key: 'grupo', label: 'Grupo de risco *', type: 'select', options: GRUPOS_RISCO, required: true },
    { key: 'ghe_id', label: 'GHE', type: 'select', options: ghes.map((g) => ({ value: g.id, label: g.nome })) },
    { key: 'funcao_id', label: 'Função', type: 'select', options: funcoes.map((f) => ({ value: f.id, label: f.nome })) },
    { key: 'perigo', label: 'Perigo / fator de risco *', required: true },
    { key: 'fonte', label: 'Fonte geradora' },
    { key: 'dano', label: 'Possíveis danos' },
    { key: 'controles', label: 'Controles existentes', type: 'textarea', span: true },
    { key: 'prob', label: 'Probabilidade *', type: 'select', options: PROB, required: true },
    { key: 'sev', label: 'Severidade *', type: 'select', options: SEV, required: true },
    { key: 'acao', label: 'Ação proposta', type: 'textarea', span: true },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'prazo', label: 'Prazo', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS_RISCO },
  ]
  return (
    <div className="view">
      <CrudSection<RiscoForm>
        eyebrow="PGR / NR-1" title="Inventário de riscos" singular="Risco" rows={data} fields={fields}
        blank={() => ({
          condominio_id: condo!.id, ghe_id: null, funcao_id: null, grupo: 'Ergonômico', perigo: '', fonte: '', dano: '',
          controles: '', prob: '2', sev: '2', acao: '', responsavel: 'Administração do condomínio', prazo: null, status: 'Pendente',
        })}
        render={(r) => {
          const p = Number(r.prob), s = Number(r.sev), lv = riskLevel(p * s)
          return {
            title: <>{r.perigo} <span className={'risk-level ' + lv.cls}>{p}×{s} = {p * s} · {lv.label}</span></>,
            meta: [
              r.grupo,
              ghes.find((g) => g.id === r.ghe_id)?.nome,
              funcoes.find((f) => f.id === r.funcao_id)?.nome,
              r.acao && `Ação: ${r.acao}`,
              r.prazo && `Prazo ${fmtDate(r.prazo)}`,
              r.status,
            ].filter(Boolean).join(' · '),
          }
        }}
        onSave={(r) => save.mutateAsync({
          ...r, ghe_id: nullIfEmpty(r.ghe_id), funcao_id: nullIfEmpty(r.funcao_id), prazo: nullIfEmpty(r.prazo),
          prob: Number(r.prob), sev: Number(r.sev),
        })}
        onRemove={(id) => remove.mutateAsync(id)}
      />
    </div>
  )
}
