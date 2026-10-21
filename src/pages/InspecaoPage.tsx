import { useEffect, useMemo, useState } from 'react'
import { Camera, Image as ImageIcon, Plus } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBox, Loading, PanelHead, fmtDate } from '../components/ui'
import { DocButtons } from '../components/DocPreview'
import {
  compressImage, removePhotos, uploadPhoto, useChildren, useEquipe, usePhotoUrls, useRemove, useSave,
} from '../lib/db'
import type { ChecklistItem, Inspecao, ItemStatus } from '../lib/types'
import { CHECKLIST, checklistItems } from '../reports/checklist'
import { buildInspecao } from '../reports'
import { useCondo } from '../state/CondoProvider'
import { useAuth } from '../auth/AuthProvider'

type Draft = Omit<Inspecao, 'id' | 'numero' | 'created_at' | 'updated_at'> & { id?: string; numero?: string | null }

const RESP_DEFAULT = 'Administração do condomínio'

function blankChecklist(): Record<string, ChecklistItem> {
  return Object.fromEntries(
    checklistItems().map((i) => [i.key, {
      titulo: i.titulo, status: 'Pendente', obs: '', acao: '', risco: '', prazo: '', responsavel: RESP_DEFAULT, photos: [],
    } satisfies ChecklistItem]),
  )
}

function counts(c: Record<string, ChecklistItem>) {
  const v = Object.values(c)
  const C = v.filter((i) => i.status === 'Conforme').length
  const NC = v.filter((i) => i.status === 'Não conforme').length
  const NA = v.filter((i) => i.status === 'Não se aplica').length
  return { C, NC, NA, P: v.length - C - NC - NA, idx: C + NC ? Math.round((C / (C + NC)) * 100) : 0 }
}

// ---------------------------------------------------------------------------
// Lista de inspeções do condomínio
// ---------------------------------------------------------------------------

export function InspecaoList() {
  const { condo } = useCondo()
  const { data = [], isLoading } = useChildren('inspecoes', condo?.id)
  const save = useSave<Draft>('inspecoes')
  const remove = useRemove('inspecoes')
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const list = data.filter((i) => !q || `${i.numero} ${i.tecnico} ${i.data_visita}`.toLowerCase().includes(q.toLowerCase()))

  async function duplicate(i: Inspecao) {
    const { id: _id, numero: _n, created_at: _c, updated_at: _u, ...rest } = i
    void _id; void _n; void _c; void _u
    const copy = await save.mutateAsync({ ...rest, agendamento_id: null, data_visita: new Date().toISOString().slice(0, 10) })
    nav('/inspecao/' + copy.id)
  }

  async function del(i: Inspecao) {
    if (!confirm(`Excluir a inspeção ${i.numero}?`)) return
    const paths = [i.foto_capa, ...Object.values(i.checklist).flatMap((c) => c.photos)].filter(Boolean) as string[]
    await remove.mutateAsync(i.id)
    await removePhotos(paths)
  }

  return (
    <div className="view">
      <section className="panel">
        <PanelHead eyebrow="INSPEÇÃO SST" title="Relatórios de inspeção">
          <button className="primary" onClick={() => nav('/inspecao/nova')}><Plus size={16} strokeWidth={2} aria-hidden="true" /> Nova inspeção</button>
        </PanelHead>
        <input placeholder="Buscar por número, técnico ou data…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
        {isLoading && <Loading />}
        {!isLoading && list.length === 0 && <div className="empty">Nenhuma inspeção salva para este condomínio.</div>}
        {list.map((i) => {
          const c = counts(i.checklist)
          return (
            <div className="history-item" key={i.id}>
              <div>
                <div className="history-title">{i.numero} · {fmtDate(i.data_visita)}</div>
                <div className="history-meta">
                  {i.tecnico} · {c.C} conformes · {c.NC} não conformes · índice {c.idx}%
                </div>
              </div>
              <div className="history-actions">
                <DocButtons small title={`Relatório ${i.numero}`} build={(ctx) => buildInspecao(ctx, ctx.inspections.find((x) => x.id === i.id)!)} />
                <Link to={'/inspecao/' + i.id}><button className="outline small">Editar</button></Link>
                <button className="outline small" onClick={() => duplicate(i)}>Duplicar</button>
                <button className="danger small" onClick={() => del(i)}>Excluir</button>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulário (nova / edição)
// ---------------------------------------------------------------------------

export function InspecaoForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { condo } = useCondo()
  const { profile } = useAuth()
  const { data: inspecoes = [], isLoading } = useChildren('inspecoes', condo?.id)
  const { data: funcoes = [] } = useChildren('funcoes', condo?.id)
  const { data: equipe = [] } = useEquipe()
  const { data: agenda = [], isLoading: agendaLoading } = useChildren('agendamentos', condo?.id)
  const save = useSave<Draft>('inspecoes')
  const [d, setD] = useState<Draft | null>(null)
  const [uploading, setUploading] = useState(0)
  const [savedMsg, setSavedMsg] = useState('')

  const existing = id ? inspecoes.find((i) => i.id === id) : undefined

  // Inicializa o rascunho uma única vez (nova ou a partir da existente)
  useEffect(() => {
    if (d || !condo || (id && isLoading) || agendaLoading) return
    if (id) {
      if (existing) setD({ ...existing, checklist: { ...blankChecklist(), ...existing.checklist } })
      return
    }
    // Iniciada pela agenda: usa a data e o técnico agendados
    const ag = agenda.find((a) => a.id === params.get('agenda'))
    const resp = equipe.find((m) => m.id === condo.resp_sst_id)
    const tecnico = ag?.tecnico || resp?.nome || profile?.nome || ''
    setD({
      condominio_id: condo.id,
      agendamento_id: ag?.id ?? null,
      data_visita: ag?.data ?? new Date().toISOString().slice(0, 10),
      tecnico,
      objetivo: 'Verificar as condições de Saúde e Segurança do Trabalho no condomínio, identificando não conformidades e recomendando medidas corretivas.',
      total_empregados: condo.num_trabalhadores?.toString() ?? '',
      proprios: '', terceirizados: '',
      funcoes: funcoes.map((f) => f.nome).join(', '),
      jornadas: '', conclusao: '', recomendacoes: '',
      assinatura_sindica: condo.responsavel_empresa, assinatura_tecnico: tecnico,
      foto_capa: null, checklist: blankChecklist(),
    })
  }, [d, condo, id, isLoading, existing, equipe, funcoes, profile, params, agenda, agendaLoading])

  const allPaths = useMemo(
    () => (d ? [d.foto_capa, ...Object.values(d.checklist).flatMap((c) => c.photos)].filter(Boolean) as string[] : []),
    [d],
  )
  const { data: urls = {} } = usePhotoUrls(allPaths)

  if (!condo) return null
  if (!d) return <Loading text={id && !isLoading ? 'Inspeção não encontrada.' : 'Carregando…'} />

  // Atualizações funcionais: toques rápidos em sequência não se sobrescrevem
  const set = (patch: Partial<Draft>) => { setD((cur) => cur && { ...cur, ...patch }); setSavedMsg('') }
  const setItem = (key: string, patch: Partial<ChecklistItem>) => {
    setD((cur) => cur && { ...cur, checklist: { ...cur.checklist, [key]: { ...cur.checklist[key], ...patch } } })
    setSavedMsg('')
  }

  async function addPhotos(files: FileList | null, onPath: (paths: string[]) => void) {
    if (!files?.length) return
    setUploading((n) => n + files.length)
    try {
      const paths = await Promise.all(
        [...files].map(async (f) => {
          try { return await uploadPhoto(condo!.id, await compressImage(f)) } finally { setUploading((n) => n - 1) }
        }),
      )
      onPath(paths)
    } catch (e) {
      alert('Falha ao enviar foto: ' + (e instanceof Error ? e.message : e))
    }
  }

  function autoConclusion() {
    const items = Object.values(d!.checklist)
    const nc = items.filter((i) => i.status === 'Não conforme')
    const high = nc.filter((i) => i.risco === 'Alto' || i.risco === 'Crítico')
    set({
      conclusao: nc.length
        ? `A inspeção realizada identificou ${nc.length} não conformidade(s) nas condições avaliadas${high.length ? `, sendo ${high.length} classificada(s) como risco alto ou crítico` : ''}. Recomenda-se a implementação das medidas corretivas indicadas neste relatório, priorizando os riscos de maior gravidade e acompanhando o cumprimento dos prazos estabelecidos. Após as adequações, recomenda-se nova verificação das condições de trabalho.`
        : 'Na inspeção realizada não foram identificadas não conformidades nos itens avaliados. Recomenda-se a manutenção das medidas preventivas existentes, o acompanhamento periódico das condições de trabalho e a atualização contínua dos documentos e controles de SST.',
    })
  }

  async function submit() {
    const saved = await save.mutateAsync(d!)
    setD({ ...d!, id: saved.id, numero: saved.numero })
    setSavedMsg(`Inspeção ${saved.numero} salva.`)
    if (!id) nav('/inspecao/' + saved.id, { replace: true })
  }

  function exportCSV() {
    const rows: string[][] = [
      ['Relatório', d!.numero ?? ''], ['Condomínio', condo!.razao_social], ['Data', d!.data_visita], [],
      ['Item', 'Situação', 'Risco', 'Observação', 'Medida recomendada', 'Responsável', 'Prazo'],
    ]
    Object.values(d!.checklist).forEach((i) => rows.push([i.titulo, i.status, i.risco, i.obs, i.acao, i.responsavel, i.prazo]))
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `${d!.numero ?? 'inspecao'}_${condo!.razao_social.replace(/[^\w]+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const c = counts(d.checklist)
  const text = (k: keyof Draft, label: string, extra?: { type?: string; span?: boolean; area?: boolean }) => (
    <label className={extra?.span ? 'span3' : undefined}>
      {label}
      {extra?.area
        ? <textarea value={String(d[k] ?? '')} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} />
        : <input type={extra?.type ?? 'text'} value={String(d[k] ?? '')} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} />}
    </label>
  )
  let n = 0

  return (
    <div className="view">
      <div className="toolbar">
        <button className="outline" onClick={() => nav('/inspecao')}>← Relatórios salvos</button>
        <button className="primary" disabled={save.isPending || uploading > 0} onClick={submit}>
          {uploading ? `Enviando ${uploading} foto(s)…` : save.isPending ? 'Salvando…' : 'Salvar inspeção'}
        </button>
        {d.id && <DocButtons title={`Relatório ${d.numero}`} build={(ctx) => buildInspecao(ctx, ctx.inspections.find((x) => x.id === d.id)!)} />}
        <button className="outline" onClick={exportCSV}>Planilha (CSV)</button>
      </div>
      {d.id && <div className="editing-banner">Editando {d.numero}. A prévia/PDF usa a versão salva; salve antes de gerar.</div>}
      <ErrorBox error={save.error} />
      {savedMsg && <div className="ok-box">{savedMsg}</div>}

      <section className="panel">
        <PanelHead eyebrow="IDENTIFICAÇÃO" title={condo.nome_fantasia || condo.razao_social}>
          <span className="report-number">{d.numero ?? 'Número gerado ao salvar'}</span>
        </PanelHead>
        <div className="notice">
          Dados do condomínio vêm do cadastro: {condo.cnpj} · {condo.endereco} · síndico(a) {condo.responsavel_empresa}.{' '}
          <Link to="/condominio">Alterar cadastro</Link>
        </div>
        <div className="form-grid three">
          {text('data_visita', 'Data da visita', { type: 'date' })}
          <label>
            Técnico responsável
            <input list="insp-tecnicos" value={d.tecnico} onChange={(e) => set({ tecnico: e.target.value })} />
            <datalist id="insp-tecnicos">{equipe.filter((m) => m.tipo === 'sst').map((m) => <option key={m.id} value={m.nome} />)}</datalist>
          </label>
          {text('total_empregados', 'Total de empregados')}
          {text('proprios', 'Próprios')}
          {text('terceirizados', 'Terceirizados')}
          {text('jornadas', 'Jornadas')}
          {text('funcoes', 'Funções', { span: true })}
          {text('objetivo', 'Objetivo da inspeção', { span: true, area: true })}
          <div className="span3">
            <label>Foto de capa (opcional)</label>
            <div className="photo-buttons">
              <label className="photo-btn"><ImageIcon size={15} strokeWidth={1.75} aria-hidden="true" /> Escolher foto
                <input type="file" accept="image/*" onChange={(e) => addPhotos(e.target.files, ([p]) => set({ foto_capa: p }))} />
              </label>
              {d.foto_capa && <button className="outline small" onClick={() => set({ foto_capa: null })}>Remover</button>}
            </div>
            {d.foto_capa && urls[d.foto_capa] && <div className="cover-photo-preview"><img src={urls[d.foto_capa]} alt="" /></div>}
          </div>
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="CHECKLIST" title="Itens avaliados">
          <div className="summary-mini">
            <span className="ok">{c.C} conformes</span><span className="bad">{c.NC} não conformes</span>
            <span>{c.NA} N/A</span><span>{c.P} pendentes</span><span>Índice {c.idx}%</span>
          </div>
        </PanelHead>
        {CHECKLIST.map((sec) => (
          <div key={sec.titulo}>
            <div className="category-title">{sec.titulo}</div>
            {sec.itens.map(() => {
              const key = `item_${n++}`
              const it = d.checklist[key]
              return (
                <div className="check-item" key={key}>
                  <div className="check-title">{it.titulo}</div>
                  <div className="status-row">
                    {(['Conforme', 'Não conforme', 'Não se aplica'] as ItemStatus[]).map((s) => (
                      <button
                        key={s} type="button"
                        className={'status-btn ' + (it.status === s ? 'active ' : '') + (s === 'Conforme' ? 'conforme' : s === 'Não conforme' ? 'nc' : 'na')}
                        onClick={() => setItem(key, { status: it.status === s ? 'Pendente' : s, risco: s === 'Não conforme' ? it.risco || 'Médio' : it.risco })}
                      >{s}</button>
                    ))}
                  </div>
                  <label>Observação<textarea value={it.obs} onChange={(e) => setItem(key, { obs: e.target.value })} /></label>
                  {it.status === 'Não conforme' && (
                    <div className="item-grid" style={{ marginTop: 8 }}>
                      <label>Medida recomendada<textarea value={it.acao} onChange={(e) => setItem(key, { acao: e.target.value })} /></label>
                      <label>
                        Nível de risco
                        <select value={it.risco} onChange={(e) => setItem(key, { risco: e.target.value as ChecklistItem['risco'] })}>
                          {['Baixo', 'Médio', 'Alto', 'Crítico'].map((r) => <option key={r}>{r}</option>)}
                        </select>
                      </label>
                      <label>Prazo para correção<input type="date" value={it.prazo} onChange={(e) => setItem(key, { prazo: e.target.value })} /></label>
                      <label>Responsável pela ação<input value={it.responsavel} onChange={(e) => setItem(key, { responsavel: e.target.value })} /></label>
                    </div>
                  )}
                  <div className="photo-buttons">
                    <label className="photo-btn"><Camera size={15} strokeWidth={1.75} aria-hidden="true" /> Tirar foto
                      <input type="file" accept="image/*" capture="environment"
                        onChange={(e) => addPhotos(e.target.files, (p) => setD((cur) => cur && ({ ...cur, checklist: { ...cur.checklist, [key]: { ...cur.checklist[key], photos: [...cur.checklist[key].photos, ...p] } } })))} />
                    </label>
                    <label className="photo-btn"><ImageIcon size={15} strokeWidth={1.75} aria-hidden="true" /> Galeria
                      <input type="file" accept="image/*" multiple
                        onChange={(e) => addPhotos(e.target.files, (p) => setD((cur) => cur && ({ ...cur, checklist: { ...cur.checklist, [key]: { ...cur.checklist[key], photos: [...cur.checklist[key].photos, ...p] } } })))} />
                    </label>
                  </div>
                  {it.photos.length > 0 && (
                    <div className="photo-strip">
                      {it.photos.map((p) => (
                        <div className="photo-card" key={p}>
                          {urls[p] ? <img src={urls[p]} alt="" /> : <div style={{ width: 110, height: 85 }} />}
                          <button type="button" onClick={() => setItem(key, { photos: it.photos.filter((x) => x !== p) })}>Remover</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </section>

      <section className="panel">
        <PanelHead eyebrow="FECHAMENTO" title="Conclusão e assinaturas">
          <button className="outline" type="button" onClick={autoConclusion}>Gerar conclusão automática</button>
        </PanelHead>
        <div className="form-grid two">
          <label className="span2">Conclusão<textarea value={d.conclusao} onChange={(e) => set({ conclusao: e.target.value })} /></label>
          <label className="span2">Recomendações gerais<textarea value={d.recomendacoes} onChange={(e) => set({ recomendacoes: e.target.value })} /></label>
          <label>Assinatura — síndico(a)<input value={d.assinatura_sindica} onChange={(e) => set({ assinatura_sindica: e.target.value })} /></label>
          <label>Assinatura — técnico<input value={d.assinatura_tecnico} onChange={(e) => set({ assinatura_tecnico: e.target.value })} /></label>
        </div>
        <div className="actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="primary" disabled={save.isPending || uploading > 0} onClick={submit}>Salvar inspeção</button>
        </div>
      </section>
    </div>
  )
}
