import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { errMsg, supabase } from '../lib/supabase'
import { QUESTIONS, SCALE, TOPICS } from '../reports/drps'

interface Info { nome: string; setores: string[]; funcoes: string[] }

/** Questionário público e anônimo (NR-1 / riscos psicossociais). Não exige login. */
export default function DrpsForm() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<Info | null | undefined>(undefined)
  const [page, setPage] = useState(0) // 0 intro, 1 identificação, 2..14 tópicos, 15 fim
  const [funcao, setFuncao] = useState('')
  const [setor, setSetor] = useState('')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.rpc('drps_form_info', { p_token: token }).then(({ data, error }) => {
      setInfo(error ? null : ((data as Info | null) ?? null))
    })
  }, [token])

  const total = TOPICS.length + 2
  const topic = page >= 2 && page < 2 + TOPICS.length ? TOPICS[page - 2] : null
  const qs = topic ? QUESTIONS.filter((q) => topic.qs.includes(q.n)) : []

  function next() {
    setError('')
    if (page === 1 && (!funcao.trim() || !setor.trim())) return setError('Informe sua função e setor.')
    if (topic && qs.some((q) => !answers[q.n])) return setError('Responda todas as perguntas desta página.')
    if (page === 1 + TOPICS.length) return void submit()
    setPage(page + 1)
    window.scrollTo(0, 0)
  }

  async function submit() {
    setBusy(true)
    const { error } = await supabase.rpc('submit_drps', {
      p_token: token, p_funcao: funcao.trim(), p_setor: setor.trim(), p_answers: answers,
    })
    setBusy(false)
    if (error) setError('Não foi possível enviar: ' + errMsg(error))
    else setPage(total)
  }

  if (info === undefined) return <div className="drps-public"><div className="drps-card">Carregando…</div></div>
  if (info === null)
    return (
      <div className="drps-public">
        <div className="drps-card"><h1>Link inválido</h1><p>Peça um novo link ao responsável pelo seu condomínio.</p></div>
      </div>
    )

  return (
    <div className="drps-public">
      <div className="drps-card">
        <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Futuro Facilite" style={{ height: 50 }} />
        <span className="eyebrow" style={{ display: 'block', marginTop: 8 }}>NR-1 · RISCOS PSICOSSOCIAIS</span>
        <h1>{info.nome}</h1>
        {page < total && (
          <div className="progress"><span style={{ width: `${(page / total) * 100}%` }} /></div>
        )}

        {page === 0 && (
          <>
            <p>
              Este questionário avalia fatores psicossociais relacionados ao trabalho, conforme a NR-1. Ele é
              <b> anônimo</b>: não pedimos seu nome e as respostas são analisadas apenas em conjunto.
            </p>
            <p>São {QUESTIONS.length} perguntas curtas. Responda pensando nos últimos meses de trabalho.</p>
          </>
        )}

        {page === 1 && (
          <div className="form-grid">
            <label>
              Sua função
              <input list="drps-funcoes" value={funcao} onChange={(e) => setFuncao(e.target.value)} />
              <datalist id="drps-funcoes">{info.funcoes.map((f) => <option key={f} value={f} />)}</datalist>
            </label>
            <label>
              Seu setor
              <input list="drps-setores" value={setor} onChange={(e) => setSetor(e.target.value)} />
              <datalist id="drps-setores">{info.setores.map((s) => <option key={s} value={s} />)}</datalist>
            </label>
          </div>
        )}

        {topic && (
          <>
            <h3>{page - 1}. {topic.nome}</h3>
            {qs.map((q) => (
              <div className="drps-q" key={q.n}>
                <b>{q.n}. {q.title}</b>
                {q.hint && <small>{q.hint}</small>}
                <div className="drps-scale">
                  {SCALE.map((s) => (
                    <label key={s.v} className={answers[q.n] === s.v ? 'on' : ''}>
                      <input type="radio" name={'q' + q.n} checked={answers[q.n] === s.v}
                        onChange={() => setAnswers({ ...answers, [q.n]: s.v })} />
                      {s.l}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {page === total ? (
          <div className="ok-box" style={{ fontSize: 14 }}>
            <b>Obrigado!</b> Suas respostas foram enviadas com sucesso. Você já pode fechar esta página.
          </div>
        ) : (
          <>
            {error && <div className="error-box">{error}</div>}
            <div className="actions" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <button className="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Voltar</button>
              <button className="primary" disabled={busy} onClick={next}>
                {page === 0 ? 'Começar' : page === 1 + TOPICS.length ? (busy ? 'Enviando…' : 'Enviar respostas') : 'Próximo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
