import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DocButtons } from '../components/DocPreview'
import { ErrorBox, Loading, PanelHead, fmtDate } from '../components/ui'
import { useDocContext } from '../lib/legacy'
import { useSave } from '../lib/db'
import type { Condominio } from '../lib/types'
import {
  buildDoc, buildLTCAT, buildNR1, buildPCMSO, buildPGR, drpsSummary, ltcatSummary, pcmsoSummary, pgrSummary, planoAcao,
  readiness,
} from '../reports'
import { QUESTIONS } from '../reports/drps'
import type { DocContext } from '../reports/types'
import { useCondo } from '../state/CondoProvider'

/** Carrega o contexto dos documentos do condomínio ativo e repassa à tela. */
function WithCtx({ children }: { children: (ctx: DocContext) => React.ReactNode }) {
  const { condo } = useCondo()
  const { data, error, isLoading } = useDocContext(condo?.id)
  if (isLoading || !data) return <div className="view">{error ? <ErrorBox error={error} /> : <Loading />}</div>
  return <div className="view">{children(data)}</div>
}

function Metrics({ items }: { items: [number | string, string][] }) {
  return (
    <div className="cards metrics" style={{ marginBottom: 14 }}>
      {items.map(([v, l]) => <article key={l}><b>{v}</b><span>{l}</span></article>)}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function PlanoPage() {
  return (
    <WithCtx>
      {(ctx) => {
        const rows = planoAcao(ctx)
        return (
          <section className="panel">
            <PanelHead eyebrow="PGR / NR-1" title="Plano de ação" />
            <div className="notice">
              Reúne as ações do inventário de riscos e as não conformidades da última inspeção. Para alterar, edite o risco
              no inventário ou o item na inspeção.
            </div>
            {rows.length === 0 ? <div className="empty">Nenhuma ação cadastrada.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Origem</th><th>Risco / item</th><th>Nível</th><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.origem}</td><td>{r.risco}</td>
                        <td>{r.nivelCls ? <span className={'risk-level ' + r.nivelCls}>{r.nivel}</span> : r.nivel}</td>
                        <td>{r.acao}</td><td>{r.resp}</td><td>{fmtDate(r.prazo)}</td><td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      }}
    </WithCtx>
  )
}

export function PgrPage() {
  return (
    <WithCtx>
      {(ctx) => {
        const s = pgrSummary(ctx)
        return (
          <section className="panel">
            <PanelHead eyebrow="DOCUMENTO" title="PGR — Programa de Gerenciamento de Riscos">
              <DocButtons title="PGR" build={buildPGR} />
            </PanelHead>
            <Metrics items={[[s.setores, 'Setores'], [s.ghes, 'GHE'], [s.riscos, 'Riscos'], [s.altos, 'Altos / críticos'], [s.drpsRespostas, 'Respostas DRPS']]} />
            <div className="notice">{s.notice}</div>
          </section>
        )
      }}
    </WithCtx>
  )
}

export function PcmsoPage() {
  return (
    <WithCtx>
      {(ctx) => {
        const s = pcmsoSummary(ctx)
        return (
          <section className="panel">
            <PanelHead eyebrow="DOCUMENTO" title="PCMSO — Programa de Controle Médico">
              <DocButtons title="PCMSO" build={buildPCMSO} />
            </PanelHead>
            <Metrics items={[[s.funcoes, 'Funções'], [s.exames, 'Exames'], [s.riscos, 'Riscos'], [s.medicoDefinido ? 'Sim' : 'Não', 'Médico definido']]} />
            <div className="notice">{s.notice}</div>
            {s.plan.byFunc.map((f) => (
              <div key={f.funcao} style={{ marginBottom: 12 }}>
                <h3 style={{ margin: '8px 0' }}>{f.funcao} <span className="entity-meta">{[f.setor, f.qtd && `${f.qtd} trabalhador(es)`].filter(Boolean).join(' · ')}</span></h3>
                <table className="table">
                  <thead><tr><th>Exame</th><th>eSocial</th><th>Tipos</th><th>Periodicidade</th><th>Motivo</th></tr></thead>
                  <tbody>{f.exames.map((e) => <tr key={e.exame}><td>{e.exame}</td><td>{e.esocial}</td><td>{e.tipos}</td><td>{e.periodo}</td><td>{e.motivo}</td></tr>)}</tbody>
                </table>
              </div>
            ))}
            {s.plan.byFunc.length === 0 && <div className="empty">Cadastre as funções para montar o quadro de exames.</div>}
          </section>
        )
      }}
    </WithCtx>
  )
}

export function LtcatPage() {
  return (
    <WithCtx>
      {(ctx) => {
        const s = ltcatSummary(ctx)
        return (
          <section className="panel">
            <PanelHead eyebrow="DOCUMENTO" title="LTCAT — Laudo Técnico das Condições Ambientais">
              <DocButtons title="LTCAT" build={buildLTCAT} />
            </PanelHead>
            <Metrics items={[[s.agentes, 'Agentes'], [s.riscos, 'Riscos'], [s.ghes, 'GHE'], [s.engenheiroDefinido ? 'Sim' : 'Não', 'Responsável definido']]} />
            <div className="notice">{s.notice}</div>
            <p style={{ fontSize: 13, lineHeight: 1.5 }}><b>Conclusão:</b> {s.conclusao}</p>
            {s.plan.agentes.length === 0 && <div className="empty">{s.semAgentes}</div>}
            {s.plan.agentes.map((a, i) => (
              <div className="entity-card" key={i}>
                <div className="entity-title">{a.agente} <span className="badge">{a.grupo}</span></div>
                <div className="entity-meta">{[a.ghe, a.fonte, a.exposicao, a.enquadramento].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </section>
        )
      }}
    </WithCtx>
  )
}

export function LaudosPage() {
  const nav = useNavigate()
  return (
    <WithCtx>
      {(ctx) => (
        <section className="panel">
          <PanelHead eyebrow="LAUDOS" title="Documentos do condomínio" />
          <div className="laudo-grid">
            {readiness(ctx).map((d) => (
              <div key={d.id} className={'laudo-card' + (d.ready ? ' ready' : '')}>
                <span className={'badge ' + (d.ready ? 'ok' : 'warn')}>{d.status}</span>
                <h3>{d.title}</h3>
                <p>{d.meta}</p>
                <div className="actions">
                  {d.goTo === 'inspecao' && <button className="primary" onClick={() => nav('/inspecao/nova')}>Fazer inspeção</button>}
                  {d.goTo === 'cadastro' && <button className="primary" onClick={() => nav('/condominio')}>Completar cadastro</button>}
                  {d.goTo === null && <DocButtons title={d.title} build={(c) => buildDoc(c, d.id) ?? ''} />}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </WithCtx>
  )
}

// ---------------------------------------------------------------------------
// DRPS — link para os trabalhadores e resultado coletivo
// ---------------------------------------------------------------------------

export function drpsLink(token: string) {
  return `${window.location.origin}${window.location.pathname}#/drps-form/${token}`
}

function newToken() {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function DrpsPage() {
  const { condo } = useCondo()
  const qc = useQueryClient()
  const save = useSave<Partial<Condominio>>('condominios')
  if (!condo) return null
  const link = drpsLink(condo.drps_token)
  const phone = condo.contato_empresa.replace(/\D/g, '')
  const msg = `Olá! Segue o questionário anônimo de riscos psicossociais (NR-1) do ${condo.nome_fantasia || condo.razao_social}. Leva cerca de 10 minutos: ${link}`
  const wa = `https://wa.me/${phone ? (phone.startsWith('55') ? phone : '55' + phone) : ''}?text=${encodeURIComponent(msg)}`

  async function rotate() {
    if (!confirm('Gerar um novo link? O link anterior deixa de funcionar (as respostas já recebidas são mantidas).')) return
    await save.mutateAsync({ id: condo!.id, drps_token: newToken() })
  }

  return (
    <WithCtx>
      {(ctx) => {
        const s = drpsSummary(ctx)
        const exportCSV = () => {
          const head = ['Data', 'Função', 'Setor', ...QUESTIONS.map((q) => `Q${q.n}`)]
          const rows = ctx.drps.map((r) => [r.ts ?? '', r.funcao ?? '', r.setor ?? '', ...QUESTIONS.map((q) => String(r.answers[q.n] ?? ''))])
          const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
          a.download = `DRPS_${condo.razao_social.replace(/[^\w]+/g, '_')}.csv`
          a.click()
          URL.revokeObjectURL(a.href)
        }
        return (
          <>
            <section className="panel">
              <PanelHead eyebrow="NR-1 / DRPS" title="Link do questionário">
                <button className="outline" onClick={() => qc.invalidateQueries({ queryKey: ['doc-context'] })}>Atualizar respostas</button>
              </PanelHead>
              <div className="notice">
                Envie este link aos trabalhadores. As respostas são anônimas e chegam direto no sistema, de qualquer celular.
              </div>
              <ErrorBox error={save.error} />
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
              <div className="actions" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                <button className="primary" onClick={() => navigator.clipboard.writeText(link)}>Copiar link</button>
                <a href={wa} target="_blank" rel="noreferrer"><button className="outline">Enviar no WhatsApp</button></a>
                <a href={link} target="_blank" rel="noreferrer"><button className="outline">Abrir formulário</button></a>
                <button className="outline" onClick={exportCSV} disabled={!ctx.drps.length}>Exportar CSV</button>
                <button className="ghost" onClick={rotate}>Gerar novo link</button>
              </div>
            </section>

            <section className="panel">
              <PanelHead eyebrow="RESULTADO COLETIVO" title="Riscos psicossociais por tópico">
                <DocButtons title="NR-1 / DRPS" build={buildNR1} />
              </PanelHead>
              <Metrics items={[[s.n, 'Respostas'], [s.nColabs, 'Trabalhadores'], [s.nColabs ? `${Math.round((s.n / s.nColabs) * 100)}%` : '—', 'Adesão'], [s.altos.length, 'Tópicos altos']]} />
              <table className="table">
                <thead><tr><th>#</th><th>Tópico</th><th>Média (1–3)</th><th>Gravidade</th></tr></thead>
                <tbody>
                  {s.topicos.map((t) => (
                    <tr key={t.id}>
                      <td>{t.id}</td><td>{t.nome}</td><td>{s.n ? t.media.toFixed(2) : '—'}</td>
                      <td><span className={'badge ' + (t.gravidade === 'Alta' ? 'bad' : t.gravidade === 'Média' ? 'warn' : t.gravidade === 'Baixa' ? 'ok' : '')}>{t.gravidade}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <PanelHead eyebrow="PARTICIPAÇÃO" title="Respondentes (anônimos)" />
              {s.respondents.length === 0 && <div className="empty">Nenhuma resposta recebida ainda.</div>}
              {s.respondents.length > 0 && (
                <table className="table">
                  <thead><tr><th>Data</th><th>Função</th><th>Setor</th></tr></thead>
                  <tbody>{s.respondents.map((r, i) => <tr key={i}><td>{new Date(r.ts).toLocaleString('pt-BR')}</td><td>{r.funcao}</td><td>{r.setor}</td></tr>)}</tbody>
                </table>
              )}
            </section>
          </>
        )
      }}
    </WithCtx>
  )
}
