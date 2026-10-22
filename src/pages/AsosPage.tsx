import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Paperclip, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { ErrorBox, Modal, PanelHead, fmtDate } from '../components/ui'
import { usePlanoPcmso } from '../components/AlertasPanel'
import { removePhotos, signedUrls, useChildren, useEquipe, useRemove, useSave } from '../lib/db'
import { PHOTO_BUCKET, must, supabase } from '../lib/supabase'
import { signatario } from '../lib/signatarios'
import {
  desligado, examesDaFuncao, examesIniciais, hojeISO, mesesPeriodico, ordemExame, statusAso, type StatusAso, type StatusAsoKey,
} from '../lib/periodicidade'
import { TIPOS_ASO, type Aso, type Equipe, type ExameAso, type Trabalhador } from '../lib/types'
import { useCondo } from '../state/CondoProvider'
import '../styles/saude.css'

// ---------------------------------------------------------------------------
// Arquivos (PDF do ASO / certificado) — compartilhado com TreinamentosPage
// ---------------------------------------------------------------------------

/** Envia um PDF para o bucket "fotos" em <condo>/<pasta>/. */
export async function uploadArquivoSaude(condoId: string, pasta: 'asos' | 'treinamentos', file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf'
  const path = `${condoId}/${pasta}/${crypto.randomUUID()}.${ext}`
  must(await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'application/pdf' }))
  return path
}

export async function abrirArquivo(path: string) {
  const url = (await signedUrls([path]))[path]
  if (url) window.open(url, '_blank', 'noopener')
  else alert('Não foi possível abrir o arquivo.')
}

/**
 * Controla os arquivos enviados enquanto o formulário está aberto: ao salvar, apaga o
 * arquivo antigo substituído e os envios descartados; ao cancelar, apaga os envios novos.
 */
export function useArquivoSessao() {
  const enviados = useRef<string[]>([])
  return {
    registrar: (p: string) => { enviados.current.push(p) },
    async confirmar(final: string | null, original: string | null) {
      const lixo = enviados.current.filter((p) => p !== final)
      if (original && original !== final) lixo.push(original)
      enviados.current = []
      if (lixo.length) await removePhotos(lixo).catch(() => undefined)
    },
    async descartar() {
      const lixo = enviados.current
      enviados.current = []
      if (lixo.length) await removePhotos(lixo).catch(() => undefined)
    },
  }
}

export function ArquivoCampo({
  condoId, pasta, label, value, onChange, onEnviado,
}: {
  condoId: string; pasta: 'asos' | 'treinamentos'; label: string; value: string | null
  onChange: (path: string | null) => void; onEnviado: (path: string) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  return (
    <div className="span2">
      <label>{label}</label>
      <div className="photo-buttons">
        <label className="photo-btn">
          <Paperclip size={15} strokeWidth={1.75} aria-hidden="true" /> {value ? 'Trocar arquivo' : 'Anexar PDF'}
          <input
            type="file" accept="application/pdf,image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setEnviando(true); setErro(null)
              try {
                const path = await uploadArquivoSaude(condoId, pasta, f)
                onEnviado(path)
                onChange(path)
              } catch (err) {
                setErro(err)
              } finally {
                setEnviando(false)
              }
            }}
          />
        </label>
        {value && !enviando && (
          <>
            <button type="button" className="outline small" onClick={() => abrirArquivo(value)}><FileText size={14} aria-hidden="true" /> Abrir</button>
            <button type="button" className="ghost" onClick={() => onChange(null)}>Remover</button>
          </>
        )}
        {enviando && <span className="field-hint">Enviando…</span>}
      </div>
      <ErrorBox error={erro} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ASOs
// ---------------------------------------------------------------------------

type AsoForm = Omit<Aso, 'id'> & { id?: string }

const tipoLabel = (t: string) => TIPOS_ASO.find((x) => x.value === t)?.label ?? t
const RESULTADOS_EXAME: { value: ExameAso['resultado']; label: string }[] = [
  { value: '', label: '— não informado —' },
  { value: 'normal', label: 'Normal' },
  { value: 'alterado', label: 'Alterado' },
  { value: 'estavel', label: 'Estável' },
  { value: 'agravamento', label: 'Agravamento' },
]
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

/** Nome, CRM (só números) e UF do médico a partir do cadastro da equipe. */
function medicoCampos(m: Equipe | null): Pick<Aso, 'medico_id' | 'medico_nome' | 'medico_crm' | 'medico_uf'> {
  if (!m) return { medico_id: null, medico_nome: '', medico_crm: '', medico_uf: '' }
  const reg = m.registro || ''
  const digitos = reg.replace(/\D/g, '')
  const ufReg = (reg.toUpperCase().match(/\b[A-Z]{2}\b/g) ?? []).find((x) => UFS.includes(x)) ?? ''
  return { medico_id: m.id, medico_nome: m.nome, medico_crm: digitos || reg, medico_uf: (m.uf_conselho || ufReg).toUpperCase() }
}

const ORDEM_STATUS: Record<StatusAsoKey, number> = { sem_admissional: 0, vencido: 1, vencendo: 2, em_dia: 3, encerrado: 4 }
const FILTROS: { value: '' | StatusAsoKey; label: string }[] = [
  { value: '', label: 'Todos os ativos' },
  { value: 'sem_admissional', label: 'Sem admissional' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'vencendo', label: 'Vencendo em 30 dias' },
  { value: 'em_dia', label: 'Em dia' },
]

export default function AsosPage() {
  const { condo } = useCondo()
  const nav = useNavigate()
  const id = condo?.id
  const { data: trabalhadores = [], error: trabErr, isLoading } = useChildren('trabalhadores', id)
  const { data: asos = [], error: asoErr } = useChildren('asos', id)
  const { data: funcoes = [] } = useChildren('funcoes', id)
  const { data: equipe = [] } = useEquipe()
  const plan = usePlanoPcmso(condo)
  const save = useSave<AsoForm>('asos')
  const remove = useRemove('asos')
  const arquivos = useArquivoSessao()

  const [editing, setEditing] = useState<AsoForm | null>(null)
  const [original, setOriginal] = useState<string | null>(null)
  const [examesEditados, setExamesEditados] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [filtro, setFiltro] = useState<'' | StatusAsoKey>('')

  const hoje = hojeISO()
  const funcaoNome = useMemo(() => new Map(funcoes.map((f) => [f.id, f.nome])), [funcoes])
  const medicos = equipe.filter((m) => m.tipo === 'medico')
  const medicoPadrao = condo ? signatario('pcmso', condo, equipe).membro : null

  const linhas = useMemo(() => trabalhadores.map((t) => {
    const fn = t.funcao_id ? funcaoNome.get(t.funcao_id) ?? '' : ''
    const st = statusAso(t, asos, mesesPeriodico(plan, fn), hoje)
    const hist = asos.filter((a) => a.trabalhador_id === t.id).sort((a, b) => b.data.localeCompare(a.data))
    return { t, fn, st, hist, ativo: !desligado(t, hoje) }
  }), [trabalhadores, asos, plan, funcaoNome, hoje])

  if (!condo) return null

  const ativos = linhas.filter((l) => l.ativo).sort((a, b) => ORDEM_STATUS[a.st.key] - ORDEM_STATUS[b.st.key] || a.t.nome.localeCompare(b.t.nome, 'pt-BR'))
  const inativos = linhas.filter((l) => !l.ativo)
  const contagem = (k: StatusAsoKey) => ativos.filter((l) => l.st.key === k).length
  const visiveis = filtro ? ativos.filter((l) => l.st.key === filtro) : ativos

  const examesPara = (trabId: string, tipo: Aso['tipo'], data: string, ignorar?: string) => {
    const t = trabalhadores.find((x) => x.id === trabId)
    const fn = t?.funcao_id ? funcaoNome.get(t.funcao_id) : null
    return examesIniciais(examesDaFuncao(plan, fn), data, tipo, asos, trabId, ignorar)
  }

  function novo(t?: Trabalhador) {
    const trabId = t?.id ?? ''
    const temAso = asos.some((a) => a.trabalhador_id === trabId)
    const tipo: Aso['tipo'] = !temAso ? 'admissional' : t && t.data_demissao ? 'demissional' : 'periodico'
    const data = hoje
    setError(null); setOriginal(null); setExamesEditados(false)
    setEditing({
      condominio_id: condo!.id, trabalhador_id: trabId, data, tipo, resultado: 'apto', ...medicoCampos(medicoPadrao),
      exames: trabId ? examesPara(trabId, tipo, data) : [], arquivo: null, observacoes: '',
    })
  }

  function editar(a: Aso) {
    setError(null); setOriginal(a.arquivo); setExamesEditados(true)
    setEditing({ ...a, exames: (a.exames ?? []).map((e) => ({ ...e })) })
  }

  /** Atualiza o formulário; trabalhador/tipo/data refazem os exames enquanto a lista não foi editada à mão. */
  function set(patch: Partial<AsoForm>) {
    setEditing((e) => {
      if (!e) return e
      const next = { ...e, ...patch }
      const mudouBase = 'trabalhador_id' in patch || 'tipo' in patch || 'data' in patch
      if (mudouBase && next.trabalhador_id) {
        if (!examesEditados) next.exames = examesPara(next.trabalhador_id, next.tipo, next.data, next.id)
        else if ('data' in patch) next.exames = next.exames.map((x) => (x.data === e.data ? { ...x, data: next.data } : x))
      }
      return next
    })
  }

  const setExame = (i: number, patch: Partial<ExameAso>) => {
    setExamesEditados(true)
    setEditing((e) => (e ? { ...e, exames: e.exames.map((x, j) => (j === i ? { ...x, ...patch } : x)) } : e))
  }

  function fechar() {
    void arquivos.descartar()
    setEditing(null)
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editing) return
    if (!editing.trabalhador_id) { setError('Escolha o trabalhador.'); return }
    if (!editing.data) { setError('Informe a data do ASO.'); return }
    setBusy(true); setError(null)
    try {
      const exames = editing.exames
        .filter((x) => x.nome.trim() || x.codigo.trim())
        .map((x) => ({ ...x, nome: x.nome.trim(), codigo: x.codigo.replace(/\D/g, '').slice(0, 4), data: x.data || editing.data }))
      await save.mutateAsync({ ...editing, exames, medico_uf: editing.medico_uf.toUpperCase().slice(0, 2) })
      await arquivos.confirmar(editing.arquivo, original)
      setEditing(null)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function excluir(a: Aso) {
    if (!confirm(`Excluir o ASO ${tipoLabel(a.tipo).toLowerCase()} de ${fmtDate(a.data)}?`)) return
    try {
      await remove.mutateAsync(a.id)
      if (a.arquivo) await removePhotos([a.arquivo]).catch(() => undefined)
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const proximoTxt = (st: StatusAso) =>
    st.proximo ? `Próximo periódico: ${fmtDate(st.proximo)} (a cada ${st.meses} meses)` : st.key === 'sem_admissional' ? 'Registre o ASO admissional' : ''

  const card = (l: (typeof linhas)[number]) => {
    const u = l.st.ultimo
    const aberto = abertos[l.t.id]
    return (
      <div className="entity-card saude-card" key={l.t.id}>
        <div className="entity-head">
          <div>
            <div className="entity-title">{l.t.nome} <span className={'badge ' + l.st.cls}>{l.st.label}</span></div>
            <div className="entity-meta">
              {[
                l.fn || 'sem função',
                u ? `Último: ${tipoLabel(u.tipo)} em ${fmtDate(u.data)} (${u.resultado})` : 'Nenhum ASO registrado',
                proximoTxt(l.st),
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="entity-actions">
            <button className="outline" onClick={() => novo(l.t)}><Plus size={14} aria-hidden="true" /> ASO</button>
            <button className="ghost" aria-expanded={!!aberto} onClick={() => setAbertos((s) => ({ ...s, [l.t.id]: !s[l.t.id] }))}>
              Histórico ({l.hist.length})
            </button>
          </div>
        </div>
        {aberto && (
          <div className="saude-hist">
            {l.hist.length === 0 && <div className="saude-hist-empty">Nenhum ASO registrado.</div>}
            {l.hist.map((a) => (
              <div className="saude-hist-row" key={a.id}>
                <div>
                  <div className="entity-title">
                    {tipoLabel(a.tipo)} · {fmtDate(a.data)} <span className={'badge ' + (a.resultado === 'apto' ? 'ok' : 'bad')}>{a.resultado}</span>
                  </div>
                  <div className="entity-meta">
                    {[
                      a.medico_nome && `Dr(a). ${a.medico_nome}${a.medico_crm ? ` — CRM ${a.medico_crm}${a.medico_uf ? '/' + a.medico_uf : ''}` : ''}`,
                      `${(a.exames ?? []).length} exame${(a.exames ?? []).length === 1 ? '' : 's'}`,
                      (a.exames ?? []).some((x) => x.resultado === 'alterado' || x.resultado === 'agravamento') && 'com exame alterado',
                      a.arquivo ? 'PDF anexado' : 'sem PDF',
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="entity-actions">
                  {a.arquivo && <button className="outline" onClick={() => abrirArquivo(a.arquivo!)}><FileText size={14} aria-hidden="true" /> PDF</button>}
                  <button className="outline" onClick={() => editar(a)}>Editar</button>
                  <button className="danger" onClick={() => excluir(a)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const e = editing
  const trabSel = e ? trabalhadores.find((t) => t.id === e.trabalhador_id) : undefined
  const fnSel = trabSel?.funcao_id ? funcaoNome.get(trabSel.funcao_id) : ''

  return (
    <div className="view">
      <section className="panel">
        <PanelHead eyebrow="Saúde ocupacional · NR-7" title="ASOs dos trabalhadores">
          <button className="primary" onClick={() => novo()} disabled={!trabalhadores.length}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" /> ASO
          </button>
        </PanelHead>
        <div className="notice">
          O próximo periódico é calculado pela periodicidade do exame clínico no PCMSO da função (anual, semestral ou bienal; sem
          informação, 12 meses), contando do último admissional, periódico, retorno ou mudança de risco. Os exames do formulário vêm
          do plano do PCMSO com o código da tabela 27 do eSocial.
        </div>
        {(trabErr || asoErr) && <ErrorBox error="Não foi possível carregar trabalhadores/ASOs (a migração 0005 já foi aplicada no banco?)" />}

        {!isLoading && !trabalhadores.length && !trabErr && (
          <div className="empty">
            Nenhum trabalhador cadastrado. <button className="outline small" onClick={() => nav('/trabalhadores')}>Cadastrar trabalhadores</button>
          </div>
        )}

        {ativos.length > 0 && (
          <>
            <div className="saude-resumo">
              <span className="badge">{ativos.length} ativo{ativos.length === 1 ? '' : 's'}</span>
              {contagem('sem_admissional') > 0 && <span className="badge bad">{contagem('sem_admissional')} sem admissional</span>}
              {contagem('vencido') > 0 && <span className="badge bad">{contagem('vencido')} vencido{contagem('vencido') === 1 ? '' : 's'}</span>}
              {contagem('vencendo') > 0 && <span className="badge warn">{contagem('vencendo')} vencendo</span>}
              <span className="badge ok">{contagem('em_dia')} em dia</span>
            </div>
            <div className="saude-filtros">
              <label>
                Mostrar
                <select value={filtro} onChange={(ev) => setFiltro(ev.target.value as '' | StatusAsoKey)}>
                  {FILTROS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
            </div>
            {visiveis.length === 0 && <div className="empty">Nenhum trabalhador nesta situação.</div>}
            {visiveis.map(card)}
          </>
        )}

        {inativos.length > 0 && (
          <details className="saude-inativos">
            <summary>Desligados ({inativos.length})</summary>
            {inativos.map(card)}
          </details>
        )}
      </section>

      {e && (
        <Modal title={(e.id ? 'Editar' : 'Registrar') + ' ASO'} onClose={fechar}>
          <form onSubmit={salvar}>
            <ErrorBox error={error} />
            <div className="form-grid two">
              <label className="span2">
                Trabalhador *
                <select value={e.trabalhador_id} required onChange={(ev) => set({ trabalhador_id: ev.target.value })}>
                  <option value="">— selecione —</option>
                  {linhas.map((l) => (
                    <option key={l.t.id} value={l.t.id}>{l.t.nome}{l.fn ? ` — ${l.fn}` : ''}{l.ativo ? '' : ' (desligado)'}</option>
                  ))}
                </select>
                {trabSel && <span className="field-hint">Exames do PCMSO para: {fnSel || 'trabalhador sem função (plano geral)'}</span>}
              </label>
              <label>
                Tipo *
                <select value={e.tipo} required onChange={(ev) => set({ tipo: ev.target.value as Aso['tipo'] })}>
                  {TIPOS_ASO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label>
                Data do ASO *
                <input type="date" value={e.data} required onChange={(ev) => set({ data: ev.target.value })} />
              </label>
              <label>
                Resultado *
                <select value={e.resultado} onChange={(ev) => set({ resultado: ev.target.value as Aso['resultado'] })}>
                  <option value="apto">Apto</option>
                  <option value="inapto">Inapto</option>
                </select>
              </label>
              <label>
                Médico (equipe)
                <select
                  value={e.medico_id ?? ''}
                  onChange={(ev) => set(medicoCampos(medicos.find((m) => m.id === ev.target.value) ?? null))}
                >
                  <option value="">— outro médico (digitar) —</option>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}{m.id === medicoPadrao?.id ? ' (PCMSO)' : ''}</option>)}
                </select>
              </label>
              <div className="span2 medico-box">
                <label>
                  Nome do médico
                  <input value={e.medico_nome} onChange={(ev) => set({ medico_nome: ev.target.value })} />
                </label>
                <label>
                  CRM
                  <input value={e.medico_crm} inputMode="numeric" onChange={(ev) => set({ medico_crm: ev.target.value })} />
                </label>
                <label>
                  UF
                  <input value={e.medico_uf} maxLength={2} onChange={(ev) => set({ medico_uf: ev.target.value.toUpperCase() })} />
                </label>
              </div>

              <div className="span2 exames-box">
                <div className="exames-head">
                  <b>Exames realizados ({e.exames.length})</b>
                  <div className="actions">
                    <button
                      type="button" className="ghost" disabled={!e.trabalhador_id}
                      onClick={() => { setExamesEditados(false); setEditing((x) => (x ? { ...x, exames: examesPara(x.trabalhador_id, x.tipo, x.data, x.id) } : x)) }}
                    >
                      <RotateCcw size={14} aria-hidden="true" /> Recarregar do PCMSO
                    </button>
                    <button
                      type="button" className="outline small"
                      onClick={() => { setExamesEditados(true); setEditing((x) => (x ? { ...x, exames: [...x.exames, { codigo: '', nome: '', data: x.data, ordem: 'referencial', resultado: '' }] } : x)) }}
                    >
                      <Plus size={14} aria-hidden="true" /> Exame
                    </button>
                  </div>
                </div>
                {!e.trabalhador_id && <div className="saude-hist-empty">Escolha o trabalhador para carregar os exames do PCMSO.</div>}
                {e.exames.map((x, i) => (
                  <div className="exame-row" key={i}>
                    <label className="exame-nome">
                      Exame
                      <input value={x.nome} onChange={(ev) => setExame(i, { nome: ev.target.value })} />
                    </label>
                    <label>
                      Cód. T27
                      <input
                        value={x.codigo} inputMode="numeric" maxLength={4}
                        onChange={(ev) => setExame(i, { codigo: ev.target.value })}
                        onBlur={() => e.trabalhador_id && setExame(i, { ordem: ordemExame(x, x.data || e.data, asos, e.trabalhador_id, e.id) })}
                      />
                    </label>
                    <label>
                      Data
                      <input type="date" value={x.data} onChange={(ev) => setExame(i, { data: ev.target.value })} />
                    </label>
                    <label>
                      Ordem
                      <select value={x.ordem} onChange={(ev) => setExame(i, { ordem: ev.target.value as ExameAso['ordem'] })}>
                        <option value="referencial">Referencial</option>
                        <option value="sequencial">Sequencial</option>
                      </select>
                    </label>
                    <label>
                      Resultado
                      <select value={x.resultado} onChange={(ev) => setExame(i, { resultado: ev.target.value as ExameAso['resultado'] })}>
                        {RESULTADOS_EXAME.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </label>
                    <button
                      type="button" className="danger exame-del" aria-label={`Remover ${x.nome || 'exame'}`}
                      onClick={() => { setExamesEditados(true); setEditing((y) => (y ? { ...y, exames: y.exames.filter((_, j) => j !== i) } : y)) }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <span className="field-hint">
                  Referencial = primeira vez que o trabalhador faz o exame; sequencial = as seguintes (preenchido pelo histórico).
                </span>
              </div>

              <label className="span2">
                Observações
                <textarea value={e.observacoes} onChange={(ev) => set({ observacoes: ev.target.value })} />
              </label>
              <ArquivoCampo
                condoId={condo.id} pasta="asos" label="ASO assinado (PDF)" value={e.arquivo}
                onChange={(p) => set({ arquivo: p })} onEnviado={arquivos.registrar}
              />
            </div>
            <div className="actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" className="outline" onClick={fechar}>Cancelar</button>
              <button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
