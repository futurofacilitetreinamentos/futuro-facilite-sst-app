// Exportação eSocial: S-2240 (condições ambientais / agentes nocivos) e S-2220
// (monitoramento da saúde / ASO). Gera planilha para a contabilidade e XMLs no
// leiaute S-1.3, SEM assinatura digital e SEM transmissão.
import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Download, FileCode2, FileSpreadsheet, Info, XCircle } from 'lucide-react'
import { ErrorBox, Loading, PanelHead } from '../components/ui'
import { useChildren } from '../lib/db'
import { fetchBundle } from '../lib/legacy'
import type { Aso } from '../lib/types'
import { useCondo } from '../state/CondoProvider'
import { gerarS2240, IDE_OC_LABEL, TP_AVAL_LABEL, unMedLabel } from '../lib/esocial/s2240'
import type { EventoS2240 } from '../lib/esocial/s2240'
import { gerarS2220, IND_RESULT_LABEL } from '../lib/esocial/s2220'
import type { EventoS2220 } from '../lib/esocial/s2220'
import { EPI_COMPL_PERGUNTAS, EPI_COMPL_VAZIO, ONDE_LABEL, VERSAO_LEIAUTE, temErro } from '../lib/esocial/validacao'
import type { EpiCompl, EsocialDados, Onde, Problema } from '../lib/esocial/validacao'
import { abaS2220, abaS2240, csv, xlsx } from '../lib/esocial/planilha'
import { zip } from '../lib/esocial/zip'
import { fmtCpf, fmtData, hojeIso } from '../lib/esocial/util'
import '../styles/esocial.css'

type Aba = 'S-2240' | 'S-2220'

const ROTA: Record<Onde, string | null> = {
  condominio: '/condominio', trabalhadores: '/trabalhadores', funcoes: '/funcoes', setores: '/setores', ghe: '/ghe', riscos: '/riscos',
  epis: '/epis', equipe: '/equipe', asos: '/asos', esocial: null,
}

function baixar(nome: string, dados: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([dados], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const lerCompl = (condoId: string): EpiCompl => {
  try {
    const v = JSON.parse(localStorage.getItem('ff_esocial_epicompl_' + condoId) ?? 'null') as Partial<EpiCompl> | null
    return { ...EPI_COMPL_VAZIO, ...(v ?? {}) }
  } catch {
    return EPI_COMPL_VAZIO
  }
}

function Situacao({ p, xml }: { p: Problema[]; xml: string | null }) {
  if (!xml || temErro(p)) return <span className="badge bad">Pendências</span>
  if (p.length) return <span className="badge warn">Pronto, com avisos</span>
  return <span className="badge ok">Pronto</span>
}

function Problemas({ p }: { p: Problema[] }) {
  if (!p.length) return <div className="es-sem-prob"><CheckCircle2 size={14} /> Nenhum problema encontrado.</div>
  const ord = [...p].sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'erro' ? -1 : 1))
  return (
    <ul className="es-prob">
      {ord.map((x, i) => {
        const rota = ROTA[x.onde]
        return (
          <li key={i} className={x.nivel}>
            {x.nivel === 'erro' ? <XCircle size={14} /> : <AlertTriangle size={14} />}
            <span>
              {x.msg}{' '}
              {rota ? <Link to={rota}>Corrigir em {ONDE_LABEL[x.onde]}</Link> : <em>Corrija nesta página.</em>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function EsocialPage() {
  const { condo } = useCondo()
  const condoId = condo?.id
  const bundle = useQuery({
    queryKey: ['esocial-bundle', condoId],
    enabled: Boolean(condoId),
    staleTime: 0,
    queryFn: () => fetchBundle(condoId!),
  })
  const asosQ = useChildren('asos', condoId)

  const [aba, setAba] = useState<Aba>('S-2240')
  const [tpAmb, setTpAmb] = useState<'1' | '2'>('1')
  const hoje = hojeIso()
  const [de, setDe] = useState(`${hoje.slice(0, 4)}-01-01`)
  const [ate, setAte] = useState(hoje)
  const [aberto, setAberto] = useState<string | null>(null)
  const [gerado, setGerado] = useState(() => new Date())
  // escolhas por condomínio (trocar de condomínio volta aos valores dele)
  const [datas, setDatas] = useState<Record<string, string>>({})
  const [compls, setCompls] = useState<Record<string, EpiCompl>>({})
  const dataBase = (condoId && datas[condoId]) ?? (condo?.data_elaboracao?.slice(0, 10) || hoje)
  const complSalvo = useMemo(() => (condoId ? lerCompl(condoId) : EPI_COMPL_VAZIO), [condoId])
  const compl = (condoId && compls[condoId]) || complSalvo

  const setDataBase = (v: string) => { if (condoId) setDatas((d) => ({ ...d, [condoId]: v })) }
  function salvarCompl(novo: EpiCompl) {
    if (!condoId) return
    setCompls((c) => ({ ...c, [condoId]: novo }))
    try { localStorage.setItem('ff_esocial_epicompl_' + condoId, JSON.stringify(novo)) } catch { /* sem armazenamento local */ }
  }
  const mudarCompl = (k: keyof EpiCompl, v: boolean | null) => salvarCompl({ ...compl, [k]: v })
  const todosSim = () => salvarCompl(Object.fromEntries(Object.keys(EPI_COMPL_VAZIO).map((k) => [k, true])) as unknown as EpiCompl)

  const { ev40, ev20 } = useMemo(() => {
    if (!bundle.data) return { ev40: [] as EventoS2240[], ev20: [] as EventoS2220[] }
    const dados: EsocialDados = { ...bundle.data, asos: (asosQ.data ?? []) as Aso[] }
    const seq = { n: 0 }
    const base = { tpAmb, gerado, hoje }
    return {
      ev40: gerarS2240(dados, { ...base, dataBase, epiCompl: compl, seq }),
      ev20: gerarS2220(dados, { ...base, seq }, de, ate),
    }
  }, [bundle.data, asosQ.data, tpAmb, gerado, hoje, dataBase, compl, de, ate])

  if (!condo) return <div className="view"><div className="empty">Selecione um condomínio.</div></div>
  if (bundle.isLoading) return <div className="view"><Loading /></div>

  const eventos = aba === 'S-2240' ? ev40 : ev20
  const validos = eventos.filter((e) => e.xml)
  const usaEpi = ev40.some((e) => e.agentes.some((a) => a.utilizEPI === '2'))
  const semTrab = (bundle.data?.trabalhadores ?? []).length === 0
  const slug = (condo.nome_fantasia || condo.razao_social || 'condominio').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

  function baixarCsv() {
    const a = aba === 'S-2240' ? abaS2240(ev40) : abaS2220(ev20)
    baixar(`esocial-${aba}-${slug}.csv`, csv(a), 'text/csv;charset=utf-8')
  }
  function baixarExcel() {
    const bytes = xlsx([abaS2240(ev40), abaS2220(ev20)])
    baixar(`esocial-${slug}.xlsx`, bytes.slice().buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }
  function baixarZip() {
    const bytes = zip(validos.map((e) => ({ name: e.arquivo, data: e.xml! })))
    baixar(`esocial-${aba}-${slug}-${hoje}.zip`, bytes.slice().buffer, 'application/zip')
  }

  return (
    <div className="view es">
      <section className="panel">
        <PanelHead eyebrow="ESOCIAL" title="Exportar eventos de SST (S-2240 e S-2220)">
          <label className="es-inline">
            Ambiente
            <select value={tpAmb} onChange={(e) => setTpAmb(e.target.value as '1' | '2')}>
              <option value="1">1 — Produção</option>
              <option value="2">2 — Produção restrita (testes)</option>
            </select>
          </label>
        </PanelHead>
        <div className="notice es-aviso">
          <Info size={16} />
          <div>
            <b>Os arquivos XML não são assinados nem transmitidos.</b> Importe-os no software do eSocial ou da contabilidade, que assina com o
            certificado digital do condomínio e faz a transmissão. Confira os dados antes de transmitir. Leiaute {VERSAO_LEIAUTE}.
            O empregador deve ter enviado antes o S-1000/S-1005 e o S-2200 de cada trabalhador (mesma matrícula).
          </div>
        </div>
        <ErrorBox error={bundle.error} />
        {asosQ.error && <div className="editing-banner">Não foi possível ler os ASOs (a migração 0005 foi aplicada no banco?). O S-2220 fica vazio.</div>}
        {semTrab && <div className="editing-banner">Nenhum trabalhador cadastrado. Cadastre em <Link to="/trabalhadores">Trabalhadores</Link> para gerar os eventos.</div>}

        <div className="es-tabs" role="tablist">
          {(['S-2240', 'S-2220'] as Aba[]).map((t) => {
            const evs = t === 'S-2240' ? ev40 : ev20
            const ok = evs.filter((e) => e.xml).length
            return (
              <button key={t} role="tab" aria-selected={aba === t} className={aba === t ? 'on' : ''} onClick={() => { setAba(t); setAberto(null) }}>
                <b>{t}</b> {t === 'S-2240' ? 'Agentes nocivos' : 'ASO / monitoramento'}
                <span className="es-count">{ok}/{evs.length}</span>
              </button>
            )
          })}
        </div>

        {aba === 'S-2240' ? (
          <div className="es-filtros">
            <label>
              Data de referência (LTCAT/PGR)
              <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} />
              <span className="field-hint">Início da condição = a mais recente entre esta data e a admissão.</span>
            </label>
            <div className="es-resumo-txt">
              Um evento por trabalhador ativo na data de referência. Agentes: riscos físicos, químicos e biológicos do GHE/função com código da
              Tabela 24; sem agente, vai o código 09.01.001. Responsável pelos registros ambientais: quem assina o LTCAT.
            </div>
          </div>
        ) : (
          <div className="es-filtros">
            <label>De<input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
            <label>Até<input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
            <div className="es-resumo-txt">Um evento por ASO com data no período. Responsável pelo monitoramento: o médico coordenador do PCMSO.</div>
          </div>
        )}

        <div className="es-acoes">
          <button className="outline" onClick={baixarCsv} disabled={!eventos.length}><FileSpreadsheet size={15} /> Baixar planilha (CSV)</button>
          <button className="outline" onClick={baixarExcel} disabled={!ev40.length && !ev20.length}><FileSpreadsheet size={15} /> Baixar planilha (Excel)</button>
          <button className="primary" onClick={baixarZip} disabled={!validos.length}><Download size={15} /> Baixar XMLs (.zip) — {validos.length}</button>
          <button className="ghost" onClick={() => setGerado(new Date())} title="Gera novos Ids de evento (data/hora atual)">Gerar novos Ids</button>
        </div>
        {eventos.length > validos.length && (
          <div className="field-hint warn">{eventos.length - validos.length} evento(s) com pendências não entram no .zip. Veja o painel de validação abaixo.</div>
        )}
      </section>

      {aba === 'S-2240' && usaEpi && (
        <section className="panel">
          <PanelHead eyebrow="S-2240 · EPCEPI" title="Requisitos de EPI (NR-06 e NR-09)">
            <button className="ghost" onClick={todosSim}>Marcar todos como Sim</button>
          </PanelHead>
          <p className="es-resumo-txt">
            Obrigatórios quando o trabalhador usa EPI (grupo epiCompl). Valem para todos os eventos deste condomínio; responda conforme a gestão
            real dos EPIs.
          </p>
          <div className="es-compl">
            {EPI_COMPL_PERGUNTAS.map((q) => (
              <div key={q.key} className="es-compl-item">
                <span>{q.label}</span>
                <div className="es-sn">
                  {([true, false] as const).map((v) => (
                    <label key={String(v)} className={compl[q.key] === v ? 'on' : ''}>
                      <input type="radio" name={'c-' + q.key} checked={compl[q.key] === v} onChange={() => mudarCompl(q.key, v)} />
                      {v ? 'Sim' : 'Não'}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <PanelHead eyebrow={aba} title={aba === 'S-2240' ? 'Prévia por trabalhador' : 'Prévia por ASO'} />
        {!eventos.length ? (
          <div className="empty">{aba === 'S-2240' ? 'Nenhum trabalhador ativo na data de referência.' : 'Nenhum ASO no período.'}</div>
        ) : (
          <div className="es-table-wrap">
            <table className="table es-table">
              <thead>
                {aba === 'S-2240' ? (
                  <tr><th /><th>Trabalhador</th><th>Função / setor</th><th>Início</th><th>Agentes (Tabela 24)</th><th>Situação</th><th /></tr>
                ) : (
                  <tr><th /><th>Trabalhador</th><th>ASO</th><th>Exames (Tabela 27)</th><th>Médico</th><th>Situação</th><th /></tr>
                )}
              </thead>
              <tbody>
                {aba === 'S-2240'
                  ? ev40.map((e) => (
                    <Fragment key={e.chave}>
                      <tr className={aberto === e.chave ? 'es-open' : ''}>
                        <td><button className="ghost es-exp" onClick={() => setAberto(aberto === e.chave ? null : e.chave)} aria-label="Detalhes">{aberto === e.chave ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button></td>
                        <td><b>{e.trabalhador.nome}</b><div className="es-sub">{fmtCpf(e.trabalhador.cpf) || 'sem CPF'} · mat. {e.trabalhador.matricula || '—'}</div></td>
                        <td>{e.funcao?.nome ?? '—'}<div className="es-sub">{e.setor || 'sem setor'}{e.ghes.length ? ' · ' + e.ghes.join(', ') : ''}</div></td>
                        <td>{fmtData(e.dtIniCondicao) || '—'}</td>
                        <td>
                          <div className="es-chips">
                            {e.agentes.map((a) => (
                              <span key={a.codAgNoc + a.dscAgNoc} className={'es-chip' + (a.codAgNoc === '09.01.001' ? ' none' : '')} title={a.descricaoTabela}>
                                {a.codAgNoc}{a.tpAval === '1' ? ` · ${a.intConc.replace('.', ',')} ${unMedLabel(a.unMed)}` : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td><Situacao p={e.problemas} xml={e.xml} /></td>
                        <td>{e.xml && <button className="outline small" onClick={() => baixar(e.arquivo, e.xml!, 'application/xml')}><FileCode2 size={14} /> XML</button>}</td>
                      </tr>
                      {aberto === e.chave && (
                        <tr className="es-det"><td /><td colSpan={6}>
                          <Problemas p={e.problemas} />
                          <div className="es-det-grid">
                            <div><span>Atividades</span>{e.atividades || '—'}</div>
                            <div><span>Responsável (LTCAT)</span>{e.resp ? `${e.resp.nome} · CPF ${fmtCpf(e.resp.cpf) || '—'} · ${IDE_OC_LABEL[e.resp.ideOC] || e.resp.dscOC} ${e.resp.nrOC || '—'}/${e.resp.ufOC || '—'}` : '—'}</div>
                          </div>
                          <table className="table es-mini">
                            <thead><tr><th>Código</th><th>Agente</th><th>Avaliação</th><th>Medição</th><th>EPC</th><th>EPI (CA)</th></tr></thead>
                            <tbody>
                              {e.agentes.map((a) => (
                                <tr key={a.codAgNoc + a.dscAgNoc}>
                                  <td>{a.codAgNoc}</td>
                                  <td>{a.dscAgNoc || a.descricaoTabela}{a.origem.length ? <div className="es-sub">{a.origem.join('; ')}</div> : null}</td>
                                  <td>{TP_AVAL_LABEL[a.tpAval] || '—'}</td>
                                  <td>{a.tpAval === '1' ? `${a.intConc.replace('.', ',')} ${unMedLabel(a.unMed)}${a.limTol ? ` (LT ${a.limTol.replace('.', ',')})` : ''} · ${a.tecMedicao}` : '—'}</td>
                                  <td>{a.utilizEPC === '2' ? `Sim, eficaz: ${a.eficEpc || '?'}` : a.utilizEPC === '1' ? 'Não' : '—'}</td>
                                  <td>{a.utilizEPI === '2' ? `Sim, eficaz: ${a.eficEpi || '?'}${a.cas.length ? ` · CA ${a.cas.join(', ')}` : ''}` : a.utilizEPI === '1' ? 'Não' : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {e.xml && <details className="es-xml"><summary>Ver XML</summary><pre className="code">{e.xml}</pre></details>}
                        </td></tr>
                      )}
                    </Fragment>
                  ))
                  : ev20.map((e) => (
                    <Fragment key={e.chave}>
                      <tr className={aberto === e.chave ? 'es-open' : ''}>
                        <td><button className="ghost es-exp" onClick={() => setAberto(aberto === e.chave ? null : e.chave)} aria-label="Detalhes">{aberto === e.chave ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button></td>
                        <td><b>{e.trabalhador.nome}</b><div className="es-sub">{fmtCpf(e.trabalhador.cpf) || 'sem CPF'} · mat. {e.trabalhador.matricula || '—'}</div></td>
                        <td>{fmtData(e.dtAso)} · {e.tipoLabel}<div className="es-sub">{e.resAso === '2' ? 'Inapto' : 'Apto'} · tpExameOcup {e.tpExameOcup}</div></td>
                        <td><div className="es-chips">{e.exames.map((x, i) => <span key={i} className="es-chip" title={x.nome}>{x.procRealizado}</span>)}</div></td>
                        <td>{e.medico.nome || '—'}<div className="es-sub">CRM {e.medico.crm || '—'}/{e.medico.uf || '—'}</div></td>
                        <td><Situacao p={e.problemas} xml={e.xml} /></td>
                        <td>{e.xml && <button className="outline small" onClick={() => baixar(e.arquivo, e.xml!, 'application/xml')}><FileCode2 size={14} /> XML</button>}</td>
                      </tr>
                      {aberto === e.chave && (
                        <tr className="es-det"><td /><td colSpan={6}>
                          <Problemas p={e.problemas} />
                          <div className="es-det-grid">
                            <div><span>Coordenador do PCMSO (respMonit)</span>{e.resp ? `${e.resp.nome} · CRM ${e.resp.crm}/${e.resp.uf}${e.resp.cpf ? ' · CPF ' + fmtCpf(e.resp.cpf) : ''}` : 'não enviado'}</div>
                          </div>
                          <table className="table es-mini">
                            <thead><tr><th>Data</th><th>Código</th><th>Exame</th><th>Ordem</th><th>Resultado</th></tr></thead>
                            <tbody>
                              {e.exames.map((x, i) => (
                                <tr key={i}>
                                  <td>{fmtData(x.dtExm)}</td><td>{x.procRealizado}</td><td>{x.nome || '—'}</td>
                                  <td>{x.ordExame === '1' ? 'Inicial' : x.ordExame === '2' ? 'Sequencial' : '—'}</td><td>{IND_RESULT_LABEL[x.indResult] || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {e.xml && <details className="es-xml"><summary>Ver XML</summary><pre className="code">{e.xml}</pre></details>}
                        </td></tr>
                      )}
                    </Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <PanelHead eyebrow="VALIDAÇÃO" title={`Pendências — ${aba}`} />
        {(() => {
          const comProb = eventos.filter((e) => e.problemas.length)
          if (!comProb.length) return <div className="es-sem-prob"><CheckCircle2 size={14} /> Nenhuma pendência. Todos os eventos podem ser exportados.</div>
          return comProb.map((e) => (
            <div key={e.chave} className="es-val">
              <div className="es-val-head">
                <b>{e.trabalhador.nome}</b>
                {e.tipo === 'S-2220' && <span className="es-sub">ASO {fmtData((e as EventoS2220).dtAso)} · {(e as EventoS2220).tipoLabel}</span>}
                <Situacao p={e.problemas} xml={e.xml} />
              </div>
              <Problemas p={e.problemas} />
            </div>
          ))
        })()}
      </section>
    </div>
  )
}
