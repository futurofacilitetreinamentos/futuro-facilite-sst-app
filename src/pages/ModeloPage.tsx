import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, ShieldCheck, TriangleAlert, Users } from 'lucide-react'
import { ErrorBox, PanelHead } from '../components/ui'
import { aplicarModelo, type ResultadoModelo } from '../lib/aplicar-modelo'
import { BIBLIOTECA } from '../lib/biblioteca'
import { useChildren } from '../lib/db'
import { useCondo } from '../state/CondoProvider'

interface Linha { marcada: boolean; quantidade: string; cargaHoraria: string }

/** Monta o cadastro técnico do condomínio a partir da biblioteca padrão. */
export default function ModeloPage() {
  const { condo } = useCondo()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data: funcoesAtuais = [] } = useChildren('funcoes', condo?.id)
  const jaTem = (nome: string) => funcoesAtuais.some((f) => f.nome.trim().toLowerCase() === nome.trim().toLowerCase())

  const [linhas, setLinhas] = useState<Record<string, Linha>>(() =>
    Object.fromEntries(BIBLIOTECA.funcoes.map((f) => [f.id, { marcada: !!f.comum, quantidade: '1', cargaHoraria: f.cargaHoraria }])),
  )
  const [op, setOp] = useState({ criarGhe: true, criarRiscos: true, criarEpis: true })
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [resultado, setResultado] = useState<ResultadoModelo | null>(null)

  const set = (id: string, patch: Partial<Linha>) => setLinhas((l) => ({ ...l, [id]: { ...l[id], ...patch } }))
  const escolhidas = BIBLIOTECA.funcoes.filter((f) => linhas[f.id]?.marcada)
  const resumo = useMemo(() => ({
    funcoes: escolhidas.length,
    ghes: new Set(escolhidas.map((f) => f.ghe)).size,
    riscos: escolhidas.reduce((n, f) => n + f.riscos.length, 0),
    epis: escolhidas.reduce((n, f) => n + f.epis.length, 0),
  }), [escolhidas])

  async function aplicar() {
    if (!condo || !escolhidas.length) return
    setBusy(true); setErro(null); setResultado(null)
    try {
      const r = await aplicarModelo(condo.id, escolhidas.map((f) => ({
        funcao: f, quantidade: Number(linhas[f.id].quantidade) || 0, cargaHoraria: linhas[f.id].cargaHoraria,
      })), op)
      setResultado(r)
      await qc.invalidateQueries()
    } catch (e) {
      setErro(e)
    } finally {
      setBusy(false)
    }
  }

  if (!condo) return null

  return (
    <div className="view">
      <section className="panel">
        <PanelHead eyebrow="Biblioteca de condomínio" title="Montar o cadastro pelo modelo" />
        <div className="notice">
          Marque as funções que o condomínio tem. O sistema cria os setores, as funções, os GHEs, os riscos típicos e os EPIs
          recomendados de cada uma. Depois revise tudo na visita: probabilidade, severidade e controles são sugestões. O que já
          existe com o mesmo nome é reaproveitado, então pode rodar de novo sem duplicar.
        </div>

        {BIBLIOTECA.setores.map((s) => {
          const fs = BIBLIOTECA.funcoes.filter((f) => f.setor === s.id)
          if (!fs.length) return null
          return (
            <div key={s.id} className="modelo-setor">
              <div className="category-title">{s.nome}</div>
              {fs.map((f) => {
                const l = linhas[f.id]
                const existe = jaTem(f.nome)
                return (
                  <div key={f.id} className={'modelo-funcao' + (l.marcada ? ' on' : '')}>
                    <label className="modelo-check">
                      <input type="checkbox" checked={l.marcada} onChange={(e) => set(f.id, { marcada: e.target.checked })} />
                      <span>
                        <b>{f.nome}</b>
                        {existe && <span className="badge ok" style={{ marginLeft: 8 }}>já cadastrada</span>}
                        <small>
                          {f.cbo && `CBO ${f.cbo} · `}{f.riscos.length} riscos · {f.epis.length} EPIs · {f.ghe}
                        </small>
                      </span>
                    </label>
                    {l.marcada && !existe && (
                      <div className="modelo-campos">
                        <label>Trabalhadores<input type="number" min={0} inputMode="numeric" value={l.quantidade} onChange={(e) => set(f.id, { quantidade: e.target.value })} /></label>
                        <label>Carga horária<input value={l.cargaHoraria} onChange={(e) => set(f.id, { cargaHoraria: e.target.value })} /></label>
                      </div>
                    )}
                    {l.marcada && (
                      <details className="modelo-detalhe">
                        <summary>Ver riscos e EPIs</summary>
                        <ul>
                          {f.riscos.map((r) => <li key={r.perigo}><span className="badge">{r.grupo}</span> {r.perigo}</li>)}
                        </ul>
                        {f.epis.length > 0 && <p>EPIs: {f.epis.map((e) => e.nome).join(', ')}</p>}
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </section>

      <section className="panel">
        <PanelHead eyebrow="Resumo" title="O que será criado" />
        <div className="cards metrics" style={{ marginTop: 0, marginBottom: 16 }}>
          <article><b>{resumo.funcoes}</b><span>Funções</span></article>
          <article><b>{op.criarGhe ? resumo.ghes : 0}</b><span>GHEs</span></article>
          <article><b>{op.criarRiscos ? resumo.riscos : 0}</b><span>Riscos</span></article>
          <article><b>{op.criarEpis ? resumo.epis : 0}</b><span>EPIs recomendados</span></article>
        </div>
        <div className="check-list" style={{ marginBottom: 16 }}>
          <label><input type="checkbox" checked={op.criarGhe} onChange={(e) => setOp({ ...op, criarGhe: e.target.checked })} /> Criar GHEs</label>
          <label><input type="checkbox" checked={op.criarRiscos} onChange={(e) => setOp({ ...op, criarRiscos: e.target.checked })} /> Criar riscos típicos</label>
          <label><input type="checkbox" checked={op.criarEpis} onChange={(e) => setOp({ ...op, criarEpis: e.target.checked })} /> Criar EPIs recomendados</label>
        </div>
        <ErrorBox error={erro} />
        {resultado && (
          <div className="ok-box">
            <CircleCheck size={15} style={{ verticalAlign: -3, marginRight: 6 }} aria-hidden="true" />
            Pronto: {resultado.setores} setor(es), {resultado.funcoes} função(ões) nova(s)
            {resultado.funcoesExistentes ? ` (${resultado.funcoesExistentes} já existiam)` : ''}, {resultado.ghes} GHE(s), {resultado.riscos} risco(s) e {resultado.epis} EPI(s).
          </div>
        )}
        <div className="actions">
          <button className="primary" disabled={busy || !escolhidas.length} onClick={aplicar}>
            {busy ? 'Criando…' : `Criar cadastro (${resumo.funcoes} funções)`}
          </button>
          {resultado && (
            <>
              <button className="outline" onClick={() => nav('/riscos')}><TriangleAlert size={15} aria-hidden="true" /> Revisar riscos</button>
              <button className="outline" onClick={() => nav('/ghe')}><Users size={15} aria-hidden="true" /> Ver GHEs</button>
              <button className="outline" onClick={() => nav('/epis')}><ShieldCheck size={15} aria-hidden="true" /> Ver EPIs</button>
            </>
          )}
        </div>
      </section>

      <p className="entity-meta" style={{ padding: '0 4px' }}>
        Biblioteca versão {BIBLIOTECA.versao}. Fontes: {BIBLIOTECA.fontes.join('; ')}.
      </p>
    </div>
  )
}
