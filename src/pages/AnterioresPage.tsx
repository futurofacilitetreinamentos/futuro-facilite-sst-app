import { useState } from 'react'
import { FileText, Paperclip } from 'lucide-react'
import { CrudSection } from '../components/CrudSection'
import { ErrorBox, fmtDate, type FieldDef } from '../components/ui'
import { removePhotos, signedUrls, uploadDocAnterior, useChildren, useRemove, useSave } from '../lib/db'
import { TIPOS_DOC_ANTERIOR, type DocAnterior, type MedicaoAnterior } from '../lib/types'
import { useCondo } from '../state/CondoProvider'

type DocForm = Omit<DocAnterior, 'id'> & { id?: string }
type MedForm = Omit<MedicaoAnterior, 'id'> & { id?: string }

const tipoLabel = (t: string) => TIPOS_DOC_ANTERIOR.find((x) => x.value === t)?.label ?? t
const hoje = () => new Date().toISOString().slice(0, 10)
const num = (v: string) => {
  const n = Number(String(v).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && String(v).trim() !== '' ? n : null
}

async function abrirArquivo(path: string) {
  const url = (await signedUrls([path]))[path]
  if (url) window.open(url, '_blank', 'noopener')
  else alert('Não foi possível abrir o arquivo.')
}

/** Laudos do ano anterior (normalmente de outra empresa) e medições aproveitadas deles. */
export default function AnterioresPage() {
  const { condo } = useCondo()
  const { data: docs = [], error: docsErr } = useChildren('docs_anteriores', condo?.id)
  const { data: meds = [] } = useChildren('medicoes_anteriores', condo?.id)
  const { data: riscos = [] } = useChildren('riscos', condo?.id)
  const saveDoc = useSave<DocForm>('docs_anteriores')
  const removeDoc = useRemove('docs_anteriores')
  const saveMed = useSave<MedForm>('medicoes_anteriores')
  const removeMed = useRemove('medicoes_anteriores')
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState<unknown>(null)
  if (!condo) return null

  const docFields: FieldDef<DocForm>[] = [
    { key: 'tipo', label: 'Documento *', type: 'select', options: TIPOS_DOC_ANTERIOR, required: true },
    { key: 'empresa', label: 'Empresa que emitiu' },
    { key: 'responsavel', label: 'Responsável técnico' },
    { key: 'registro', label: 'Registro (MTE / CRM / CREA)' },
    { key: 'data_emissao', label: 'Data de emissão', type: 'date' },
    { key: 'validade', label: 'Válido até', type: 'date' },
    { key: 'observacoes', label: 'Observações', type: 'textarea', span: true },
  ]

  const docNome = (id: string | null) => {
    const d = docs.find((x) => x.id === id)
    return d ? `${tipoLabel(d.tipo)}${d.empresa ? ' · ' + d.empresa : ''}${d.data_emissao ? ' · ' + fmtDate(d.data_emissao) : ''}` : ''
  }
  const riscoNome = (id: string | null) => {
    const r = riscos.find((x) => x.id === id)
    return r ? `${r.perigo} (${r.grupo})` : ''
  }

  const medFields: FieldDef<MedForm>[] = [
    { key: 'doc_id', label: 'Laudo de origem', type: 'select', options: docs.map((d) => ({ value: d.id, label: docNome(d.id) })), emptyLabel: '— não informado —' },
    {
      key: 'risco_id', label: 'Risco do inventário', type: 'select', emptyLabel: '— só registrar, sem ligar a um risco —',
      options: riscos.filter((r) => ['Físico', 'Químico', 'Biológico'].includes(r.grupo)).map((r) => ({ value: r.id, label: riscoNome(r.id) })),
    },
    { key: 'agente', label: 'Agente *', required: true, placeholder: 'Ruído contínuo' },
    { key: 'tecnica', label: 'Metodologia', placeholder: 'NHO-01 dosimetria' },
    { key: 'equipamento', label: 'Equipamento', placeholder: 'Dosímetro' },
    { key: 'data', label: 'Data da medição', type: 'date' },
    { key: 'resultado', label: 'Resultado', placeholder: '87,2', inputMode: 'decimal' },
    { key: 'limite', label: 'Limite de tolerância', placeholder: '85', inputMode: 'decimal' },
    { key: 'unidade', label: 'Unidade', placeholder: 'dB(A)' },
    { key: 'observacoes', label: 'Observações', type: 'textarea', span: true },
  ]

  return (
    <div className="view">
      <CrudSection<DocForm>
        eyebrow="Histórico do condomínio" title="Laudos anteriores" singular="Laudo anterior" rows={docs} fields={docFields}
        notice={
          <>
            <div className="notice">
              Guarde aqui os laudos do ano anterior (PGR, PCMSO, LTCAT…), principalmente quando o condomínio vem de outra empresa.
              Os arquivos ficam no armazenamento privado do sistema, só para a equipe.
            </div>
            {docsErr && <ErrorBox error={'Não foi possível carregar os laudos anteriores (a migração 0004 já foi aplicada no banco?)'} />}
          </>
        }
        blank={() => ({
          condominio_id: condo.id, tipo: 'pgr', empresa: '', responsavel: '', registro: '', data_emissao: null, validade: null,
          arquivo: null, nome_arquivo: '', observacoes: '',
        })}
        render={(d) => {
          const vencido = d.validade && d.validade < hoje()
          return {
            title: <>{tipoLabel(d.tipo)}{d.empresa ? ` · ${d.empresa}` : ''} {d.validade && <span className={'badge ' + (vencido ? 'bad' : 'ok')}>{vencido ? 'vencido' : 'válido'} até {fmtDate(d.validade)}</span>}</>,
            meta: [
              d.data_emissao && `Emitido em ${fmtDate(d.data_emissao)}`,
              d.responsavel && `${d.responsavel}${d.registro ? ` (${d.registro})` : ''}`,
              d.nome_arquivo || (d.arquivo ? 'arquivo anexado' : 'sem arquivo'),
            ].filter(Boolean).join(' · '),
            side: d.arquivo ? (
              <button type="button" className="outline" onClick={() => abrirArquivo(d.arquivo!)}>
                <FileText size={14} aria-hidden="true" /> Abrir
              </button>
            ) : undefined,
          }
        }}
        extraForm={(row, set) => (
          <div className="span2">
            <label>Arquivo do laudo (PDF)</label>
            <div className="photo-buttons">
              <label className="photo-btn">
                <Paperclip size={15} strokeWidth={1.75} aria-hidden="true" /> {row.arquivo ? 'Trocar arquivo' : 'Escolher arquivo'}
                <input
                  type="file" accept="application/pdf,image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setEnviando(true); setErroEnvio(null)
                    try {
                      const path = await uploadDocAnterior(condo.id, f)
                      if (row.arquivo) await removePhotos([row.arquivo])
                      set({ arquivo: path, nome_arquivo: f.name })
                    } catch (err) {
                      setErroEnvio(err)
                    } finally {
                      setEnviando(false)
                    }
                  }}
                />
              </label>
              {enviando && <span className="field-hint">Enviando…</span>}
              {!enviando && row.nome_arquivo && <span className="field-hint">{row.nome_arquivo}</span>}
            </div>
            <ErrorBox error={erroEnvio} />
          </div>
        )}
        onSave={(r) => saveDoc.mutateAsync({ ...r, data_emissao: r.data_emissao || null, validade: r.validade || null })}
        onRemove={async (id) => {
          const d = docs.find((x) => x.id === id)
          await removeDoc.mutateAsync(id)
          if (d?.arquivo) await removePhotos([d.arquivo])
        }}
      />

      <CrudSection<MedForm>
        eyebrow="Aproveitamento técnico" title="Medições dos laudos anteriores" singular="Medição" rows={meds} fields={medFields}
        notice={
          <div className="notice">
            Registre as avaliações quantitativas dos laudos anteriores (ruído, calor, agentes químicos). Ligada a um risco do inventário,
            a medição entra no LTCAT novo citando a fonte, sempre que o risco não tiver medição própria. Confirme na visita que as
            condições de trabalho continuam as mesmas.
          </div>
        }
        blank={() => ({
          condominio_id: condo.id, doc_id: docs[0]?.id ?? null, risco_id: null, ghe_id: null, funcao_id: null, agente: '', tecnica: '',
          equipamento: '', data: null, resultado: '', limite: '', unidade: '', observacoes: '',
        })}
        render={(m) => {
          const res = num(m.resultado), lim = num(m.limite)
          const acima = res !== null && lim !== null ? res > lim : null
          const risco = riscos.find((r) => r.id === m.risco_id)
          return {
            title: <>{m.agente}{m.resultado && `: ${m.resultado}${m.unidade ? ' ' + m.unidade : ''}`} {acima !== null && <span className={'badge ' + (acima ? 'bad' : 'ok')}>{acima ? 'acima' : 'dentro'} do limite ({m.limite}{m.unidade ? ' ' + m.unidade : ''})</span>}</>,
            meta: [
              risco ? `Risco: ${risco.perigo}${risco.medicao ? ' — o risco já tem medição própria, que prevalece' : ' — entra no LTCAT'}` : 'Não ligada a um risco',
              m.tecnica, m.data && fmtDate(m.data), docNome(m.doc_id) && `Fonte: ${docNome(m.doc_id)}`,
            ].filter(Boolean).join(' · '),
          }
        }}
        onSave={(r) => {
          const risco = riscos.find((x) => x.id === r.risco_id)
          return saveMed.mutateAsync({
            ...r, doc_id: r.doc_id || null, risco_id: r.risco_id || null, data: r.data || null,
            ghe_id: risco?.ghe_id ?? null, funcao_id: risco?.funcao_id ?? null,
          })
        }}
        onRemove={(id) => removeMed.mutateAsync(id)}
      />
    </div>
  )
}
