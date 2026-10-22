import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, FileSpreadsheet, Search, Upload } from 'lucide-react'
import { CrudSection } from '../components/CrudSection'
import { ErrorBox, Field, Modal, fmtDate, type FieldDef } from '../components/ui'
import { cpfError, formatCpf, onlyDigits } from '../lib/cpf'
import { useChildren, useRemove, useSave } from '../lib/db'
import {
  CATEGORIAS_ESOCIAL, analisarPlanilha, baixarArquivo, categoriaLabel, chaveFuncao, csvModelo, csvTrabalhadores,
  decodeBytes, lerPlanilha, normalizeKey, registroParaGravar, type LinhaAnalisada,
} from '../lib/planilha'
import { must, supabase } from '../lib/supabase'
import type { Funcao, Trabalhador } from '../lib/types'
import { useCondo } from '../state/CondoProvider'
import '../styles/trabalhadores.css'

type Form = Omit<Trabalhador, 'id'> & { id?: string }
type Filtro = 'ativos' | 'desligados' | 'todos'

const SEXOS = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]
const desligado = (t: Pick<Trabalhador, 'data_demissao'>) => Boolean(t.data_demissao)
const slug = (s: string) => normalizeKey(s).replace(/ /g, '-').slice(0, 40) || 'condominio'

export default function TrabalhadoresPage() {
  const { condo } = useCondo()
  const { data: trabalhadores = [], error: listErr, isLoading } = useChildren('trabalhadores', condo?.id)
  const { data: funcoes = [] } = useChildren('funcoes', condo?.id)
  const save = useSave<Form>('trabalhadores')
  const remove = useRemove('trabalhadores')
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const [busca, setBusca] = useState('')
  const [soPendentes, setSoPendentes] = useState(false)
  const [importando, setImportando] = useState(false)

  const nomeFuncao = useMemo(() => new Map(funcoes.map((f) => [f.id, f.nome])), [funcoes])
  const funcaoDe = (t: Pick<Trabalhador, 'funcao_id'>) => (t.funcao_id && nomeFuncao.get(t.funcao_id)) || ''

  const contagem = useMemo(() => {
    const ativos = trabalhadores.filter((t) => !desligado(t))
    return {
      ativos: ativos.length,
      desligados: trabalhadores.length - ativos.length,
      semFuncao: ativos.filter((t) => !t.funcao_id || !nomeFuncao.has(t.funcao_id)).length,
      semCpf: ativos.filter((t) => !t.cpf).length,
    }
  }, [trabalhadores, nomeFuncao])

  const linhas = useMemo(() => {
    const q = normalizeKey(busca)
    const qDig = onlyDigits(busca)
    return trabalhadores
      .filter((t) => (filtro === 'todos' ? true : filtro === 'ativos' ? !desligado(t) : desligado(t)))
      .filter((t) => !soPendentes || !t.cpf || !t.funcao_id || !nomeFuncao.has(t.funcao_id))
      .filter((t) => {
        if (!q) return true
        if (normalizeKey(t.nome).includes(q) || normalizeKey(t.matricula).includes(q)) return true
        if (normalizeKey((t.funcao_id && nomeFuncao.get(t.funcao_id)) || '').includes(q)) return true
        return qDig.length >= 3 && t.cpf.includes(qDig)
      })
  }, [trabalhadores, filtro, busca, soPendentes, nomeFuncao])

  if (!condo) return null

  const funcaoOpts = funcoes.map((f) => ({ value: f.id, label: f.nome }))
  const campos: FieldDef<Form>[] = [
    { key: 'matricula', label: 'Matrícula' },
    { key: 'funcao_id', label: 'Função', type: 'select', options: funcaoOpts, emptyLabel: '— sem função —' },
    { key: 'categoria', label: 'Categoria eSocial', type: 'select', options: CATEGORIAS_ESOCIAL, emptyLabel: '— não informada —' },
    { key: 'sexo', label: 'Sexo', type: 'select', options: SEXOS, emptyLabel: '— não informado —' },
    { key: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
    { key: 'data_admissao', label: 'Data de admissão', type: 'date' },
    { key: 'data_demissao', label: 'Data de desligamento', type: 'date' },
    { key: 'observacoes', label: 'Observações', type: 'textarea', span: true },
  ]

  async function salvar(r: Form) {
    const cpf = onlyDigits(r.cpf)
    const erro = cpfError(cpf)
    if (erro) throw new Error(erro)
    if (cpf) {
      const outro = trabalhadores.find((t) => t.cpf === cpf && t.id !== r.id)
      if (outro) throw new Error(`Já existe um trabalhador com este CPF neste condomínio: ${outro.nome}.`)
    }
    if (r.data_admissao && r.data_demissao && r.data_demissao < r.data_admissao) {
      throw new Error('A data de desligamento é anterior à admissão.')
    }
    await save.mutateAsync({
      ...r,
      nome: r.nome.replace(/\s+/g, ' ').trim(),
      cpf,
      matricula: r.matricula.trim(),
      funcao_id: r.funcao_id || null,
      categoria: r.categoria || '101',
      data_nascimento: r.data_nascimento || null,
      data_admissao: r.data_admissao || null,
      data_demissao: r.data_demissao || null,
    })
  }

  const exportar = () => {
    const lista = filtro === 'todos' ? trabalhadores : trabalhadores.filter((t) => (filtro === 'ativos' ? !desligado(t) : desligado(t)))
    baixarArquivo(`trabalhadores-${slug(condo.nome_fantasia || condo.razao_social)}.csv`, csvTrabalhadores(lista, funcoes))
  }

  const filtros: { v: Filtro; label: string; n: number }[] = [
    { v: 'ativos', label: 'Ativos', n: contagem.ativos },
    { v: 'desligados', label: 'Desligados', n: contagem.desligados },
    { v: 'todos', label: 'Todos', n: trabalhadores.length },
  ]

  return (
    <div className="view trab-view">
      <CrudSection<Form>
        eyebrow="Trabalhadores" title={`Trabalhadores do condomínio${trabalhadores.length ? ` (${linhas.length})` : ''}`}
        singular="Trabalhador" rows={linhas} fields={[]}
        notice={
          <>
            {listErr && <ErrorBox error={'Não foi possível carregar os trabalhadores (a migração 0005 já foi aplicada no banco?)'} />}
            <div className="trab-metrics">
              <article><b>{contagem.ativos}</b><span>ativos</span></article>
              <article><b>{contagem.desligados}</b><span>desligados</span></article>
              <article className={contagem.semFuncao ? 'warn' : undefined}><b>{contagem.semFuncao}</b><span>ativos sem função</span></article>
              <article className={contagem.semCpf ? 'warn' : undefined}><b>{contagem.semCpf}</b><span>ativos sem CPF</span></article>
            </div>
            <div className="trab-toolbar">
              <div className="trab-seg" role="group" aria-label="Situação">
                {filtros.map((f) => (
                  <button key={f.v} type="button" className={filtro === f.v ? 'on' : undefined} aria-pressed={filtro === f.v} onClick={() => setFiltro(f.v)}>
                    {f.label} <small>{f.n}</small>
                  </button>
                ))}
              </div>
              <label className="trab-search">
                <Search size={15} aria-hidden="true" />
                <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, CPF, matrícula ou função" aria-label="Buscar trabalhador" />
              </label>
              <label className="trab-check">
                <input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} /> Só com pendência
              </label>
              <div className="trab-tools">
                <button type="button" className="outline" onClick={() => setImportando(true)}>
                  <Upload size={15} aria-hidden="true" /> Importar planilha
                </button>
                <button type="button" className="outline" onClick={exportar} disabled={!trabalhadores.length}>
                  <Download size={15} aria-hidden="true" /> Exportar CSV
                </button>
              </div>
            </div>
            {funcoes.length === 0 && (
              <div className="notice">
                Cadastre as funções do condomínio (Cadastro técnico → Funções) para vincular os trabalhadores: a função liga o
                trabalhador ao GHE e aos riscos que vão para o S-2240. Na importação da planilha as funções que faltam podem ser criadas.
              </div>
            )}
            {isLoading && <div className="field-hint">Carregando…</div>}
            {!isLoading && trabalhadores.length > 0 && linhas.length === 0 && <div className="field-hint trab-nada">Nenhum trabalhador com esse filtro.</div>}
          </>
        }
        blank={() => ({
          condominio_id: condo.id, funcao_id: null, nome: '', cpf: '', matricula: '', categoria: '101', sexo: '',
          data_nascimento: null, data_admissao: null, data_demissao: null, observacoes: '',
        })}
        render={(t) => {
          const funcao = funcaoDe(t)
          return {
            title: (
              <span className="trab-title">
                {t.nome}
                {desligado(t) && <span className="badge">desligado em {fmtDate(t.data_demissao)}</span>}
                {!funcao && <span className="badge warn" title="Sem função o trabalhador não entra no GHE, nos riscos nem no S-2240"><AlertTriangle size={12} aria-hidden="true" /> sem função</span>}
                {!t.cpf && <span className="badge warn" title="O CPF é obrigatório nos eventos do eSocial"><AlertTriangle size={12} aria-hidden="true" /> sem CPF</span>}
              </span>
            ),
            meta: (
              <>
                {funcao && <b className="trab-funcao">{funcao}</b>}
                {[
                  !funcao && 'Sem função',
                  t.cpf && `CPF ${formatCpf(t.cpf)}`,
                  t.matricula && `Matr. ${t.matricula}`,
                  t.categoria && t.categoria !== '101' && `Cat. ${t.categoria}`,
                  t.data_admissao && `Admissão ${fmtDate(t.data_admissao)}`,
                ].filter(Boolean).map((x, i) => <span key={i}>{funcao || i ? ' · ' : ''}{x}</span>)}
              </>
            ),
          }
        }}
        extraForm={(row, set) => {
          const erro = cpfError(row.cpf)
          return (
            <>
              <Field<Form> def={{ key: 'nome', label: 'Nome completo *', required: true, span: true }} value={row.nome} onChange={(v) => set({ nome: v })} />
              <label>
                CPF
                <input
                  value={formatCpf(row.cpf)} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} autoComplete="off"
                  aria-invalid={Boolean(erro)} className={erro ? 'invalid' : undefined}
                  onChange={(e) => set({ cpf: onlyDigits(e.target.value).slice(0, 11) })}
                />
                {erro ? <span className="field-hint bad">{erro}</span> : !row.cpf && <span className="field-hint">Necessário para o eSocial.</span>}
              </label>
              {campos.map((f) => (
                <Field<Form> key={f.key} def={f} value={row[f.key]} onChange={(v) => set({ [f.key]: v } as Partial<Form>)} />
              ))}
              {row.categoria && !CATEGORIAS_ESOCIAL.some((c) => c.value === row.categoria) && (
                <span className="field-hint warn span2">Categoria {row.categoria} fora da lista comum.</span>
              )}
            </>
          )
        }}
        onSave={salvar}
        onRemove={(id) => remove.mutateAsync(id)}
      />

      {importando && (
        <ImportarModal condoId={condo.id} trabalhadores={trabalhadores} funcoes={funcoes} onClose={() => setImportando(false)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Importação de planilha
// ---------------------------------------------------------------------------

const ACAO: Record<LinhaAnalisada['acao'], { label: string; cls: string }> = {
  novo: { label: 'Novo', cls: 'ok' },
  atualizar: { label: 'Atualizar', cls: '' },
  erro: { label: 'Ignorar', cls: 'bad' },
}

function ImportarModal({
  condoId, trabalhadores, funcoes, onClose,
}: { condoId: string; trabalhadores: Trabalhador[]; funcoes: Funcao[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState('')
  const [criarFuncoes, setCriarFuncoes] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [resultado, setResultado] = useState('')

  const planilha = useMemo(() => (texto.trim() ? lerPlanilha(texto) : null), [texto])
  const analise = useMemo(
    () => (planilha ? analisarPlanilha(planilha, trabalhadores, funcoes) : null),
    [planilha, trabalhadores, funcoes],
  )
  const n = useMemo(() => {
    const l = analise?.linhas ?? []
    return { novo: l.filter((x) => x.acao === 'novo').length, atualizar: l.filter((x) => x.acao === 'atualizar').length, erro: l.filter((x) => x.acao === 'erro').length }
  }, [analise])

  async function lerArquivo(f: File | undefined) {
    if (!f) return
    setError(null); setResultado('')
    try {
      setTexto(decodeBytes(await f.arrayBuffer()))
      setArquivo(f.name)
    } catch (e) {
      setError('Não foi possível ler o arquivo: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function importar() {
    if (!analise) return
    setBusy(true); setError(null); setResultado('')
    try {
      // 1) funções que faltam
      const criadas = new Map<string, string>()
      if (criarFuncoes && analise.funcoesFaltando.length) {
        const novas = must(await supabase.from('funcoes')
          .insert(analise.funcoesFaltando.map((nome) => ({ condominio_id: condoId, nome, quantidade: 0 })))
          .select('id, nome')) as { id: string; nome: string }[]
        for (const f of novas) criadas.set(chaveFuncao(f.nome), f.id)
      }
      const funcaoCriada = (l: LinhaAnalisada) => (l.funcaoTexto && criadas.get(chaveFuncao(l.funcaoTexto))) || null

      // 2) novos, em lotes
      const novos = analise.linhas.filter((l) => l.acao === 'novo').map((l) => registroParaGravar(l, condoId, funcaoCriada(l)))
      for (let i = 0; i < novos.length; i += 200) {
        must(await supabase.from('trabalhadores').insert(novos.slice(i, i + 200)))
      }

      // 3) atualizações pelo id do trabalhador já cadastrado (encontrado pelo CPF)
      const upd = analise.linhas.filter((l) => l.acao === 'atualizar' && l.existenteId)
      for (let i = 0; i < upd.length; i += 10) {
        await Promise.all(upd.slice(i, i + 10).map(async (l) => {
          must(await supabase.from('trabalhadores').update(registroParaGravar(l, condoId, funcaoCriada(l))).eq('id', l.existenteId!))
        }))
      }

      setResultado(
        `${novos.length} trabalhador(es) criado(s), ${upd.length} atualizado(s)` +
        (criadas.size ? `, ${criadas.size} função(ões) criada(s)` : '') +
        (n.erro ? `. ${n.erro} linha(s) com erro não foram importadas.` : '.'),
      )
      setTexto(''); setArquivo('')
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['trabalhadores'] }),
        qc.invalidateQueries({ queryKey: ['funcoes'] }),
      ])
    }
  }

  const reconhecidas = planilha ? planilha.cabecalho.filter((_, j) => planilha.mapa[j]) : []
  const total = n.novo + n.atualizar

  return (
    <Modal
      title="Importar trabalhadores" onClose={onClose} wide
      actions={
        <button type="button" className="outline" onClick={() => baixarArquivo('modelo-trabalhadores.csv', csvModelo())}>
          <FileSpreadsheet size={15} aria-hidden="true" /> Baixar modelo
        </button>
      }
    >
      <div className="trab-import">
        <div className="notice">
          Copie as linhas da planilha (Excel ou Google Planilhas) <b>com a linha do cabeçalho</b> e cole abaixo, ou escolha um arquivo
          .csv. Colunas reconhecidas: Nome, CPF, Matrícula, Função (ou Cargo), Categoria eSocial, Sexo, Data de nascimento, Data de
          admissão, Data de desligamento e Observações. Datas em dd/mm/aaaa. Quem já está cadastrado com o mesmo CPF é
          <b> atualizado</b> (só os campos preenchidos na planilha); os demais são criados.
        </div>
        <ErrorBox error={error} />
        {resultado && <div className="ok-box">{resultado}</div>}

        <div className="trab-import-input">
          <label>
            Colar da planilha
            <textarea
              value={texto} rows={6} spellCheck={false} placeholder={'Nome\tCPF\tFunção\tData de admissão\nMaria da Silva\t…'}
              onChange={(e) => { setTexto(e.target.value); setArquivo(''); setResultado('') }}
            />
          </label>
          <div className="photo-buttons">
            <label className="photo-btn">
              <Upload size={15} strokeWidth={1.75} aria-hidden="true" /> Escolher arquivo .csv
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={(e) => { void lerArquivo(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            {arquivo && <span className="field-hint">{arquivo}</span>}
            {texto && <button type="button" className="ghost" onClick={() => { setTexto(''); setArquivo('') }}>Limpar</button>}
          </div>
        </div>

        {planilha && analise && (
          <>
            {analise.faltaColunaNome ? (
              <div className="error-box">
                Não encontrei a coluna <b>Nome</b> no cabeçalho. A primeira linha precisa ter os nomes das colunas (baixe o modelo).
              </div>
            ) : (
              <div className="field-hint">
                {planilha.linhas.length} linha(s) · separador {planilha.delimitador === '\t' ? 'tabulação' : `"${planilha.delimitador}"`} ·
                colunas: {reconhecidas.join(', ')}
                {planilha.ignoradas.length > 0 && <> · <span className="warn">ignoradas: {planilha.ignoradas.join(', ')}</span></>}
              </div>
            )}

            {analise.funcoesFaltando.length > 0 && (
              <div className="trab-faltando">
                <b>{analise.funcoesFaltando.length} função(ões) da planilha não estão cadastradas:</b>{' '}
                {analise.funcoesFaltando.join(', ')}
                <div className="trab-radio">
                  <label><input type="radio" checked={criarFuncoes} onChange={() => setCriarFuncoes(true)} /> Criar essas funções (depois complete setor, CBO e atividades)</label>
                  <label><input type="radio" checked={!criarFuncoes} onChange={() => setCriarFuncoes(false)} /> Importar esses trabalhadores sem função</label>
                </div>
              </div>
            )}

            {!analise.faltaColunaNome && analise.linhas.length > 0 && (
              <>
                <div className="summary-mini trab-resumo">
                  <span className="ok">{n.novo} novo(s)</span>
                  <span>{n.atualizar} atualização(ões)</span>
                  {n.erro > 0 && <span className="bad">{n.erro} com erro (ignorada)</span>}
                </div>
                <div className="trab-table-wrap">
                  <table className="table trab-table">
                    <thead>
                      <tr><th>Linha</th><th>Ação</th><th>Nome</th><th>CPF</th><th>Função</th><th>Observação</th></tr>
                    </thead>
                    <tbody>
                      {analise.linhas.map((l) => (
                        <tr key={l.linha} className={l.acao === 'erro' ? 'erro' : undefined}>
                          <td data-label="Linha">{l.linha}</td>
                          <td data-label="Ação"><span className={'badge ' + ACAO[l.acao].cls}>{ACAO[l.acao].label}</span></td>
                          <td data-label="Nome">{l.nome || '—'}</td>
                          <td data-label="CPF">{l.cpf ? formatCpf(l.cpf) : '—'}</td>
                          <td data-label="Função">
                            {l.funcaoTexto ? (
                              <>
                                {l.funcaoTexto}
                                {!l.funcaoId && l.acao !== 'erro' && (
                                  <span className={'badge ' + (criarFuncoes ? 'ok' : 'warn')}>{criarFuncoes ? 'nova' : 'fica sem função'}</span>
                                )}
                              </>
                            ) : '—'}
                          </td>
                          <td data-label="Observação" className="trab-obs">
                            {l.erros.map((m) => <div key={m} className="bad">{m}</div>)}
                            {l.avisos.map((m) => <div key={m} className="warn">{m}</div>)}
                            {l.campos.categoria && l.campos.categoria !== '101' && <div>{categoriaLabel(l.campos.categoria)}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <div className="actions" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button type="button" className="outline" onClick={onClose}>Fechar</button>
          <button type="button" className="primary" disabled={busy || !analise || analise.faltaColunaNome || total === 0} onClick={importar}>
            {busy ? 'Importando…' : total ? `Importar ${total} trabalhador(es)` : 'Importar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
