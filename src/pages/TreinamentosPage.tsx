import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { ErrorBox, Modal, PanelHead, fmtDate } from '../components/ui'
import { removePhotos, useChildren, useRemove, useSave } from '../lib/db'
import {
  desligado, hojeISO, NRS_TREINAMENTO, statusValidade, VALIDADE_SUGERIDA_MESES, validadeSugerida, type StatusValidadeKey,
} from '../lib/periodicidade'
import type { Trabalhador, Treinamento } from '../lib/types'
import { useCondo } from '../state/CondoProvider'
import { abrirArquivo, ArquivoCampo, useArquivoSessao } from './AsosPage'
import '../styles/saude.css'

type TreForm = Omit<Treinamento, 'id'> & { id?: string }

const nrLabel = (nr: string) => (nr && nr !== 'outro' ? nr : '')
const FILTROS: { value: '' | StatusValidadeKey; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'vencendo', label: 'Vencendo em 30 dias' },
  { value: 'valido', label: 'Válidos' },
  { value: 'sem_validade', label: 'Sem validade' },
]

const anos = (m: number) => (m % 12 === 0 ? `${m / 12} ano${m === 12 ? '' : 's'}` : `${m} meses`)

export default function TreinamentosPage() {
  const { condo } = useCondo()
  const nav = useNavigate()
  const id = condo?.id
  const { data: trabalhadores = [], error: trabErr, isLoading } = useChildren('trabalhadores', id)
  const { data: treinamentos = [], error: treErr } = useChildren('treinamentos', id)
  const { data: funcoes = [] } = useChildren('funcoes', id)
  const save = useSave<TreForm>('treinamentos')
  const remove = useRemove('treinamentos')
  const arquivos = useArquivoSessao()

  const [editing, setEditing] = useState<TreForm | null>(null)
  const [original, setOriginal] = useState<string | null>(null)
  /** validade preenchida pela sugestão (é refeita quando NR/data mudam) */
  const [validadeAuto, setValidadeAuto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [filtro, setFiltro] = useState<'' | StatusValidadeKey>('')
  const [mostrarDesligados, setMostrarDesligados] = useState(false)

  const hoje = hojeISO()
  const funcaoNome = useMemo(() => new Map(funcoes.map((f) => [f.id, f.nome])), [funcoes])

  const grupos = useMemo(() => trabalhadores.map((t) => {
    const lista = treinamentos
      .filter((x) => x.trabalhador_id === t.id)
      .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
    // só o treinamento mais recente de cada NR conta para a situação
    const vistos = new Set<string>()
    const itens = lista.map((x) => {
      const k = x.nr || x.titulo
      const atual = !vistos.has(k)
      vistos.add(k)
      return { x, atual, st: statusValidade(x.validade, hoje) }
    })
    return { t, itens, ativo: !desligado(t, hoje) }
  }), [trabalhadores, treinamentos, hoje])

  if (!condo) return null

  const atuais = grupos.filter((g) => g.ativo).flatMap((g) => g.itens.filter((i) => i.atual))
  const conta = (k: StatusValidadeKey) => atuais.filter((i) => i.st.key === k).length
  const visiveis = grupos
    .filter((g) => mostrarDesligados || g.ativo)
    .map((g) => ({ ...g, itens: filtro ? g.itens.filter((i) => i.atual && i.st.key === filtro) : g.itens }))
    .filter((g) => !filtro || g.itens.length)

  function novo(t?: Trabalhador) {
    setError(null); setOriginal(null); setValidadeAuto(true)
    setEditing({
      condominio_id: condo!.id, trabalhador_id: t?.id ?? '', nr: '', titulo: '', data: hoje, validade: null,
      carga_horaria: '', instrutor: '', arquivo: null, observacoes: '',
    })
  }

  function editar(x: Treinamento) {
    setError(null); setOriginal(x.arquivo); setValidadeAuto(false)
    setEditing({ ...x })
  }

  function set(patch: Partial<TreForm>) {
    setEditing((e) => {
      if (!e) return e
      const next = { ...e, ...patch }
      if ('nr' in patch) {
        const antes = NRS_TREINAMENTO.find((n) => n.value === e.nr)?.titulo ?? ''
        const novoTitulo = NRS_TREINAMENTO.find((n) => n.value === next.nr)?.titulo ?? ''
        if (!e.titulo || e.titulo === antes) next.titulo = novoTitulo
      }
      if (validadeAuto && ('nr' in patch || 'data' in patch)) next.validade = validadeSugerida(next.nr, next.data)
      return next
    })
  }

  function fechar() {
    void arquivos.descartar()
    setEditing(null)
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editing) return
    if (!editing.trabalhador_id) { setError('Escolha o trabalhador.'); return }
    if (!editing.nr && !editing.titulo.trim()) { setError('Informe a NR ou o título do treinamento.'); return }
    if (editing.data && editing.validade && editing.validade < editing.data) { setError('A validade não pode ser anterior à data do treinamento.'); return }
    setBusy(true); setError(null)
    try {
      await save.mutateAsync({ ...editing, titulo: editing.titulo.trim(), data: editing.data || null, validade: editing.validade || null })
      await arquivos.confirmar(editing.arquivo, original)
      setEditing(null)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function excluir(x: Treinamento) {
    if (!confirm(`Excluir o treinamento ${[nrLabel(x.nr), x.titulo].filter(Boolean).join(' — ')}?`)) return
    try {
      await remove.mutateAsync(x.id)
      if (x.arquivo) await removePhotos([x.arquivo]).catch(() => undefined)
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const e = editing
  const sugMeses = e ? VALIDADE_SUGERIDA_MESES[e.nr] : undefined
  const sug = e ? validadeSugerida(e.nr, e.data) : null

  return (
    <div className="view">
      <section className="panel">
        <PanelHead eyebrow="Capacitação · NRs" title="Treinamentos dos trabalhadores">
          <button className="primary" onClick={() => novo()} disabled={!trabalhadores.length}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" /> Treinamento
          </button>
        </PanelHead>
        <div className="notice">
          Validades sugeridas (confira o conteúdo programático e a norma): NR-35 e NR-10 a cada 2 anos, NR-33 e NR-05 (CIPA /
          designado) anuais. As demais NRs não têm prazo fixo — refaça em mudança de função ou procedimento, retorno de afastamento
          ou após acidente. Só o treinamento mais recente de cada NR conta para a situação do trabalhador.
        </div>
        {(trabErr || treErr) && <ErrorBox error="Não foi possível carregar trabalhadores/treinamentos (a migração 0005 já foi aplicada no banco?)" />}

        {!isLoading && !trabalhadores.length && !trabErr && (
          <div className="empty">
            Nenhum trabalhador cadastrado. <button className="outline small" onClick={() => nav('/trabalhadores')}>Cadastrar trabalhadores</button>
          </div>
        )}

        {trabalhadores.length > 0 && (
          <>
            <div className="saude-resumo">
              <span className="badge">{atuais.length} treinamento{atuais.length === 1 ? '' : 's'} vigente{atuais.length === 1 ? '' : 's'}</span>
              {conta('vencido') > 0 && <span className="badge bad">{conta('vencido')} vencido{conta('vencido') === 1 ? '' : 's'}</span>}
              {conta('vencendo') > 0 && <span className="badge warn">{conta('vencendo')} vencendo</span>}
              <span className="badge ok">{conta('valido')} válido{conta('valido') === 1 ? '' : 's'}</span>
            </div>
            <div className="saude-filtros">
              <label>
                Mostrar
                <select value={filtro} onChange={(ev) => setFiltro(ev.target.value as '' | StatusValidadeKey)}>
                  {FILTROS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              {grupos.some((g) => !g.ativo) && (
                <button type="button" className="ghost" onClick={() => setMostrarDesligados((v) => !v)}>
                  {mostrarDesligados ? 'Ocultar desligados' : 'Mostrar desligados'}
                </button>
              )}
            </div>
            {visiveis.length === 0 && <div className="empty">Nenhum treinamento nesta situação.</div>}
            {visiveis.map((g) => (
              <div className="entity-card saude-card" key={g.t.id}>
                <div className="entity-head">
                  <div>
                    <div className="entity-title">
                      {g.t.nome} {!g.ativo && <span className="badge">desligado</span>}
                    </div>
                    <div className="entity-meta">
                      {[(g.t.funcao_id && funcaoNome.get(g.t.funcao_id)) || 'sem função', `${g.itens.length} treinamento${g.itens.length === 1 ? '' : 's'}`].join(' · ')}
                    </div>
                  </div>
                  <div className="entity-actions">
                    <button className="outline" onClick={() => novo(g.t)}><Plus size={14} aria-hidden="true" /> Treinamento</button>
                  </div>
                </div>
                {g.itens.length > 0 && (
                  <div className="saude-hist">
                    {g.itens.map(({ x, atual, st }) => (
                      <div className="saude-hist-row" key={x.id}>
                        <div>
                          <div className="entity-title">
                            {[nrLabel(x.nr), x.titulo].filter(Boolean).join(' — ') || 'Treinamento'}{' '}
                            {atual ? <span className={'badge ' + st.cls}>{st.key === 'valido' ? `válido até ${fmtDate(x.validade)}` : st.label}</span>
                              : <span className="badge">substituído</span>}
                          </div>
                          <div className="entity-meta">
                            {[
                              x.data && `Realizado em ${fmtDate(x.data)}`,
                              x.validade && st.key !== 'valido' && `validade ${fmtDate(x.validade)}`,
                              x.carga_horaria && `${x.carga_horaria}${/^\d+([,.]\d+)?$/.test(x.carga_horaria.trim()) ? ' h' : ''}`,
                              x.instrutor && `Instrutor: ${x.instrutor}`,
                              x.arquivo ? 'certificado anexado' : 'sem certificado',
                            ].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <div className="entity-actions">
                          {x.arquivo && <button className="outline" onClick={() => abrirArquivo(x.arquivo!)}><FileText size={14} aria-hidden="true" /> Certificado</button>}
                          <button className="outline" onClick={() => editar(x)}>Editar</button>
                          <button className="danger" onClick={() => excluir(x)}>Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </section>

      {e && (
        <Modal title={(e.id ? 'Editar' : 'Novo') + ' treinamento'} onClose={fechar}>
          <form onSubmit={salvar}>
            <ErrorBox error={error} />
            <div className="form-grid two">
              <label className="span2">
                Trabalhador *
                <select value={e.trabalhador_id} required onChange={(ev) => set({ trabalhador_id: ev.target.value })}>
                  <option value="">— selecione —</option>
                  {grupos.filter((g) => g.ativo || g.t.id === e.trabalhador_id).map((g) => (
                    <option key={g.t.id} value={g.t.id}>{g.t.nome}{g.t.funcao_id && funcaoNome.get(g.t.funcao_id) ? ` — ${funcaoNome.get(g.t.funcao_id)}` : ''}</option>
                  ))}
                </select>
              </label>
              <label>
                NR
                <select value={e.nr} onChange={(ev) => set({ nr: ev.target.value })}>
                  <option value="">— selecione —</option>
                  {NRS_TREINAMENTO.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </label>
              <label>
                Título
                <input value={e.titulo} onChange={(ev) => set({ titulo: ev.target.value })} placeholder="Trabalho em altura — reciclagem" />
              </label>
              <label>
                Data do treinamento
                <input type="date" value={e.data ?? ''} onChange={(ev) => set({ data: ev.target.value || null })} />
              </label>
              <label>
                Válido até
                <input
                  type="date" value={e.validade ?? ''}
                  onChange={(ev) => { setValidadeAuto(false); set({ validade: ev.target.value || null }) }}
                />
                {sugMeses ? (
                  <span className="field-hint">
                    Sugestão {e.nr}: {anos(sugMeses)}{sug ? ` (${fmtDate(sug)})` : ''}.{' '}
                    {sug && e.validade !== sug && (
                      <button type="button" className="ghost" style={{ padding: '2px 6px' }} onClick={() => { setValidadeAuto(true); set({ validade: sug }) }}>
                        Usar sugestão
                      </button>
                    )}
                  </span>
                ) : (
                  e.nr && <span className="field-hint">Sem prazo fixo de reciclagem para esta NR; deixe em branco se não houver.</span>
                )}
              </label>
              <label>
                Carga horária
                <input value={e.carga_horaria} onChange={(ev) => set({ carga_horaria: ev.target.value })} placeholder="8" inputMode="decimal" />
              </label>
              <label>
                Instrutor / empresa
                <input value={e.instrutor} onChange={(ev) => set({ instrutor: ev.target.value })} />
              </label>
              <label className="span2">
                Observações
                <textarea value={e.observacoes} onChange={(ev) => set({ observacoes: ev.target.value })} />
              </label>
              <ArquivoCampo
                condoId={condo.id} pasta="treinamentos" label="Certificado (PDF)" value={e.arquivo}
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
