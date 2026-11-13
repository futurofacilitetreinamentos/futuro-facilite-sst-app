import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Copy, FileSignature, Plus, Trash2 } from 'lucide-react'
import { DocButtons } from '../components/DocPreview'
import { ErrorBox, Loading, Modal, PanelHead, fmtDate } from '../components/ui'
import {
  addDays, buildContratoDocData, buildPropostaDocData, calcTotais, contratoFromProposta, fmtBRL, fmtPct, itemFromServico, normConfig,
  parseIntMin, parseNum, pendenciasContrato, resolveCondicoes, round2, STATUS_CONTRATO, STATUS_PROPOSTA, todayIso, valoresDaForma,
  valorParcela, withTotals, type FormaPagamento,
} from '../lib/comercial'
import { useChildren, useConfigEmpresa, useRemove, useSave, useServicos } from '../lib/db'
import type {
  Condominio, ConfigEmpresa, Contrato, ItemProposta, Proposta, Servico, StatusContrato, UnidadeServico,
} from '../lib/types'
import { buildContrato, buildProposta } from '../reports/comercial-doc'
import { useCondo } from '../state/CondoProvider'
import { TextListEditor } from './ConfiguracoesPage'
import '../styles/comercial.css'

const ASSETS = import.meta.env.BASE_URL + 'docs-assets/'
const MIGRACAO = 'A migração supabase/migrations/0006_comercial.sql já foi aplicada no Supabase?'
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const FORMA_LABEL: Record<FormaPagamento, string> = { avista: 'à vista', prazo: 'a prazo' }

// ---------------------------------------------------------------------------
// Rascunho do orçamento (campos numéricos como texto enquanto digita)
// ---------------------------------------------------------------------------

interface EdItem {
  key: string
  servico_id: string | null
  nome: string
  descricao_proposta: string
  descricao_contrato: string
  unidade: UnidadeServico
  quantidade: string
  preco_unit: string
  /** quantidade acompanha o nº de colaboradores (itens por colaborador ainda não editados) */
  auto: boolean
  on: boolean
}

interface PropDraft {
  id?: string
  numero: string | null
  data: string
  validade: string
  validadeAuto: boolean
  colaboradores: string
  itens: EdItem[]
  desconto: string
  desconto_pct: string
  acrescimo_pct: string
  parcelas: string
  condicoes: string[] | null
  observacoes: string
}

let seq = 0
const newKey = () => `k${++seq}`

const fromServico = (s: Servico, colab: number, on: boolean): EdItem => {
  const i = itemFromServico(s, colab)
  return {
    key: newKey(), servico_id: s.id, nome: i.nome, descricao_proposta: i.descricao_proposta, descricao_contrato: i.descricao_contrato,
    unidade: i.unidade, quantidade: String(i.quantidade), preco_unit: String(i.preco_unit), auto: i.unidade === 'por_colaborador', on,
  }
}

const fromItem = (i: ItemProposta, colab: number): EdItem => ({
  key: newKey(), servico_id: i.servico_id, nome: i.nome, descricao_proposta: i.descricao_proposta ?? '',
  descricao_contrato: i.descricao_contrato ?? '', unidade: i.unidade ?? 'fixo', quantidade: String(i.quantidade ?? 0),
  preco_unit: String(i.preco_unit ?? 0), auto: i.unidade === 'por_colaborador' && Number(i.quantidade) === colab, on: true,
})

function newDraft(condo: Condominio, cfg: ConfigEmpresa, servicos: Servico[]): PropDraft {
  const colab = condo.num_trabalhadores ?? 0
  const data = todayIso()
  return {
    numero: null, data, validade: addDays(data, cfg.validade_proposta_dias), validadeAuto: true, colaboradores: String(colab),
    itens: servicos.filter((s) => s.ativo).map((s) => fromServico(s, colab, parseNum(s.preco) > 0)),
    desconto: '0', desconto_pct: '0', acrescimo_pct: String(cfg.acrescimo_prazo_pct), parcelas: String(cfg.parcelas_prazo),
    condicoes: null, observacoes: '',
  }
}

function draftFromProposta(p: Proposta, cfg: ConfigEmpresa, servicos: Servico[]): PropDraft {
  const colab = parseNum(p.colaboradores)
  const itens = p.itens ?? []
  const used = new Set<ItemProposta>()
  const rows: EdItem[] = []
  for (const s of servicos.filter((x) => x.ativo)) {
    const it = itens.find((i) => i.servico_id === s.id && !used.has(i))
    if (it) {
      used.add(it)
      rows.push(fromItem(it, colab))
    } else rows.push(fromServico(s, colab, false))
  }
  // serviços que saíram da tabela (inativos/excluídos) e itens avulsos continuam no orçamento
  for (const it of itens) if (!used.has(it)) rows.push(fromItem(it, colab))
  return {
    id: p.id, numero: p.numero, data: p.data, validade: p.validade ?? '',
    validadeAuto: !p.validade || p.validade === addDays(p.data, cfg.validade_proposta_dias),
    colaboradores: String(colab), itens: rows, desconto: String(p.desconto ?? 0), desconto_pct: String(p.desconto_pct ?? 0),
    acrescimo_pct: String(p.acrescimo_pct ?? 0),
    parcelas: String(p.parcelas ?? 1), condicoes: p.condicoes ?? null, observacoes: p.observacoes ?? '',
  }
}

const selectedItems = (d: PropDraft): ItemProposta[] =>
  withTotals(d.itens.filter((i) => i.on).map((i) => ({
    servico_id: i.servico_id, nome: i.nome.trim() || 'Serviço', descricao_proposta: i.descricao_proposta.trim(),
    descricao_contrato: i.descricao_contrato.trim(), unidade: i.unidade, quantidade: parseNum(i.quantidade),
    preco_unit: parseNum(i.preco_unit), total: 0,
  })))

function draftTotais(d: PropDraft) {
  return calcTotais(
    selectedItems(d), parseNum(d.desconto), parseNum(d.acrescimo_pct), parseIntMin(d.parcelas, 1, 1), parseNum(d.desconto_pct),
  )
}

// ---------------------------------------------------------------------------
// Editor do orçamento
// ---------------------------------------------------------------------------

function PropostaEditor({ initial, condo, cfg, onClose }: {
  initial: PropDraft; condo: Condominio; cfg: ConfigEmpresa; onClose: () => void
}) {
  const save = useSave<Partial<Proposta>>('propostas')
  const [d, setD] = useState<PropDraft>(initial)
  const [error, setError] = useState<unknown>(null)
  const t = draftTotais(d)
  const colab = parseIntMin(d.colaboradores, 0, 0)

  const set = (patch: Partial<PropDraft>) => setD((x) => ({ ...x, ...patch }))
  const setItem = (key: string, patch: Partial<EdItem>) =>
    setD((x) => ({ ...x, itens: x.itens.map((i) => (i.key === key ? { ...i, ...patch } : i)) }))

  function setData(v: string) {
    setD((x) => ({ ...x, data: v, validade: x.validadeAuto ? addDays(v, cfg.validade_proposta_dias) : x.validade }))
  }
  function setColab(v: string) {
    const n = parseIntMin(v, 0, 0)
    setD((x) => ({
      ...x, colaboradores: v,
      itens: x.itens.map((i) => (i.auto && i.unidade === 'por_colaborador' ? { ...i, quantidade: String(n) } : i)),
    }))
  }
  function addAvulso() {
    setD((x) => ({
      ...x,
      itens: [...x.itens, {
        key: newKey(), servico_id: null, nome: '', descricao_proposta: '', descricao_contrato: '', unidade: 'fixo',
        quantidade: '1', preco_unit: '0', auto: false, on: true,
      }],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const itens = selectedItems(d)
    if (!d.data) return setError('Informe a data do orçamento.')
    if (!itens.length) return setError('Marque pelo menos um serviço.')
    const row: Partial<Proposta> = {
      id: d.id,
      data: d.data,
      validade: d.validade || null,
      colaboradores: colab,
      itens,
      desconto: t.descontoFixo,
      desconto_pct: t.descontoPct,
      valor_avista: t.avista,
      acrescimo_pct: round2(parseNum(d.acrescimo_pct)),
      parcelas: t.parcelas,
      valor_prazo: t.prazo,
      condicoes: d.condicoes ? d.condicoes.map((s) => s.trim()).filter(Boolean) : null,
      observacoes: d.observacoes,
    }
    if (!d.id) Object.assign(row, { condominio_id: condo.id, status: 'rascunho' })
    try {
      await save.mutateAsync(row)
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  const catalogo = d.itens.filter((i) => i.servico_id)
  const avulsos = d.itens.filter((i) => !i.servico_id)
  const condPadrao = resolveCondicoes(null, cfg)

  const qtyPrice = (i: EdItem) => (
    <>
      <label className="com-item-qty">
        Qtd.{i.unidade === 'por_colaborador' && <small> (colab.)</small>}
        <input type="number" min={0} step="1" inputMode="numeric" value={i.quantidade} disabled={!i.on}
          onChange={(e) => setItem(i.key, { quantidade: e.target.value, auto: false })} />
      </label>
      <label className="com-item-price">
        Valor unit. (R$)
        <input type="number" min={0} step="0.01" inputMode="decimal" value={i.preco_unit} disabled={!i.on}
          onChange={(e) => setItem(i.key, { preco_unit: e.target.value })} />
      </label>
      <div className="com-item-total">
        <span>Total</span>
        <b>{i.on ? fmtBRL(parseNum(i.quantidade) * parseNum(i.preco_unit)) : '—'}</b>
      </div>
    </>
  )

  return (
    <Modal title={d.id ? `Editar orçamento ${d.numero ?? ''}` : 'Novo orçamento'} onClose={onClose}>
      <form onSubmit={submit} className="com-editor">
        <ErrorBox error={error} />
        <div className="form-grid three">
          <label>Data *<input type="date" required value={d.data} onChange={(e) => setData(e.target.value)} /></label>
          <label>
            Validade
            <input type="date" value={d.validade} onChange={(e) => set({ validade: e.target.value, validadeAuto: false })} />
            <span className="field-hint">{d.validadeAuto ? `${cfg.validade_proposta_dias} dias (configuração)` : 'definida manualmente'}</span>
          </label>
          <label>
            Colaboradores
            <input type="number" min={0} step="1" inputMode="numeric" value={d.colaboradores} onChange={(e) => setColab(e.target.value)} />
            <span className="field-hint">Cadastro: {condo.num_trabalhadores ?? '—'}</span>
          </label>
        </div>

        <h3 className="com-h3">Serviços</h3>
        {catalogo.length === 0 && <div className="notice">Nenhum serviço ativo na tabela. Cadastre em Configurações ou use um item avulso.</div>}
        <div className="com-items">
          {catalogo.map((i) => (
            <div className={'com-item' + (i.on ? ' on' : '')} key={i.key}>
              <label className="com-item-main">
                <input type="checkbox" checked={i.on} onChange={(e) => setItem(i.key, { on: e.target.checked })} />
                <span>
                  <b>{i.nome}</b>
                  <small>{i.unidade === 'por_colaborador' ? 'por colaborador' : 'valor fixo'}{i.descricao_proposta && i.descricao_proposta !== i.nome ? ' · ' + i.descricao_proposta : ''}</small>
                </span>
              </label>
              {qtyPrice(i)}
            </div>
          ))}
          {avulsos.map((i) => (
            <div className="com-item on avulso" key={i.key}>
              <div className="com-item-main">
                <input value={i.nome} placeholder="Nome do item avulso *" aria-label="Nome do item avulso" required
                  onChange={(e) => setItem(i.key, { nome: e.target.value, descricao_proposta: e.target.value })} />
                <input value={i.descricao_contrato} placeholder="Texto no contrato (opcional; separe com ;)" aria-label="Texto no contrato"
                  onChange={(e) => setItem(i.key, { descricao_contrato: e.target.value })} />
              </div>
              {qtyPrice(i)}
              <button type="button" className="ghost com-del" aria-label="Remover item" title="Remover item"
                onClick={() => setD((x) => ({ ...x, itens: x.itens.filter((y) => y.key !== i.key) }))}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="outline small" onClick={addAvulso}><Plus size={14} aria-hidden="true" /> Item avulso</button>

        <h3 className="com-h3">Valores</h3>
        <div className="form-grid two">
          <label>Desconto (%)
            <input type="number" min={0} max={100} step="0.01" inputMode="decimal" value={d.desconto_pct} onChange={(e) => set({ desconto_pct: e.target.value })} />
            <span className="field-hint">Sobre o subtotal, somado ao desconto em R$</span>
          </label>
          <label>Desconto (R$)<input type="number" min={0} step="0.01" inputMode="decimal" value={d.desconto} onChange={(e) => set({ desconto: e.target.value })} /></label>
          <label>Acréscimo a prazo (%)<input type="number" min={0} step="0.01" inputMode="decimal" value={d.acrescimo_pct} onChange={(e) => set({ acrescimo_pct: e.target.value })} />
            <span className="field-hint">Padrão: {cfg.acrescimo_prazo_pct}%</span></label>
          <label>Parcelas a prazo<input type="number" min={1} step="1" inputMode="numeric" value={d.parcelas} onChange={(e) => set({ parcelas: e.target.value })} />
            <span className="field-hint">Padrão: {cfg.parcelas_prazo} (1 entrada + {cfg.parcelas_prazo - 1})</span></label>
        </div>
        <div className="com-totais">
          <div><span>Subtotal</span><b>{fmtBRL(t.subtotal)}</b></div>
          {t.descontoPorPct > 0 && <div><span>Desconto ({fmtPct(t.descontoPct)}%)</span><b>− {fmtBRL(t.descontoPorPct)}</b></div>}
          {t.descontoFixo > 0 && <div><span>Desconto</span><b>− {fmtBRL(t.descontoFixo)}</b></div>}
          <div className="main"><span>À vista</span><b>{fmtBRL(t.avista)}</b></div>
          <div className="main"><span>A prazo</span><b>{fmtBRL(t.prazo)}</b><small>{t.parcelas}× de {fmtBRL(t.parcela)}</small></div>
        </div>

        <h3 className="com-h3">Condições gerais</h3>
        {d.condicoes == null ? (
          <div className="com-cond-padrao">
            <p className="field-hint">Usando as condições da configuração ({condPadrao.length}).</p>
            {condPadrao.length > 0 && <ol>{condPadrao.map((c, k) => <li key={k}>{c}</li>)}</ol>}
            <button type="button" className="outline small" onClick={() => set({ condicoes: [...condPadrao] })}>Personalizar para este orçamento</button>
          </div>
        ) : (
          <>
            <TextListEditor items={d.condicoes} onChange={(v) => set({ condicoes: v })} addLabel="Adicionar condição" />
            <button type="button" className="ghost" onClick={() => set({ condicoes: null })}>Usar as condições da configuração</button>
          </>
        )}

        <label className="com-obs">Observações<textarea rows={3} value={d.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></label>

        <div className="actions com-editor-actions">
          <button type="button" className="outline" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar orçamento'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Aprovação
// ---------------------------------------------------------------------------

function AprovarModal({ p, onClose, onDone }: {
  p: Proposta; onClose: () => void; onDone: (p: Proposta, forma: FormaPagamento, gerar: boolean) => void
}) {
  const save = useSave<Partial<Proposta>>('propostas')
  const [forma, setForma] = useState<FormaPagamento>(p.forma_escolhida ?? 'avista')
  const [data, setData] = useState(todayIso())
  const [gerar, setGerar] = useState(true)
  async function ok() {
    const saved = await save.mutateAsync({ id: p.id, status: 'aprovada', forma_escolhida: forma, aprovada_em: data || todayIso() })
    onDone({ ...p, ...saved }, forma, gerar)
  }
  const v = (f: FormaPagamento) => valoresDaForma(p, f)
  return (
    <Modal title={`Aprovar ${p.numero ?? 'orçamento'}`} onClose={onClose}>
      <ErrorBox error={save.error} />
      <p style={{ marginTop: 0 }}>Qual forma de pagamento o condomínio escolheu?</p>
      <div className="com-radio">
        {(['avista', 'prazo'] as FormaPagamento[]).map((f) => (
          <label key={f} className={forma === f ? 'on' : ''}>
            <input type="radio" name="forma" checked={forma === f} onChange={() => setForma(f)} />
            <span><b>{f === 'avista' ? 'À vista' : 'A prazo'}</b> — {f === 'avista' ? fmtBRL(v(f).valor_total) : `${v(f).parcelas}× de ${fmtBRL(v(f).valor_parcela)} (${fmtBRL(v(f).valor_total)})`}</span>
          </label>
        ))}
      </div>
      <div className="form-grid two" style={{ marginTop: 14 }}>
        <label>Data da aprovação<input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
        <label className="com-check"><input type="checkbox" checked={gerar} onChange={(e) => setGerar(e.target.checked)} /> Gerar o contrato em seguida</label>
      </div>
      <div className="actions com-editor-actions">
        <button className="outline" onClick={onClose}>Cancelar</button>
        <button className="primary" disabled={save.isPending} onClick={ok}>{save.isPending ? 'Salvando…' : 'Aprovar'}</button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

interface ContDraft {
  id?: string
  numero: string | null
  proposta_id: string | null
  forma: FormaPagamento
  data_assinatura: string
  vigencia_meses: string
  colaboradores: string
  servicos: string[]
  valor_total: string
  parcelas: string
  valor_parcela: string
  parcelaAuto: boolean
  dia_vencimento: string
  status: StatusContrato
  observacoes: string
}

function contDraftFromProposta(p: Proposta, forma: FormaPagamento, cfg: ConfigEmpresa): ContDraft {
  const c = contratoFromProposta(p, forma, cfg)
  return {
    numero: null, proposta_id: p.id, forma, data_assinatura: '', vigencia_meses: String(c.vigencia_meses),
    colaboradores: String(c.colaboradores), servicos: c.servicos, valor_total: String(c.valor_total), parcelas: String(c.parcelas),
    valor_parcela: String(c.valor_parcela), parcelaAuto: true, dia_vencimento: String(c.dia_vencimento), status: 'rascunho', observacoes: '',
  }
}

function contDraftFromContrato(c: Contrato, propostas: Proposta[]): ContDraft {
  const n = parseIntMin(c.parcelas, 1, 1)
  return {
    id: c.id, numero: c.numero, proposta_id: c.proposta_id,
    forma: propostas.find((p) => p.id === c.proposta_id)?.forma_escolhida ?? (n > 1 ? 'prazo' : 'avista'),
    data_assinatura: c.data_assinatura ?? '', vigencia_meses: String(c.vigencia_meses), colaboradores: String(c.colaboradores),
    servicos: c.servicos ?? [], valor_total: String(c.valor_total), parcelas: String(n), valor_parcela: String(c.valor_parcela),
    parcelaAuto: round2(parseNum(c.valor_parcela)) === valorParcela(parseNum(c.valor_total), n),
    dia_vencimento: String(c.dia_vencimento), status: c.status, observacoes: c.observacoes ?? '',
  }
}

function ContratoEditor({ initial, condo, cfg, aprovadas, propostas, pendencias, onClose }: {
  initial: ContDraft; condo: Condominio; cfg: ConfigEmpresa; aprovadas: Proposta[]; propostas: Proposta[]; pendencias: string[]; onClose: () => void
}) {
  const save = useSave<Partial<Contrato>>('contratos')
  const [d, setD] = useState<ContDraft>(initial)
  const [error, setError] = useState<unknown>(null)
  const set = (patch: Partial<ContDraft>) => setD((x) => {
    const y = { ...x, ...patch }
    if (y.parcelaAuto && ('valor_total' in patch || 'parcelas' in patch)) {
      y.valor_parcela = String(valorParcela(parseNum(y.valor_total), parseIntMin(y.parcelas, 1, 1)))
    }
    return y
  })
  const proposta = propostas.find((p) => p.id === d.proposta_id) ?? null
  // recém-aprovado pode ainda não constar como aprovado na lista em cache
  const opcoes = d.id ? propostas : [...aprovadas, ...(proposta && !aprovadas.includes(proposta) ? [proposta] : [])]

  function reprefill(pid: string, forma: FormaPagamento) {
    const p = propostas.find((x) => x.id === pid)
    if (!p) return set({ proposta_id: pid || null })
    const n = contDraftFromProposta(p, forma, cfg)
    setD((x) => ({ ...n, id: x.id, numero: x.numero, data_assinatura: x.data_assinatura, status: x.status, observacoes: x.observacoes }))
  }
  function setForma(forma: FormaPagamento) {
    if (!proposta) return set({ forma })
    const v = valoresDaForma(proposta, forma)
    set({ forma, valor_total: String(v.valor_total), parcelas: String(v.parcelas), valor_parcela: String(v.valor_parcela), parcelaAuto: true })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const servicos = d.servicos.map((s) => s.trim()).filter(Boolean)
    if (!servicos.length) return setError('Informe pelo menos um item do objeto (serviço).')
    const row: Partial<Contrato> = {
      id: d.id,
      proposta_id: d.proposta_id,
      data_assinatura: d.data_assinatura || null,
      vigencia_meses: parseIntMin(d.vigencia_meses, cfg.vigencia_meses, 1),
      colaboradores: parseIntMin(d.colaboradores, 0, 0),
      servicos,
      valor_total: round2(parseNum(d.valor_total)),
      parcelas: parseIntMin(d.parcelas, 1, 1),
      valor_parcela: round2(parseNum(d.valor_parcela)),
      dia_vencimento: Math.min(31, parseIntMin(d.dia_vencimento, cfg.dia_vencimento, 1)),
      status: d.status,
      observacoes: d.observacoes,
    }
    // clausulas fica null: o PDF usa as cláusulas da configuração (ou o padrão) no momento da impressão
    if (!d.id) Object.assign(row, { condominio_id: condo.id, clausulas: null })
    try {
      await save.mutateAsync(row)
      onClose()
    } catch (err) {
      setError(err)
    }
  }

  const n = parseIntMin(d.parcelas, 1, 1)
  const soma = round2(n * parseNum(d.valor_parcela))
  const difere = Math.abs(soma - round2(parseNum(d.valor_total))) >= 0.01

  return (
    <Modal title={d.id ? `Editar contrato ${d.numero ?? ''}` : 'Gerar contrato'} onClose={onClose}>
      <form onSubmit={submit} className="com-editor">
        <ErrorBox error={error} />
        <Pendencias itens={pendencias} />
        <div className="form-grid two">
          <label className="span2">
            Orçamento de origem
            <select value={d.proposta_id ?? ''} onChange={(e) => reprefill(e.target.value, d.forma)}>
              <option value="">— nenhum —</option>
              {opcoes.map((p) => (
                <option key={p.id} value={p.id}>{p.numero ?? 'sem número'} · {fmtDate(p.data)} · {STATUS_PROPOSTA[p.status].label}</option>
              ))}
            </select>
            {!d.id && <span className="field-hint">Trocar o orçamento preenche de novo serviços, colaboradores e valores.</span>}
          </label>
          <div className="span2">
            <span className="com-label">Forma de pagamento</span>
            <div className="com-seg" role="group" aria-label="Forma de pagamento">
              {(['avista', 'prazo'] as FormaPagamento[]).map((f) => (
                <button key={f} type="button" className={d.forma === f ? 'on' : ''} onClick={() => setForma(f)}>
                  {f === 'avista' ? 'À vista' : 'A prazo'}
                </button>
              ))}
            </div>
          </div>
          <label>Valor total (R$)<input type="number" min={0} step="0.01" inputMode="decimal" value={d.valor_total} onChange={(e) => set({ valor_total: e.target.value })} /></label>
          <label>Parcelas<input type="number" min={1} step="1" inputMode="numeric" value={d.parcelas} onChange={(e) => set({ parcelas: e.target.value })} /></label>
          <label>
            Valor da parcela (R$)
            <input type="number" min={0} step="0.01" inputMode="decimal" value={d.valor_parcela} onChange={(e) => set({ valor_parcela: e.target.value, parcelaAuto: false })} />
            {difere && <span className="field-hint warn">{n} × {fmtBRL(parseNum(d.valor_parcela))} = {fmtBRL(soma)} (diferente do total)</span>}
          </label>
          <label>Dia de vencimento<input type="number" min={1} max={31} inputMode="numeric" value={d.dia_vencimento} onChange={(e) => set({ dia_vencimento: e.target.value })} /></label>
          <label>Vigência (meses)<input type="number" min={1} inputMode="numeric" value={d.vigencia_meses} onChange={(e) => set({ vigencia_meses: e.target.value })} /></label>
          <label>Colaboradores<input type="number" min={0} inputMode="numeric" value={d.colaboradores} onChange={(e) => set({ colaboradores: e.target.value })} /></label>
          <label>
            Data de assinatura
            <input type="date" value={d.data_assinatura} onChange={(e) => set({ data_assinatura: e.target.value })} />
            <span className="field-hint">Vazia = fica em branco para preencher à mão.</span>
          </label>
          <label>
            Situação
            <select value={d.status} onChange={(e) => set({ status: e.target.value as StatusContrato })}>
              {(Object.keys(STATUS_CONTRATO) as StatusContrato[]).map((s) => <option key={s} value={s}>{STATUS_CONTRATO[s].label}</option>)}
            </select>
          </label>
        </div>
        <h3 className="com-h3">Objeto do contrato (serviços)</h3>
        <TextListEditor items={d.servicos} onChange={(v) => set({ servicos: v })} addLabel="Adicionar serviço" />
        <p className="field-hint">As cláusulas vêm de <Link to="/configuracoes">Configurações</Link>. Marcadores como {'{{colaboradores_extenso}}'} são preenchidos no PDF.</p>
        <label className="com-obs">Observações internas<textarea rows={2} value={d.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></label>
        <div className="actions com-editor-actions">
          <button type="button" className="outline" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar contrato'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Pendencias({ itens }: { itens: string[] }) {
  if (!itens.length) return null
  return (
    <div className="com-pend">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <b>Faltam dados para o contrato</b> — sairão como “________”: {itens.join(', ')}.{' '}
        <Link to="/condominio">Cadastro do condomínio</Link> · <Link to="/configuracoes">Configurações</Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function ComercialPage() {
  const { condo } = useCondo()
  const [params, setParams] = useSearchParams()
  const cfgQ = useConfigEmpresa()
  const servQ = useServicos()
  const propQ = useChildren('propostas', condo?.id)
  const contQ = useChildren('contratos', condo?.id)
  const saveProp = useSave<Partial<Proposta>>('propostas')
  const removeProp = useRemove('propostas')
  const saveCont = useSave<Partial<Contrato>>('contratos')
  const removeCont = useRemove('contratos')
  const cfg = useMemo(() => normConfig(cfgQ.data), [cfgQ.data])
  const servicos = useMemo(() => servQ.data ?? [], [servQ.data])
  const propostas = propQ.data ?? []
  const contratos = contQ.data ?? []

  const [propEdit, setPropEdit] = useState<PropDraft | null>(null)
  const [aprovar, setAprovar] = useState<Proposta | null>(null)
  const [contEdit, setContEdit] = useState<ContDraft | null>(null)

  // ?novo=1 (vindo do cadastro ou do painel) abre direto o editor de um novo orçamento
  const ready = Boolean(condo) && !cfgQ.isLoading && !servQ.isLoading
  useEffect(() => {
    if (params.get('novo') !== '1' || !ready || !condo) return
    setPropEdit(newDraft(condo, cfg, servicos))
    setParams({}, { replace: true })
  }, [params, ready, condo, cfg, servicos, setParams])

  if (!condo) return null
  const pendencias = pendenciasContrato(condo, cfgQ.data ?? null)
  const aprovadas = propostas.filter((p) => p.status === 'aprovada')
  const contratoDe = (pid: string) => contratos.filter((c) => c.proposta_id === pid)

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn()
    } catch (e) {
      alert(errText(e))
    }
  }

  const enviar = (p: Proposta) => run(() => saveProp.mutateAsync({ id: p.id, status: 'enviada', enviada_em: p.enviada_em ?? todayIso() }))
  const recusar = (p: Proposta) => confirm(`Marcar ${p.numero ?? 'o orçamento'} como recusado?`) &&
    run(() => saveProp.mutateAsync({ id: p.id, status: 'recusada' }))
  const reabrir = (p: Proposta) => confirm('Voltar o orçamento para rascunho?') &&
    run(() => saveProp.mutateAsync({ id: p.id, status: 'rascunho', forma_escolhida: null, aprovada_em: null, enviada_em: null }))
  const excluirProp = (p: Proposta) => {
    const n = contratoDe(p.id).length
    if (!confirm(`Excluir o orçamento ${p.numero ?? ''}?` + (n ? ` ${n} contrato(s) gerado(s) a partir dele continuam, sem o vínculo.` : ''))) return
    run(() => removeProp.mutateAsync(p.id))
  }
  const duplicar = (p: Proposta) => run(async () => {
    const data = todayIso()
    const copia: Partial<Proposta> = {
      condominio_id: p.condominio_id, data, validade: addDays(data, cfg.validade_proposta_dias), colaboradores: p.colaboradores,
      itens: p.itens, desconto: p.desconto, desconto_pct: p.desconto_pct ?? 0, valor_avista: p.valor_avista,
      acrescimo_pct: p.acrescimo_pct, parcelas: p.parcelas,
      valor_prazo: p.valor_prazo, condicoes: p.condicoes, observacoes: p.observacoes, status: 'rascunho',
    }
    await saveProp.mutateAsync(copia)
  })
  const gerarContrato = (p: Proposta, forma?: FormaPagamento) =>
    setContEdit(contDraftFromProposta(p, forma ?? p.forma_escolhida ?? 'avista', cfg))

  async function mudarStatus(c: Contrato, status: StatusContrato) {
    const patch: Partial<Contrato> = { id: c.id, status }
    if (status === 'assinado' && !c.data_assinatura && confirm('Registrar hoje como data de assinatura?')) patch.data_assinatura = todayIso()
    await run(() => saveCont.mutateAsync(patch))
  }

  const propPdf = (p: Proposta) => () => buildProposta(buildPropostaDocData(p, cfgQ.data ?? null, condo, ASSETS))
  const contPdf = (c: Contrato) => () => buildContrato(buildContratoDocData(c, cfgQ.data ?? null, condo, ASSETS))

  return (
    <div className="view com-view">
      {cfgQ.error && <ErrorBox error={'Configuração comercial indisponível; usando os valores padrão. ' + MIGRACAO} />}
      <Pendencias itens={pendencias} />

      <section className="panel">
        <PanelHead eyebrow="PROPOSTA COMERCIAL" title="Orçamentos">
          <button className="primary" disabled={!ready || Boolean(propQ.error)} onClick={() => setPropEdit(newDraft(condo, cfg, servicos))}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" /> Novo orçamento
          </button>
        </PanelHead>
        {servQ.error && <ErrorBox error={'Não foi possível carregar a tabela de serviços. ' + MIGRACAO} />}
        {propQ.error ? (
          <ErrorBox error={'Não foi possível carregar os orçamentos. ' + MIGRACAO + ' (' + errText(propQ.error) + ')'} />
        ) : propQ.isLoading ? (
          <Loading />
        ) : propostas.length === 0 ? (
          <div className="empty">Nenhum orçamento para este condomínio ainda.</div>
        ) : propostas.map((p) => {
          const st = STATUS_PROPOSTA[p.status]
          const cts = contratoDe(p.id)
          return (
            <div className="entity-card" key={p.id}>
              <div className="entity-head">
                <div>
                  <div className="entity-title com-title">
                    {p.numero ?? 'Orçamento'} <span className={'badge ' + st.cls}>{st.label}</span>
                    {p.status === 'aprovada' && p.forma_escolhida && <span className="badge">{FORMA_LABEL[p.forma_escolhida]}</span>}
                  </div>
                  <div className="entity-meta">
                    {[
                      fmtDate(p.data) + (p.validade ? ` · válido até ${fmtDate(p.validade)}` : ''),
                      `À vista ${fmtBRL(parseNum(p.valor_avista))}`,
                      `A prazo ${fmtBRL(parseNum(p.valor_prazo))} (${p.parcelas}× ${fmtBRL(valorParcela(parseNum(p.valor_prazo), p.parcelas))})`,
                      `${p.colaboradores} colaboradores`,
                      p.enviada_em && `enviada em ${fmtDate(p.enviada_em)}`,
                      p.aprovada_em && p.status === 'aprovada' && `aprovada em ${fmtDate(p.aprovada_em)}`,
                      cts.length > 0 && `contrato ${cts.map((c) => c.numero ?? 'sem número').join(', ')}`,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="entity-actions">
                  <DocButtons small title={`Proposta ${p.numero ?? ''}`} build={propPdf(p)} />
                  <button className="outline" onClick={() => setPropEdit(draftFromProposta(p, cfg, servicos))}>Editar</button>
                  {p.status === 'rascunho' && <button className="outline" onClick={() => enviar(p)}>Marcar como enviada</button>}
                  {(p.status === 'rascunho' || p.status === 'enviada') && (
                    <>
                      <button className="primary" onClick={() => setAprovar(p)}>Aprovar</button>
                      <button className="outline" onClick={() => recusar(p)}>Recusar</button>
                    </>
                  )}
                  {p.status === 'aprovada' && (
                    <button className="primary" onClick={() => gerarContrato(p)}>
                      <FileSignature size={14} aria-hidden="true" /> {cts.length ? 'Novo contrato' : 'Gerar contrato'}
                    </button>
                  )}
                  {(p.status === 'aprovada' || p.status === 'recusada') && <button className="ghost" onClick={() => reabrir(p)}>Reabrir</button>}
                  <button className="ghost" onClick={() => duplicar(p)} title="Duplicar"><Copy size={14} aria-hidden="true" /> Duplicar</button>
                  <button className="danger" onClick={() => excluirProp(p)}>Excluir</button>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="panel">
        <PanelHead eyebrow="CONTRATO" title="Contratos">
          <button className="primary" disabled={!aprovadas.length} title={aprovadas.length ? undefined : 'Aprove um orçamento primeiro'}
            onClick={() => gerarContrato(aprovadas[0])}>
            <FileSignature size={16} aria-hidden="true" /> Gerar contrato
          </button>
        </PanelHead>
        {!aprovadas.length && !contratos.length && !contQ.error && (
          <div className="notice">Aprove um orçamento para gerar o contrato já preenchido com os serviços e valores.</div>
        )}
        {contQ.error ? (
          <ErrorBox error={'Não foi possível carregar os contratos. ' + MIGRACAO + ' (' + errText(contQ.error) + ')'} />
        ) : contQ.isLoading ? <Loading /> : contratos.length === 0 ? (
          <div className="empty">Nenhum contrato ainda.</div>
        ) : contratos.map((c) => {
          const st = STATUS_CONTRATO[c.status]
          const origem = propostas.find((p) => p.id === c.proposta_id)
          return (
            <div className="entity-card" key={c.id}>
              <div className="entity-head">
                <div>
                  <div className="entity-title com-title">{c.numero ?? 'Contrato'} <span className={'badge ' + st.cls}>{st.label}</span></div>
                  <div className="entity-meta">
                    {[
                      c.parcelas > 1 ? `${c.parcelas}× ${fmtBRL(parseNum(c.valor_parcela))} (${fmtBRL(parseNum(c.valor_total))})` : `${fmtBRL(parseNum(c.valor_total))} à vista`,
                      `vencimento dia ${c.dia_vencimento}`,
                      `${c.vigencia_meses} meses`,
                      c.data_assinatura ? `assinado em ${fmtDate(c.data_assinatura)}` : 'sem data de assinatura',
                      origem?.numero && `orçamento ${origem.numero}`,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="entity-actions">
                  <DocButtons small title={`Contrato ${c.numero ?? ''}`} build={contPdf(c)} />
                  <select className="com-status-select" value={c.status} aria-label="Situação do contrato"
                    onChange={(e) => mudarStatus(c, e.target.value as StatusContrato)}>
                    {(Object.keys(STATUS_CONTRATO) as StatusContrato[]).map((s) => <option key={s} value={s}>{STATUS_CONTRATO[s].label}</option>)}
                  </select>
                  <button className="outline" onClick={() => setContEdit(contDraftFromContrato(c, propostas))}>Editar</button>
                  <button className="danger" onClick={() => confirm(`Excluir o contrato ${c.numero ?? ''}?`) && run(() => removeCont.mutateAsync(c.id))}>Excluir</button>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {propEdit && <PropostaEditor initial={propEdit} condo={condo} cfg={cfg} onClose={() => setPropEdit(null)} />}
      {aprovar && (
        <AprovarModal p={aprovar} onClose={() => setAprovar(null)}
          onDone={(p, forma, gerar) => { setAprovar(null); if (gerar) gerarContrato(p, forma) }} />
      )}
      {contEdit && (
        <ContratoEditor initial={contEdit} condo={condo} cfg={cfg} aprovadas={aprovadas}
          propostas={propostas} pendencias={pendencias} onClose={() => setContEdit(null)} />
      )}
    </div>
  )
}
