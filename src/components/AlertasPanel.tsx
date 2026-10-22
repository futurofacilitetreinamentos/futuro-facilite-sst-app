import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, ChevronRight } from 'lucide-react'
import { useChildren, useEquipe, useGhes } from '../lib/db'
import { toLegacyProject } from '../lib/legacy'
import { computeAlertas, contarPorSeveridade, SEVERIDADES, type Alerta } from '../lib/alertas'
import { mesesPeriodico } from '../lib/periodicidade'
import { pcmsoPlanFor, type PcmsoPlan } from '../reports/pcmso'
import type { Condominio } from '../lib/types'
import '../styles/saude.css'

/**
 * Plano de exames do PCMSO do condomínio (mesma regra do documento), montado com os dados
 * já em cache — sem gerar o documento inteiro.
 */
export function usePlanoPcmso(condo: Condominio | null | undefined): PcmsoPlan | null {
  const id = condo?.id
  const { data: setores = [] } = useChildren('setores', id)
  const { data: funcoes = [] } = useChildren('funcoes', id)
  const { data: ghes = [] } = useGhes(id)
  const { data: riscos = [] } = useChildren('riscos', id)
  const { data: equipe = [] } = useEquipe()
  return useMemo(() => {
    if (!condo) return null
    const p = toLegacyProject({
      condo, setores, funcoes, ghes, riscos, equipe, agenda: [], inspecoes: [], drps: [], revisoes: [], epis: [],
      docsAnteriores: [], medicoesAnteriores: [], trabalhadores: [],
    })
    return pcmsoPlanFor(p)
  }, [condo, setores, funcoes, ghes, riscos, equipe])
}

/** Alertas do condomínio ativo (ver regras em lib/alertas.ts). */
export function useAlertas(condo: Condominio | null | undefined): Alerta[] {
  const id = condo?.id
  const plan = usePlanoPcmso(condo)
  const { data: funcoes = [] } = useChildren('funcoes', id)
  const { data: trabalhadores = [] } = useChildren('trabalhadores', id)
  const { data: asos = [] } = useChildren('asos', id)
  const { data: treinamentos = [] } = useChildren('treinamentos', id)
  const { data: epis = [] } = useChildren('epis', id)
  const { data: docsAnteriores = [] } = useChildren('docs_anteriores', id)
  const { data: revisoes = [] } = useChildren('doc_revisoes', id)
  return useMemo(() => {
    if (!condo) return []
    const funcaoNome = new Map(funcoes.map((f) => [f.id, f.nome]))
    return computeAlertas({
      condo, trabalhadores, asos, treinamentos, epis, docsAnteriores, revisoes,
      mesesPeriodico: (t) => mesesPeriodico(plan, t.funcao_id ? funcaoNome.get(t.funcao_id) : null),
    })
  }, [condo, plan, funcoes, trabalhadores, asos, treinamentos, epis, docsAnteriores, revisoes])
}

const sevCls = (s: Alerta['severidade']) => SEVERIDADES.find((x) => x.value === s)?.cls ?? ''

/** Painel recolhível de alertas para o Atendimento. Some quando não há alertas. */
export function AlertasPanel({ condo }: { condo: Condominio | null | undefined }) {
  const alertas = useAlertas(condo)
  const [open, setOpen] = useState(false)
  if (!alertas.length) return null
  const c = contarPorSeveridade(alertas)
  return (
    <section className="panel alertas-panel">
      <button type="button" className="alertas-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="alertas-icon"><BellRing size={18} strokeWidth={1.75} aria-hidden="true" /></span>
        <span className="alertas-title">
          <span className="eyebrow">Prazos e vencimentos</span>
          <strong>{alertas.length} alerta{alertas.length === 1 ? '' : 's'}</strong>
        </span>
        <span className="alertas-counts">
          {SEVERIDADES.filter((s) => c[s.value]).map((s) => (
            <span key={s.value} className={'badge ' + s.cls}>{c[s.value]} {s.label.toLowerCase()}</span>
          ))}
        </span>
        <ChevronRight size={18} className={'alertas-chev' + (open ? ' open' : '')} aria-hidden="true" />
      </button>
      {open && (
        <ul className="alertas-list">
          {alertas.map((a) => (
            <li key={a.id} className={'alerta sev-' + a.severidade}>
              <Link to={a.to}>
                <span className={'badge ' + sevCls(a.severidade)}>{a.severidade === 'info' ? 'info' : a.severidade}</span>
                <span className="alerta-body">
                  <b>{a.titulo}</b>
                  <small>{a.detalhe}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="alerta-go" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AlertasPanel
