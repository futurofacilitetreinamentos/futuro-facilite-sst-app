import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocButtons } from '../components/DocPreview'
import { ErrorBox, Loading, PanelHead, fmtDate } from '../components/ui'
import { useDocContext } from '../lib/legacy'
import { buildOrdemServico, fmtCpf, trabalhadorAtivo } from '../reports'
import type { DocContext } from '../reports/types'
import { useCondo } from '../state/CondoProvider'

type Modo = 'trabalhador' | 'funcao'

/** Ordem de Serviço de SST (NR-1, 1.4.1 c): uma OS por trabalhador ou por função. */
export default function OrdemServicoPage() {
  const { condo } = useCondo()
  const { data, error, isLoading } = useDocContext(condo?.id)
  if (isLoading || !data) return <div className="view">{error ? <ErrorBox error={error} /> : <Loading />}</div>
  return <div className="view"><OrdemServico ctx={data} /></div>
}

function OrdemServico({ ctx }: { ctx: DocContext }) {
  const ativos = useMemo(
    () => (ctx.project.trabalhadores || []).filter((t) => trabalhadorAtivo(t)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')),
    [ctx],
  )
  const funcoes = useMemo(() => Array.from(new Set((ctx.project.funcoes || []).map((f) => f.nome || '').filter(Boolean))), [ctx])
  const [modo, setModo] = useState<Modo>(ativos.length ? 'trabalhador' : 'funcao')
  // null = todos (padrão); um Set = escolha manual
  const [selT, setSelT] = useState<Set<string> | null>(null)
  const [selF, setSelF] = useState<Set<string> | null>(null)

  const idsT = selT ? ativos.filter((t) => selT.has(t.id)).map((t) => t.id) : ativos.map((t) => t.id)
  const nomesF = selF ? funcoes.filter((f) => selF.has(f)) : funcoes
  const count = modo === 'trabalhador' ? idsT.length : nomesF.length

  function toggle<T>(cur: Set<T> | null, all: T[], v: T, set: (s: Set<T>) => void) {
    const s = new Set(cur ?? all)
    if (s.has(v)) s.delete(v)
    else s.add(v)
    set(s)
  }

  const build = (c: DocContext) =>
    modo === 'trabalhador' ? buildOrdemServico(c, { trabalhadorIds: idsT }) : buildOrdemServico(c, { funcaoNomes: nomesF })

  return (
    <section className="panel">
      <PanelHead eyebrow="NR-1 · item 1.4.1, alínea c" title="Ordem de Serviço de Segurança e Saúde">
        <DocButtons title="Ordem de Serviço" build={build} disabled={count === 0} />
      </PanelHead>
      <div className="notice">
        Gera uma Ordem de Serviço por trabalhador (ou por função), cada uma em nova página, com os riscos, medidas de
        prevenção e EPIs do PGR, os procedimentos de emergência, as obrigações do trabalhador e o termo de ciência para
        assinatura.
      </div>
      {ativos.length === 0 && (
        <div className="notice">
          Nenhum trabalhador ativo cadastrado. Cadastre-os na página <Link to="/trabalhadores">Trabalhadores</Link> para
          emitir OS individuais com nome e CPF; enquanto isso, a emissão por função continua disponível.
        </div>
      )}

      <div className="actions" style={{ margin: '12px 0' }}>
        <button className={modo === 'trabalhador' ? 'primary' : 'outline'} disabled={ativos.length === 0} onClick={() => setModo('trabalhador')}>
          Por trabalhador ({ativos.length})
        </button>
        <button className={modo === 'funcao' ? 'primary' : 'outline'} onClick={() => setModo('funcao')}>
          Por função ({funcoes.length})
        </button>
      </div>

      {modo === 'trabalhador' ? (
        <>
          <div className="actions">
            <button className="outline small" onClick={() => setSelT(null)}>Selecionar todos</button>
            <button className="outline small" onClick={() => setSelT(new Set())}>Limpar</button>
            <span className="field-hint" style={{ alignSelf: 'center' }}>{idsT.length} de {ativos.length} selecionado(s)</span>
          </div>
          <div className="check-list">
            {ativos.map((t) => (
              <label key={t.id}>
                <input type="checkbox" checked={selT ? selT.has(t.id) : true} onChange={() => toggle(selT, ativos.map((x) => x.id), t.id, setSelT)} />
                <span>
                  {t.nome || '—'}
                  <span className="field-hint" style={{ display: 'block' }}>
                    {t.funcao || 'Sem função'}{t.cpf ? ' · CPF ' + fmtCpf(t.cpf) : ''}{t.admissao ? ' · adm. ' + fmtDate(t.admissao) : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </>
      ) : funcoes.length === 0 ? (
        <div className="empty">Nenhuma função cadastrada. Cadastre as funções do condomínio para emitir a Ordem de Serviço.</div>
      ) : (
        <>
          <div className="actions">
            <button className="outline small" onClick={() => setSelF(null)}>Selecionar todas</button>
            <button className="outline small" onClick={() => setSelF(new Set())}>Limpar</button>
            <span className="field-hint" style={{ alignSelf: 'center' }}>{nomesF.length} de {funcoes.length} selecionada(s)</span>
          </div>
          <div className="check-list">
            {funcoes.map((f) => (
              <label key={f}>
                <input type="checkbox" checked={selF ? selF.has(f) : true} onChange={() => toggle(selF, funcoes, f, setSelF)} />
                <span>{f}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
