import { useNavigate } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { fmtDate } from '../components/ui'
import { AlertasPanel } from '../components/AlertasPanel'
import { useChildren, useGhes } from '../lib/db'
import { useCondo } from '../state/CondoProvider'
import { STATUS_CONTRATO, STATUS_PROPOSTA } from '../lib/comercial'
import '../styles/comercial.css'

export default function Dashboard() {
  const { condo } = useCondo()
  const nav = useNavigate()
  const id = condo?.id
  const { data: setores = [] } = useChildren('setores', id)
  const { data: funcoes = [] } = useChildren('funcoes', id)
  const { data: ghes = [] } = useGhes(id)
  const { data: riscos = [] } = useChildren('riscos', id)
  const { data: agenda = [] } = useChildren('agendamentos', id)
  const { data: inspecoes = [] } = useChildren('inspecoes', id)
  const propQ = useChildren('propostas', id)
  const contQ = useChildren('contratos', id)

  if (!condo) {
    return (
      <div className="view">
        <div className="hero">
          <div>
            <span className="eyebrow">BEM-VINDO</span>
            <h2>Futuro Facilite SST</h2>
            <p>Comece cadastrando o primeiro condomínio. Os dados ficam salvos na nuvem e aparecem em qualquer aparelho.</p>
            <button className="primary" onClick={() => nav('/condominio?novo=1')}>Cadastrar condomínio</button>
          </div>
        </div>
      </div>
    )
  }

  const proxima = agenda.filter((a) => a.status === 'agendada').sort((a, b) => a.data.localeCompare(b.data))[0]
  const altos = riscos.filter((r) => r.prob * r.sev >= 10).length
  // etapa comercial: só aparece quando as tabelas existem (migração 0006)
  const propostas = propQ.data ?? []
  const contratos = contQ.data ?? []
  const contrato = contratos.find((c) => c.status === 'assinado') ?? contratos.find((c) => c.status === 'emitido')
  const ultima = propostas[0]
  const comercial = propQ.error || contQ.error || propQ.isLoading ? null : {
    key: 'comercial', titulo: propostas.length ? 'Orçamento e contrato' : 'Gerar orçamento', done: Boolean(contrato),
    desc: contrato ? `Contrato ${contrato.numero ?? ''} ${STATUS_CONTRATO[contrato.status].label.toLowerCase()}`
      : ultima ? `Orçamento ${ultima.numero ?? ''}: ${STATUS_PROPOSTA[ultima.status].label.toLowerCase()}` : 'Proposta à vista e a prazo',
    to: propostas.length ? '/comercial' : '/comercial?novo=1',
  }
  const steps = [
    // sem funções ainda: o caminho mais rápido é montar pelo modelo de condomínio
    { key: 'cadastro', titulo: 'Cadastro', done: Boolean(condo.razao_social && setores.length && funcoes.length),
      desc: funcoes.length ? 'Condomínio, setores e funções' : 'Monte pelo modelo de condomínio',
      to: funcoes.length ? '/condominio' : '/modelo' },
    ...(comercial ? [comercial] : []),
    { key: 'agenda', titulo: 'Agendamento', done: agenda.some((a) => a.status !== 'cancelada'), desc: proxima ? `Próxima visita ${fmtDate(proxima.data)}` : 'Agendar visita técnica', to: '/agenda' },
    { key: 'inspecao', titulo: 'Inspeção', done: inspecoes.length > 0, desc: inspecoes[0] ? `Última: ${inspecoes[0].numero}` : 'Checklist em campo', to: proxima ? `/inspecao/nova?agenda=${proxima.id}` : '/inspecao/nova' },
    { key: 'laudos', titulo: 'Laudos', done: inspecoes.length > 0 && riscos.length > 0, desc: 'PGR, DRPS, PCMSO, LTCAT', to: '/laudos' },
  ]
  // sem orçamento ainda, a próxima ação é gerá-lo (logo depois do cadastro do condomínio)
  const now = comercial && !propostas.length && condo.razao_social ? comercial : steps.find((s) => !s.done)

  return (
    <div className="view">
      <div className="hero">
        <div>
          <span className="eyebrow">ATENDIMENTO</span>
          <h2>{condo.nome_fantasia || condo.razao_social}</h2>
          <p>{[condo.cnpj, condo.endereco, condo.responsavel_empresa && `Síndico(a): ${condo.responsavel_empresa}`].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="hero-badge" style={{ '--pct': `${(steps.filter((s) => s.done).length / steps.length) * 100}%` } as React.CSSProperties}>
          <div className="hb-in">{steps.filter((s) => s.done).length}/{steps.length}<span>etapas concluídas</span></div>
        </div>
      </div>

      <div className={'pipeline' + (steps.length === 5 ? ' five' : '')}>
        {steps.map((s, i) => (
          <button key={s.key} className={'step ' + (s.done ? 'done' : s === now ? 'now' : 'wait')} onClick={() => nav(s.to)}>
            <b>ETAPA {i + 1}</b>
            <strong>{s.done && <CircleCheck size={15} strokeWidth={2} className="step-ok" aria-hidden="true" />}{s.titulo}</strong>
            <span>{s.desc}</span>
          </button>
        ))}
      </div>
      {now && (
        <div className="next-action">
          <button className="primary" onClick={() => nav(now.to)}>Próxima ação: {now.titulo}</button>
          <span>{now.desc}</span>
        </div>
      )}

      <AlertasPanel condo={condo} />

      <div className="cards metrics">
        <article><b>{setores.length}</b><span>Setores</span></article>
        <article><b>{funcoes.length}</b><span>Funções</span></article>
        <article><b>{ghes.length}</b><span>GHE</span></article>
        <article><b>{riscos.length}</b><span>Riscos</span></article>
        <article><b>{altos}</b><span>Altos / críticos</span></article>
      </div>
    </div>
  )
}
