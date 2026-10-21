import { useQueryClient } from '@tanstack/react-query'
import { CrudSection } from '../components/CrudSection'
import type { FieldDef } from '../components/ui'
import { useEquipe, useRemove } from '../lib/db'
import { docsDoTipo, DOCS_ASSINATURA } from '../lib/signatarios'
import { must, supabase } from '../lib/supabase'
import type { Equipe, EquipeTipo } from '../lib/types'

type Row = Omit<Equipe, 'id'> & { id?: string }

const GROUPS: { tipo: EquipeTipo; title: string; singular: string; reg: string }[] = [
  { tipo: 'sst', title: 'Segurança do trabalho', singular: 'Profissional SST', reg: 'Nº do registro MTE' },
  { tipo: 'medico', title: 'Médicos do trabalho', singular: 'Médico', reg: 'CRM' },
  { tipo: 'engenheiro', title: 'Engenheiros de segurança', singular: 'Engenheiro', reg: 'CREA' },
]

const docLabel = (doc: string) => DOCS_ASSINATURA.find((d) => d.doc === doc)?.label ?? doc

export default function EquipePage() {
  const { data = [] } = useEquipe()
  const remove = useRemove('equipe')
  const qc = useQueryClient()

  /** Salva o profissional; cada documento tem um único padrão, então tira a marca de quem tinha antes. */
  async function salvar(r: Row) {
    const { id, ...campos } = r
    const padrao = (campos.padrao ?? []).filter((doc) => docsDoTipo(campos.tipo).some((d) => d.doc === doc))
    const saved = must(await (id
      ? supabase.from('equipe').update({ ...campos, padrao }).eq('id', id).select().single()
      : supabase.from('equipe').insert({ ...campos, padrao }).select().single())) as Equipe
    for (const outro of data) {
      if (outro.id === saved.id) continue
      const resto = (outro.padrao ?? []).filter((doc) => !padrao.includes(doc))
      if (resto.length !== (outro.padrao ?? []).length) {
        must(await supabase.from('equipe').update({ padrao: resto }).eq('id', outro.id))
      }
    }
    await qc.invalidateQueries({ queryKey: ['equipe'] })
  }

  return (
    <div className="view">
      <div className="notice">
        Marque em cada profissional os documentos que ele assina <b>por padrão</b>. No cadastro de cada condomínio você pode
        escolher outra pessoa para um documento específico; se não escolher, vale o padrão.
      </div>
      {GROUPS.map((g) => {
        const fields: FieldDef<Row>[] = [
          { key: 'nome', label: 'Nome *', required: true, span: true },
          { key: 'funcao', label: 'Função (como sai no documento)' },
          { key: 'registro', label: g.reg },
          ...(g.tipo === 'medico' ? [{ key: 'rqe', label: 'RQE' } as FieldDef<Row>] : []),
          { key: 'telefone', label: 'Telefone' },
          { key: 'email', label: 'E-mail', type: 'email' },
        ]
        return (
          <CrudSection<Row>
            key={g.tipo}
            eyebrow="EQUIPE TÉCNICA"
            title={g.title}
            singular={g.singular}
            rows={data.filter((m) => m.tipo === g.tipo)}
            fields={fields}
            blank={() => ({ tipo: g.tipo, nome: '', funcao: '', registro: '', rqe: '', telefone: '', email: '', padrao: [] })}
            render={(m) => ({
              title: m.nome,
              meta: (
                <>
                  {[m.funcao, m.registro && `${g.reg} ${m.registro}`, m.rqe && `RQE ${m.rqe}`, m.telefone, m.email].filter(Boolean).join(' · ')}
                  {(m.padrao ?? []).length > 0 && (
                    <span className="padrao-tags">
                      {(m.padrao ?? []).map((doc) => <span key={doc} className="badge ok">Padrão: {docLabel(doc)}</span>)}
                    </span>
                  )}
                </>
              ),
            })}
            extraForm={(row, set) => (
              <div className="span2">
                <label>Assina por padrão</label>
                <div className="check-list">
                  {docsDoTipo(g.tipo).map((d) => {
                    const atual = data.find((m) => m.id !== row.id && (m.padrao ?? []).includes(d.doc))
                    const marcado = (row.padrao ?? []).includes(d.doc)
                    return (
                      <label key={d.doc} title={atual && !marcado ? `Hoje o padrão é ${atual.nome}` : undefined}>
                        <input
                          type="checkbox" checked={marcado}
                          onChange={(e) => set({
                            padrao: e.target.checked ? [...(row.padrao ?? []), d.doc] : (row.padrao ?? []).filter((x) => x !== d.doc),
                          })}
                        />
                        <span>
                          {d.label}
                          {atual && !marcado && <small className="field-hint">hoje: {atual.nome}</small>}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            onSave={salvar}
            onRemove={(id) => remove.mutateAsync(id)}
          />
        )
      })}
    </div>
  )
}
