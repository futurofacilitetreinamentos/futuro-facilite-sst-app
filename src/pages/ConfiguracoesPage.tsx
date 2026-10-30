import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { CrudSection } from '../components/CrudSection'
import { BOOL_OPTIONS, ErrorBox, Field, Loading, PanelHead, maskCep, maskCnpj, type FieldDef } from '../components/ui'
import { CONFIG_PADRAO, fmtBRL, normConfig, parseIntMin, parseNum, round2 } from '../lib/comercial'
import { cpfError, formatCpf, onlyDigits } from '../lib/cpf'
import { useConfigEmpresa, useServicos } from '../lib/db'
import { must, supabase } from '../lib/supabase'
import type { ClausulaContrato, ConfigEmpresa, Servico, UnidadeServico } from '../lib/types'
import { CLAUSULAS_CONTRATO_PADRAO, CONDICOES_PROPOSTA_PADRAO, MARCADORES_CONTRATO } from '../reports/comercial-texts'
import '../styles/comercial.css'

const MIGRACAO = 'Aplique a migração supabase/migrations/0006_comercial.sql no Supabase para liberar a área comercial.'

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

/** Botões subir/descer/remover de um item de lista. */
function RowTools({ i, n, onMove, onRemove, disabled }: {
  i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void; disabled?: boolean
}) {
  if (disabled) return null
  return (
    <div className="com-row-tools">
      <button type="button" className="ghost" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Subir" title="Subir"><ArrowUp size={15} /></button>
      <button type="button" className="ghost" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Descer" title="Descer"><ArrowDown size={15} /></button>
      <button type="button" className="ghost com-del" onClick={onRemove} aria-label="Remover" title="Remover"><Trash2 size={15} /></button>
    </div>
  )
}

/** Lista de parágrafos editáveis (condições da proposta, itens do objeto do contrato). */
export function TextListEditor({ items, onChange, readOnly, addLabel = 'Adicionar item', rows = 2 }: {
  items: string[]; onChange: (v: string[]) => void; readOnly?: boolean; addLabel?: string; rows?: number
}) {
  return (
    <div className="com-list">
      {items.length === 0 && <div className="empty">Nenhum item.</div>}
      {items.map((t, i) => (
        <div className="com-list-row" key={i}>
          <span className="com-list-n">{i + 1}.</span>
          <textarea rows={rows} value={t} readOnly={readOnly} aria-label={`Item ${i + 1}`}
            onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
          <RowTools i={i} n={items.length} disabled={readOnly}
            onMove={(d) => onChange(move(items, i, d))} onRemove={() => onChange(items.filter((_, k) => k !== i))} />
        </div>
      ))}
      {!readOnly && (
        <button type="button" className="outline small" onClick={() => onChange([...items, ''])}>
          <Plus size={14} aria-hidden="true" /> {addLabel}
        </button>
      )}
    </div>
  )
}

function ClausulasEditor({ items, onChange, readOnly }: {
  items: ClausulaContrato[]; onChange: (v: ClausulaContrato[]) => void; readOnly?: boolean
}) {
  const set = (i: number, patch: Partial<ClausulaContrato>) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  return (
    <div className="com-list">
      {items.length === 0 && <div className="empty">Nenhuma cláusula.</div>}
      {items.map((c, i) => (
        <div className="com-clausula" key={i}>
          <div className="com-clausula-head">
            <input value={c.titulo} readOnly={readOnly} placeholder="Título (ex.: CLÁUSULA PRIMEIRA – DO OBJETO)"
              aria-label={`Título da cláusula ${i + 1}`} onChange={(e) => set(i, { titulo: e.target.value })} />
            <RowTools i={i} n={items.length} disabled={readOnly}
              onMove={(d) => onChange(move(items, i, d))} onRemove={() => confirm('Remover esta cláusula?') && onChange(items.filter((_, k) => k !== i))} />
          </div>
          <textarea rows={6} value={c.texto} readOnly={readOnly} aria-label={`Texto da cláusula ${i + 1}`}
            onChange={(e) => set(i, { texto: e.target.value })} />
        </div>
      ))}
      {!readOnly && (
        <button type="button" className="outline small" onClick={() => onChange([...items, { titulo: '', texto: '' }])}>
          <Plus size={14} aria-hidden="true" /> Adicionar cláusula
        </button>
      )}
    </div>
  )
}

async function updateConfig(patch: Partial<ConfigEmpresa>) {
  const rows = must(await supabase.from('config_empresa').update(patch).eq('id', 1).select()) as ConfigEmpresa[]
  if (!rows?.length) throw new Error('Nada foi gravado: só administradores alteram a configuração (ou a linha id = 1 não existe).')
}

// ---------------------------------------------------------------------------

type DadosForm = Record<
  | 'razao_social' | 'nome_fantasia' | 'cnpj' | 'endereco' | 'cep' | 'cidade_uf' | 'representante_nome' | 'representante_rg'
  | 'representante_cpf' | 'email' | 'telefone' | 'acrescimo_prazo_pct' | 'parcelas_prazo' | 'validade_proposta_dias'
  | 'dia_vencimento' | 'vigencia_meses' | 'foro',
  string
>

const toForm = (c: ConfigEmpresa): DadosForm => ({
  razao_social: c.razao_social, nome_fantasia: c.nome_fantasia, cnpj: c.cnpj, endereco: c.endereco, cep: c.cep,
  cidade_uf: c.cidade_uf, representante_nome: c.representante_nome, representante_rg: c.representante_rg,
  representante_cpf: c.representante_cpf, email: c.email, telefone: c.telefone,
  acrescimo_prazo_pct: String(c.acrescimo_prazo_pct), parcelas_prazo: String(c.parcelas_prazo),
  validade_proposta_dias: String(c.validade_proposta_dias), dia_vencimento: String(c.dia_vencimento),
  vigencia_meses: String(c.vigencia_meses), foro: c.foro,
})

const DADOS: FieldDef<DadosForm>[] = [
  { key: 'razao_social', label: 'Razão social *', required: true, span: true },
  { key: 'nome_fantasia', label: 'Nome fantasia' },
  { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', inputMode: 'numeric' },
  { key: 'endereco', label: 'Endereço', span: true },
  { key: 'cep', label: 'CEP', placeholder: '00.000-000', inputMode: 'numeric' },
  { key: 'cidade_uf', label: 'Cidade/UF', placeholder: 'Brasília/DF' },
  { key: 'representante_nome', label: 'Representante legal (nome)', span: true },
  { key: 'representante_rg', label: 'RG do representante' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'telefone', label: 'Telefone', inputMode: 'tel' },
]

const PARAMS: FieldDef<DadosForm>[] = [
  { key: 'acrescimo_prazo_pct', label: 'Acréscimo a prazo (%)', type: 'number', min: 0, inputMode: 'decimal' },
  { key: 'parcelas_prazo', label: 'Nº de parcelas a prazo', type: 'number', min: 1, inputMode: 'numeric' },
  { key: 'validade_proposta_dias', label: 'Validade da proposta (dias)', type: 'number', min: 0, inputMode: 'numeric' },
  { key: 'dia_vencimento', label: 'Dia de vencimento das parcelas', type: 'number', min: 1, max: 31, inputMode: 'numeric' },
  { key: 'vigencia_meses', label: 'Vigência do contrato (meses)', type: 'number', min: 1, inputMode: 'numeric' },
  { key: 'foro', label: 'Foro', span: true },
]

function DadosSection({ config, isAdmin }: { config: ConfigEmpresa; isAdmin: boolean }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<DadosForm>(() => toForm(config))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [ok, setOk] = useState('')
  useEffect(() => setForm(toForm(config)), [config])

  const set = (k: keyof DadosForm, v: string) => {
    setOk('')
    setForm((f) => ({
      ...f,
      [k]: k === 'cnpj' ? maskCnpj(v) : k === 'representante_cpf' ? onlyDigits(v).slice(0, 11) : v,
    }))
  }
  const erroCpf = cpfError(form.representante_cpf)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (erroCpf) return setError('CPF do representante: ' + erroCpf)
    setBusy(true)
    setError(null)
    try {
      await updateConfig({
        ...form,
        cep: form.cep.trim(),
        representante_cpf: onlyDigits(form.representante_cpf),
        acrescimo_prazo_pct: round2(Math.max(0, parseNum(form.acrescimo_prazo_pct))),
        parcelas_prazo: parseIntMin(form.parcelas_prazo, CONFIG_PADRAO.parcelas_prazo, 1),
        validade_proposta_dias: parseIntMin(form.validade_proposta_dias, CONFIG_PADRAO.validade_proposta_dias, 0),
        dia_vencimento: Math.min(31, parseIntMin(form.dia_vencimento, CONFIG_PADRAO.dia_vencimento, 1)),
        vigencia_meses: parseIntMin(form.vigencia_meses, CONFIG_PADRAO.vigencia_meses, 1),
      })
      await qc.invalidateQueries({ queryKey: ['config_empresa'] })
      setOk('Configuração salva.')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const fld = (f: FieldDef<DadosForm>) =>
    isAdmin ? (
      <Field key={f.key} def={f} value={form[f.key]} onChange={(v) => set(f.key, f.key === 'cep' ? maskCepBr(v) : v)} />
    ) : (
      <label key={f.key} className={f.span ? 'span2' : undefined}>{f.label}<input value={form[f.key]} readOnly /></label>
    )

  return (
    <form className="panel" onSubmit={submit}>
      <PanelHead eyebrow="CONTRATADA" title="Dados da empresa e parâmetros comerciais">
        {isAdmin && <button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>}
      </PanelHead>
      <div className="notice">Estes dados qualificam a CONTRATADA na proposta e no contrato.</div>
      <ErrorBox error={error} />
      {ok && <div className="ok-box">{ok}</div>}
      <div className="form-grid two">
        {DADOS.slice(0, 8).map(fld)}
        <label>
          CPF do representante
          <input value={formatCpf(form.representante_cpf)} readOnly={!isAdmin} inputMode="numeric" placeholder="000.000.000-00"
            maxLength={14} aria-invalid={erroCpf ? true : undefined} onChange={(e) => set('representante_cpf', e.target.value)} />
          {erroCpf && <span className="field-hint bad">{erroCpf}</span>}
        </label>
        {DADOS.slice(8).map(fld)}
      </div>
      <h3 className="com-h3">Parâmetros comerciais</h3>
      <div className="form-grid two">
        {PARAMS.map(fld)}
        <p className="field-hint span2" style={{ margin: 0 }}>
          Ex.: {fmtBRL(1420)} à vista → {fmtBRL(1420 * (1 + parseNum(form.acrescimo_prazo_pct) / 100))} a prazo em{' '}
          {parseIntMin(form.parcelas_prazo, 12, 1)}× de {fmtBRL(1420 * (1 + parseNum(form.acrescimo_prazo_pct) / 100) / parseIntMin(form.parcelas_prazo, 12, 1))}.
          Cada orçamento pode ajustar o acréscimo e as parcelas.
        </p>
      </div>
    </form>
  )
}

/** CEP no formato da configuração (00.000-000), aceitando também 00000-000. */
function maskCepBr(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return maskCep(d)
  return d.replace(/^(\d{2})(\d{3})(\d{0,3})$/, '$1.$2-$3')
}

// ---------------------------------------------------------------------------

type ServForm = {
  id?: string
  nome: string
  descricao_proposta: string
  descricao_contrato: string
  unidade: UnidadeServico
  preco: string
  ordem: string
  ativo: string
}

const UNIDADES = [
  { value: 'fixo', label: 'Valor fixo' },
  { value: 'por_colaborador', label: 'Por colaborador' },
]

const SERV_FIELDS: FieldDef<ServForm>[] = [
  { key: 'nome', label: 'Nome *', required: true, span: true },
  { key: 'descricao_proposta', label: 'Descrição na proposta ("Serviços inclusos"; separe linhas com ;)', type: 'textarea', span: true },
  { key: 'descricao_contrato', label: 'Descrição no contrato (itens do objeto; separe com ;)', type: 'textarea', span: true },
  { key: 'unidade', label: 'Unidade *', type: 'select', options: UNIDADES, required: true },
  { key: 'preco', label: 'Preço (R$)', type: 'number', min: 0, inputMode: 'decimal', placeholder: '0,00' },
  { key: 'ordem', label: 'Ordem', type: 'number', inputMode: 'numeric' },
  { key: 'ativo', label: 'Ativo *', type: 'select', options: BOOL_OPTIONS, required: true },
]

function ServicosSection({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient()
  const { data: servicos = [], error, isLoading } = useServicos()
  const unidadeLabel = (u: UnidadeServico) => (u === 'por_colaborador' ? 'por colaborador' : 'fixo')
  const meta = (s: Servico) => [`${fmtBRL(parseNum(s.preco))} ${unidadeLabel(s.unidade)}`, s.descricao_proposta].filter(Boolean).join(' · ')
  const title = (s: Servico) => (
    <span className="com-title">{s.ordem ? `${s.ordem}. ` : ''}{s.nome}{!s.ativo && <span className="badge">inativo</span>}</span>
  )

  if (isLoading) return <section className="panel"><Loading /></section>
  if (error) {
    return (
      <section className="panel">
        <PanelHead eyebrow="CATÁLOGO" title="Tabela de serviços" />
        <ErrorBox error={'Não foi possível carregar os serviços. ' + MIGRACAO + ' (' + (error instanceof Error ? error.message : String(error)) + ')'} />
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="panel">
        <PanelHead eyebrow="CATÁLOGO" title="Tabela de serviços" />
        <div className="notice">Somente administradores alteram a tabela de serviços.</div>
        {servicos.length === 0 && <div className="empty">Nenhum serviço cadastrado.</div>}
        {servicos.map((s) => (
          <div className="entity-card" key={s.id}>
            <div className="entity-title">{title(s)}</div>
            <div className="entity-meta">{meta(s)}</div>
          </div>
        ))}
      </section>
    )
  }

  const rows: ServForm[] = servicos.map((s) => ({
    id: s.id, nome: s.nome, descricao_proposta: s.descricao_proposta, descricao_contrato: s.descricao_contrato,
    unidade: s.unidade, preco: String(s.preco ?? 0), ordem: String(s.ordem ?? 0), ativo: String(s.ativo),
  }))
  const byId = new Map(servicos.map((s) => [s.id, s]))

  return (
    <CrudSection<ServForm>
      eyebrow="CATÁLOGO" title="Tabela de serviços" singular="Serviço" rows={rows} fields={SERV_FIELDS}
      blank={() => ({
        nome: '', descricao_proposta: '', descricao_contrato: '', unidade: 'fixo', preco: '0',
        ordem: String((servicos.reduce((m, s) => Math.max(m, s.ordem || 0), 0) || 0) + 1), ativo: 'true',
      })}
      render={(r) => {
        const s = byId.get(r.id!)!
        return { title: title(s), meta: meta(s) }
      }}
      onSave={async (r) => {
        const { id, ...f } = r
        const row = {
          nome: f.nome.trim(),
          descricao_proposta: f.descricao_proposta.trim(),
          descricao_contrato: f.descricao_contrato.trim(),
          unidade: f.unidade || 'fixo',
          preco: round2(Math.max(0, parseNum(f.preco))),
          ordem: Math.trunc(parseNum(f.ordem)),
          ativo: f.ativo !== 'false',
        }
        must(await (id ? supabase.from('servicos').update(row).eq('id', id) : supabase.from('servicos').insert(row)))
        await qc.invalidateQueries({ queryKey: ['servicos'] })
      }}
      onRemove={async (id) => {
        must(await supabase.from('servicos').delete().eq('id', id))
        await qc.invalidateQueries({ queryKey: ['servicos'] })
      }}
      notice={
        <div className="notice">
          Os serviços ativos aparecem para marcar no orçamento. Excluir um serviço não altera orçamentos já feitos (eles guardam uma
          cópia); para tirá-lo da lista sem apagar, marque como inativo.
        </div>
      }
    />
  )
}

// ---------------------------------------------------------------------------

function TextosSection({ config, isAdmin }: { config: ConfigEmpresa; isAdmin: boolean }) {
  const qc = useQueryClient()
  const [cond, setCond] = useState<string[]>(config.condicoes_proposta ?? CONDICOES_PROPOSTA_PADRAO)
  const [claus, setClaus] = useState<ClausulaContrato[]>(config.clausulas_contrato ?? CLAUSULAS_CONTRATO_PADRAO)
  const [busy, setBusy] = useState<'' | 'cond' | 'claus'>('')
  const [msg, setMsg] = useState<{ k: 'cond' | 'claus'; ok?: string; err?: unknown } | null>(null)
  useEffect(() => {
    setCond(config.condicoes_proposta ?? CONDICOES_PROPOSTA_PADRAO)
    setClaus(config.clausulas_contrato ?? CLAUSULAS_CONTRATO_PADRAO)
  }, [config])

  async function save(k: 'cond' | 'claus', patch: Partial<ConfigEmpresa>, okMsg: string) {
    setBusy(k)
    setMsg(null)
    try {
      await updateConfig(patch)
      await qc.invalidateQueries({ queryKey: ['config_empresa'] })
      setMsg({ k, ok: okMsg })
    } catch (err) {
      setMsg({ k, err })
    } finally {
      setBusy('')
    }
  }

  const status = (custom: boolean) =>
    custom ? <span className="badge warn">personalizado</span> : <span className="badge ok">padrão do sistema</span>
  const feedback = (k: 'cond' | 'claus') =>
    msg?.k === k && (msg.err ? <ErrorBox error={msg.err} /> : <div className="ok-box">{msg.ok}</div>)

  return (
    <>
      <section className="panel">
        <PanelHead eyebrow="PROPOSTA" title="Condições gerais da proposta">
          {isAdmin && (
            <>
              <button type="button" className="outline" disabled={!!busy || config.condicoes_proposta == null}
                onClick={() => confirm('Voltar às condições padrão do sistema?') && save('cond', { condicoes_proposta: null }, 'Condições padrão restauradas.')}>
                <RotateCcw size={14} aria-hidden="true" /> Restaurar padrão
              </button>
              <button type="button" className="primary" disabled={!!busy}
                onClick={() => save('cond', { condicoes_proposta: cond.map((s) => s.trim()).filter(Boolean) }, 'Condições salvas.')}>
                {busy === 'cond' ? 'Salvando…' : 'Salvar condições'}
              </button>
            </>
          )}
        </PanelHead>
        <div className="com-status">{status(config.condicoes_proposta != null)} Cada orçamento pode personalizar as suas.</div>
        {feedback('cond')}
        <TextListEditor items={cond} onChange={setCond} readOnly={!isAdmin} addLabel="Adicionar condição" />
      </section>

      <section className="panel">
        <PanelHead eyebrow="CONTRATO" title="Cláusulas do contrato">
          {isAdmin && (
            <>
              <button type="button" className="outline" disabled={!!busy || config.clausulas_contrato == null}
                onClick={() => confirm('Voltar às cláusulas padrão do sistema?') && save('claus', { clausulas_contrato: null }, 'Cláusulas padrão restauradas.')}>
                <RotateCcw size={14} aria-hidden="true" /> Restaurar padrão
              </button>
              <button type="button" className="primary" disabled={!!busy}
                onClick={() => save('claus', {
                  clausulas_contrato: claus.map((c) => ({ titulo: c.titulo.trim(), texto: c.texto.trim() })).filter((c) => c.titulo || c.texto),
                }, 'Cláusulas salvas.')}>
                {busy === 'claus' ? 'Salvando…' : 'Salvar cláusulas'}
              </button>
            </>
          )}
        </PanelHead>
        <div className="com-status">{status(config.clausulas_contrato != null)} Valem para todos os contratos.</div>
        {feedback('claus')}
        {MARCADORES_CONTRATO.length > 0 && (
          <details className="com-marcadores">
            <summary>Marcadores disponíveis (trocados pelos dados de cada contrato)</summary>
            <dl>
              {MARCADORES_CONTRATO.map((m) => (
                <div key={m.marcador}><dt><code>{m.marcador}</code></dt><dd>{m.descricao}</dd></div>
              ))}
            </dl>
          </details>
        )}
        <ClausulasEditor items={claus} onChange={setClaus} readOnly={!isAdmin} />
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth()
  const { data, error, isLoading } = useConfigEmpresa()
  // referência estável: os formulários só recarregam quando a configuração muda no banco
  const config = useMemo(() => (data ? normConfig(data) : null), [data])
  if (isLoading) return <div className="view"><Loading /></div>
  return (
    <div className="view com-view">
      {!isAdmin && <div className="notice">Somente administradores alteram estas configurações. Você está vendo em modo leitura.</div>}
      {error ? (
        <section className="panel">
          <ErrorBox error={'Não foi possível carregar a configuração. ' + MIGRACAO + ' (' + (error instanceof Error ? error.message : String(error)) + ')'} />
        </section>
      ) : !config ? (
        <section className="panel"><ErrorBox error={'A linha de configuração (id = 1) não existe. ' + MIGRACAO} /></section>
      ) : (
        <>
          <DadosSection config={config} isAdmin={isAdmin} />
          <ServicosSection isAdmin={isAdmin} />
          <TextosSection config={config} isAdmin={isAdmin} />
        </>
      )}
    </div>
  )
}
