import { CrudSection } from '../components/CrudSection'
import { BOOL_OPTIONS, Collapsible, ErrorBox, Field, fmtDate, toBool, type FieldDef } from '../components/ui'
import { useChildren, useGhes, useRemove, useSave, useSaveGhe } from '../lib/db'
import {
  EPI_CATALOGO, GRAUS_INSALUBRIDADE, GRUPOS_RISCO, HABITUALIDADES, PRIORIDADES, STATUS_RISCO, TECNICAS_ANALISE,
  type Epi, type Funcao, type Ghe, type Medicao, type Risco, type Setor,
} from '../lib/types'
import { riskLevel } from '../reports/risk'
import { useCondo } from '../state/CondoProvider'

type New<T> = Omit<T, 'id'> & { id?: string }
const nullIfEmpty = (v: string | null | undefined) => (v ? v : null)
const intOrNull = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.trunc(Number(v)))

/** Renderiza uma lista de campos ligados a um objeto do formulário. */
function Fields<T>({ defs, row, set }: { defs: FieldDef<T>[]; row: T; set: (patch: Partial<T>) => void }) {
  return (
    <>
      {defs.map((f) => (
        <Field key={f.key} def={f} value={row[f.key]} onChange={(v) => set({ [f.key]: v } as Partial<T>)} />
      ))}
    </>
  )
}

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
    { key: 'carga_horaria', label: 'Carga horária', placeholder: 'Ex.: 44h semanais (12x36)' },
    { key: 'atividades', label: 'Atividades', type: 'textarea', span: true },
  ]
  const setorName = (id: string | null) => setores.find((s) => s.id === id)?.nome
  return (
    <div className="view">
      <CrudSection<FuncaoForm>
        eyebrow="CADASTRO TÉCNICO" title="Cargos e funções" singular="Função" rows={data} fields={fields}
        blank={() => ({ condominio_id: condo!.id, nome: '', setor_id: null, quantidade: '1', cbo: '', atividades: '', carga_horaria: '' })}
        render={(f) => ({
          title: f.nome,
          meta: [setorName(f.setor_id), `${f.quantidade} trabalhador(es)`, f.cbo && `CBO ${f.cbo}`, f.carga_horaria]
            .filter(Boolean).join(' · '),
        })}
        onSave={(r) => save.mutateAsync({ ...r, setor_id: nullIfEmpty(r.setor_id), quantidade: Number(r.quantidade) || 0 })}
        onRemove={(id) => remove.mutateAsync(id)}
        notice={setores.length === 0 ? <div className="notice">Cadastre os setores primeiro para vincular as funções.</div> : undefined}
      />
    </div>
  )
}

type GheForm = Omit<New<Ghe>, 'numero'> & { numero: string | number | null }

export function GhePage() {
  const { condo } = useCondo()
  const { data = [] } = useGhes(condo?.id)
  const { data: setores = [] } = useChildren('setores', condo?.id)
  const { data: funcoes = [] } = useChildren('funcoes', condo?.id)
  const save = useSaveGhe()
  const remove = useRemove('ghes')
  const fields: FieldDef<GheForm>[] = [
    { key: 'nome', label: 'Nome do GHE *', required: true },
    { key: 'numero', label: 'Número / ordem', type: 'number', min: 1, placeholder: 'Vazio = ordem da lista', inputMode: 'numeric' },
    { key: 'setor_id', label: 'Setor', type: 'select', options: setores.map((s) => ({ value: s.id, label: s.nome })) },
    { key: 'tipo_atividade', label: 'Tipo de atividade', placeholder: 'Ex.: Serviços de portaria e controle de acesso' },
    { key: 'descricao_ambiente', label: 'Descrição do ambiente', type: 'textarea', span: true, placeholder: 'Vazio = ambiente/descrição do setor' },
    { key: 'descricao', label: 'Descrição', type: 'textarea', span: true },
  ]
  const parecer: FieldDef<GheForm>[] = [
    { key: 'parecer_insalubridade', label: 'Parecer — insalubridade (NR-15)', type: 'textarea', span: true, placeholder: 'Vazio = conclusão automática' },
    { key: 'parecer_periculosidade', label: 'Parecer — periculosidade (NR-16)', type: 'textarea', span: true, placeholder: 'Vazio = conclusão automática' },
    { key: 'parecer_aposentadoria', label: 'Parecer — aposentadoria especial', type: 'textarea', span: true, placeholder: 'Vazio = conclusão automática' },
    { key: 'atividades_perigosas', label: 'Atividades perigosas (NR-16)', type: 'textarea', span: true, placeholder: 'Vazio = "Não identificadas"' },
  ]
  // Mostra na ordem da numeração (sem número: ordem de cadastro, depois dos numerados)
  const rows = data
    .map((g, i) => ({ g, i }))
    .sort((a, b) => (a.g.numero ?? Infinity) - (b.g.numero ?? Infinity) || a.i - b.i)
    .map((x) => x.g)
  return (
    <div className="view">
      <CrudSection<GheForm>
        eyebrow="CADASTRO TÉCNICO" title="Grupos homogêneos de exposição (GHE)" singular="GHE" rows={rows} fields={fields}
        blank={() => ({
          condominio_id: condo!.id, nome: '', setor_id: null, descricao: '', funcao_ids: [], numero: '',
          tipo_atividade: '', descricao_ambiente: '', parecer_insalubridade: '', parecer_periculosidade: '',
          parecer_aposentadoria: '', atividades_perigosas: '',
        })}
        render={(g) => ({
          title: <>{g.numero != null && g.numero !== '' ? `GHE ${String(g.numero).padStart(2, '0')} · ` : ''}{g.nome}</>,
          meta: [
            setores.find((s) => s.id === g.setor_id)?.nome,
            g.tipo_atividade,
            funcoes.filter((f) => g.funcao_ids.includes(f.id)).map((f) => f.nome).join(', ') || 'sem funções vinculadas',
          ].filter(Boolean).join(' · '),
        })}
        extraForm={(g, set) => (
          <>
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
            <Collapsible
              title="Parecer LTCAT (opcional)" hint="substitui a conclusão automática"
              defaultOpen={Boolean(g.parecer_insalubridade || g.parecer_periculosidade || g.parecer_aposentadoria || g.atividades_perigosas)}
            >
              <Fields defs={parecer} row={g} set={set} />
            </Collapsible>
          </>
        )}
        onSave={(r) => save.mutateAsync({ ...r, setor_id: nullIfEmpty(r.setor_id), numero: intOrNull(r.numero) })}
        onRemove={(id) => remove.mutateAsync(id)}
      />
    </div>
  )
}

type RiscoForm = Omit<New<Risco>, 'prob' | 'sev' | 'epc_eficaz' | 'epi_eficaz' | 'aposentadoria_anos'> & {
  prob: string | number
  sev: string | number
  epc_eficaz: boolean | null | string
  epi_eficaz: boolean | null | string
  aposentadoria_anos: number | null | string
}

const PROB = [
  { value: '1', label: '1 — Rara' }, { value: '2', label: '2 — Improvável' }, { value: '3', label: '3 — Possível' },
  { value: '4', label: '4 — Provável' }, { value: '5', label: '5 — Quase certa' },
]
const SEV = [
  { value: '1', label: '1 — Insignificante' }, { value: '2', label: '2 — Leve' }, { value: '3', label: '3 — Moderada' },
  { value: '4', label: '4 — Grave' }, { value: '5', label: '5 — Gravíssima' },
]

const RISCO_CONTROLES: FieldDef<RiscoForm>[] = [
  { key: 'controles_adm', label: 'Administrativas', type: 'textarea', span: true, placeholder: 'Ex.: Treinamento, ordem de serviço, pausas' },
  { key: 'controles_epc', label: 'EPC (proteção coletiva)', type: 'textarea', span: true, placeholder: 'Vazio = "Não identificado"' },
  { key: 'controles_epi', label: 'EPI (com CA)', type: 'textarea', span: true, placeholder: 'Ex.: Luva nitrílica (CA 12345)' },
  { key: 'epc_eficaz', label: 'EPC eficaz?', type: 'select', options: BOOL_OPTIONS, emptyLabel: 'Não avaliado' },
  { key: 'epi_eficaz', label: 'EPI eficaz?', type: 'select', options: BOOL_OPTIONS, emptyLabel: 'Não avaliado' },
]
const RISCO_PLANO: FieldDef<RiscoForm>[] = [
  { key: 'prioridade', label: 'Prioridade', type: 'select', options: PRIORIDADES, emptyLabel: 'Automática (pelo GR)' },
  { key: 'recursos', label: 'Recursos necessários' },
  { key: 'onde', label: 'Onde?', placeholder: 'Nas dependências da empresa' },
  { key: 'forma_afericao', label: 'Forma de aferição', placeholder: 'Ex.: Registro de entrega com assinatura' },
  { key: 'indicadores_saude', label: 'Indicadores de saúde', type: 'textarea', span: true, placeholder: 'Vazio = "Não foram relatadas situações…"' },
]
const RISCO_LTCAT: FieldDef<RiscoForm>[] = [
  { key: 'cod_esocial', label: 'Código eSocial (Tabela 24)', placeholder: 'Ex.: 01.01.021' },
  { key: 'meio_propagacao', label: 'Meio de propagação', placeholder: 'Ar, Contato, Ar/Contato' },
  { key: 'tecnica_analise', label: 'Técnica de análise', type: 'select', options: TECNICAS_ANALISE },
  { key: 'nivel_exposicao', label: 'Nível de exposição', placeholder: 'Ex.: 82 dB(A) ou "Habitual e permanente"' },
  { key: 'habitualidade', label: 'Habitualidade', type: 'select', options: HABITUALIDADES },
  { key: 'nr15_anexo', label: 'NR-15 anexo', placeholder: 'Ex.: Anexo 14' },
  { key: 'grau_insalubridade', label: 'Grau de insalubridade', type: 'select', options: GRAUS_INSALUBRIDADE, emptyLabel: 'Não caracteriza' },
  { key: 'nr16_anexo', label: 'NR-16 anexo', placeholder: 'Ex.: Anexo 2' },
  { key: 'anexo_iv_codigo', label: 'Decreto 3.048 Anexo IV (código)', placeholder: 'Ex.: 2.0.1' },
  {
    key: 'aposentadoria_anos', label: 'Aposentadoria especial', type: 'select', emptyLabel: 'Não enseja',
    options: [{ value: '15', label: '15 anos' }, { value: '20', label: '20 anos' }, { value: '25', label: '25 anos' }],
  },
]
const MEDICAO: FieldDef<Medicao>[] = [
  { key: 'agente', label: 'Agente medido', placeholder: 'Ex.: Ruído contínuo' },
  { key: 'tecnica', label: 'Metodologia', placeholder: 'Ex.: NHO-01 dosimetria' },
  { key: 'equipamento', label: 'Equipamento', placeholder: 'Modelo / nº de série' },
  { key: 'data', label: 'Data da medição', type: 'date' },
  { key: 'resultado', label: 'Resultado', inputMode: 'decimal' },
  { key: 'limite', label: 'Limite de tolerância', inputMode: 'decimal' },
  { key: 'unidade', label: 'Unidade', placeholder: 'dB(A), mg/m³, °C IBUTG…' },
]

const filled = (r: RiscoForm, defs: FieldDef<RiscoForm>[]) => defs.some((d) => r[d.key] != null && r[d.key] !== '')

function cleanMedicao(m: Medicao | null | undefined): Medicao | null {
  if (!m) return null
  const out = Object.fromEntries(Object.entries(m).filter(([, v]) => v != null && String(v).trim() !== '')) as Medicao
  return Object.keys(out).length ? out : null
}

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
    { key: 'controles', label: 'Controles existentes (geral)', type: 'textarea', span: true },
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
          cod_esocial: '', meio_propagacao: '', tecnica_analise: 'Qualitativa', nivel_exposicao: '',
          controles_adm: '', controles_epc: '', controles_epi: '', indicadores_saude: '',
          prioridade: '', recursos: '', onde: '', forma_afericao: '', habitualidade: '',
          epc_eficaz: null, epi_eficaz: null, nr15_anexo: '', grau_insalubridade: '', nr16_anexo: '',
          anexo_iv_codigo: '', aposentadoria_anos: null, medicao: null,
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
              r.prioridade && `Prioridade ${r.prioridade}`,
              r.prazo && `Prazo ${fmtDate(r.prazo)}`,
              r.status,
            ].filter(Boolean).join(' · '),
          }
        }}
        extraForm={(r, set) => {
          const m = r.medicao ?? {}
          return (
            <>
              <Collapsible title="Controles detalhados" hint="administrativas / EPC / EPI" defaultOpen={filled(r, RISCO_CONTROLES)}>
                <Fields defs={RISCO_CONTROLES} row={r} set={set} />
              </Collapsible>
              <Collapsible title="Plano de ação (PGR)" hint="prioridade, recursos, aferição" defaultOpen={filled(r, RISCO_PLANO)}>
                <Fields defs={RISCO_PLANO} row={r} set={set} />
              </Collapsible>
              <Collapsible
                title="Dados LTCAT" hint="agentes físicos, químicos e biológicos"
                defaultOpen={filled(r, RISCO_LTCAT.filter((d) => d.key !== 'tecnica_analise')) || Boolean(cleanMedicao(r.medicao))}
              >
                <Fields defs={RISCO_LTCAT} row={r} set={set} />
                <div className="span2" style={{ gridColumn: '1 / -1', fontWeight: 800, fontSize: 12, color: '#344054', marginTop: 4 }}>
                  Medição quantitativa (opcional)
                </div>
                <Fields<Medicao> defs={MEDICAO} row={m} set={(patch) => set({ medicao: { ...m, ...patch } })} />
              </Collapsible>
            </>
          )
        }}
        onSave={(r) => save.mutateAsync({
          ...r, ghe_id: nullIfEmpty(r.ghe_id), funcao_id: nullIfEmpty(r.funcao_id), prazo: nullIfEmpty(r.prazo),
          prob: Number(r.prob), sev: Number(r.sev),
          epc_eficaz: toBool(r.epc_eficaz), epi_eficaz: toBool(r.epi_eficaz),
          aposentadoria_anos: intOrNull(r.aposentadoria_anos), medicao: cleanMedicao(r.medicao),
        })}
        onRemove={(id) => remove.mutateAsync(id)}
      />
    </div>
  )
}

type EpiForm = Omit<New<Epi>, 'eficaz'> & { eficaz: boolean | null | string }

const epiImg = (key: string) => EPI_CATALOGO.find((c) => c.key === key)

export function EpisPage() {
  const { condo } = useCondo()
  const { data = [], error } = useChildren('epis', condo?.id)
  const { data: ghes = [] } = useGhes(condo?.id)
  const { data: funcoes = [] } = useChildren('funcoes', condo?.id)
  const save = useSave<New<Epi>>('epis')
  const remove = useRemove('epis')
  const fields: FieldDef<EpiForm>[] = [
    {
      key: 'status', label: 'Situação *', type: 'select', required: true,
      options: [{ value: 'existente', label: 'Existente (já fornecido)' }, { value: 'recomendado', label: 'Recomendado' }],
    },
    {
      key: 'imagem', label: 'Imagem (catálogo)', type: 'select', emptyLabel: '— sem imagem —',
      options: EPI_CATALOGO.map((c) => ({ value: c.key, label: c.label })),
    },
    { key: 'nome', label: 'Equipamento *', required: true, span: true, placeholder: 'Ex.: Luva de proteção nitrílica' },
    { key: 'ghe_id', label: 'GHE', type: 'select', options: ghes.map((g) => ({ value: g.id, label: g.nome })), emptyLabel: '— nenhum —' },
    { key: 'funcao_id', label: 'Função', type: 'select', options: funcoes.map((f) => ({ value: f.id, label: f.nome })), emptyLabel: '— nenhuma —' },
    { key: 'ca', label: 'Nº do CA', inputMode: 'numeric', placeholder: 'Vazio = "Não identificado"' },
    { key: 'validade_ca', label: 'Validade do CA', type: 'date' },
    { key: 'eficaz', label: 'Eficaz?', type: 'select', options: BOOL_OPTIONS, emptyLabel: 'Não avaliado' },
  ]
  const rows = [...data].sort((a, b) => (a.status === b.status ? 0 : a.status === 'existente' ? -1 : 1))
  const base = import.meta.env.BASE_URL + 'docs-assets/epi/'
  return (
    <div className="view">
      <CrudSection<EpiForm>
        eyebrow="PGR / NR-6" title="EPIs existentes e recomendados" singular="EPI" rows={rows} fields={fields}
        blank={() => ({
          condominio_id: condo!.id, ghe_id: null, funcao_id: null, nome: '', ca: '', validade_ca: null,
          eficaz: null, imagem: '', status: 'existente',
        })}
        render={(e) => {
          const img = epiImg(e.imagem)
          const ef = toBool(e.eficaz)
          return {
            title: (
              <>
                {e.nome}{' '}
                <span className={'badge ' + (e.status === 'recomendado' ? 'warn' : 'ok')}>
                  {e.status === 'recomendado' ? 'Recomendado' : 'Existente'}
                </span>
              </>
            ),
            meta: [
              ghes.find((g) => g.id === e.ghe_id)?.nome,
              funcoes.find((f) => f.id === e.funcao_id)?.nome,
              e.ca ? `CA ${e.ca}` : 'CA não identificado',
              e.validade_ca && `válido até ${fmtDate(e.validade_ca)}`,
              ef === null ? '' : ef ? 'eficaz' : 'não eficaz',
            ].filter(Boolean).join(' · '),
            side: img
              ? <img src={base + img.file} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6 }} />
              : undefined,
          }
        }}
        extraForm={(e, set) => {
          const img = epiImg(e.imagem)
          if (!img) return null
          return (
            <div className="span2" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={base + img.file} alt=""
                style={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid #dde5e2', borderRadius: 8 }}
              />
              {!e.nome && (
                <button type="button" className="outline small" onClick={() => set({ nome: img.label })}>
                  Usar “{img.label}” como nome
                </button>
              )}
            </div>
          )
        }}
        onSave={(r) => save.mutateAsync({
          ...r, ghe_id: nullIfEmpty(r.ghe_id), funcao_id: nullIfEmpty(r.funcao_id), validade_ca: nullIfEmpty(r.validade_ca),
          eficaz: toBool(r.eficaz),
        })}
        onRemove={(id) => remove.mutateAsync(id)}
        notice={
          <>
            <div className="notice">
              Os EPIs cadastrados aqui alimentam as tabelas de EPIs existentes e recomendados do PGR. Sem cadastro, o documento
              sugere EPIs automaticamente a partir do inventário de riscos.
            </div>
            {error && (
              <ErrorBox
                error={'Não foi possível carregar os EPIs (a migração 0002 já foi aplicada no banco?): '
                  + (error instanceof Error ? error.message : String(error))}
              />
            )}
          </>
        }
      />
    </div>
  )
}
