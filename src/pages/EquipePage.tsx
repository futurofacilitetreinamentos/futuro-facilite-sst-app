import { CrudSection } from '../components/CrudSection'
import type { FieldDef } from '../components/ui'
import { useEquipe, useRemove, useSave } from '../lib/db'
import type { Equipe, EquipeTipo } from '../lib/types'

type Row = Omit<Equipe, 'id'> & { id?: string }

const GROUPS: { tipo: EquipeTipo; title: string; singular: string; reg: string }[] = [
  { tipo: 'sst', title: 'Responsáveis SST', singular: 'Profissional SST', reg: 'Registro profissional' },
  { tipo: 'medico', title: 'Médicos do trabalho', singular: 'Médico', reg: 'CRM' },
  { tipo: 'engenheiro', title: 'Engenheiros de segurança', singular: 'Engenheiro', reg: 'CREA' },
]

export default function EquipePage() {
  const { data = [] } = useEquipe()
  const save = useSave<Row>('equipe')
  const remove = useRemove('equipe')

  return (
    <div className="view">
      {GROUPS.map((g) => {
        const fields: FieldDef<Row>[] = [
          { key: 'nome', label: 'Nome *', required: true, span: true },
          { key: 'funcao', label: 'Função / título' },
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
            blank={() => ({ tipo: g.tipo, nome: '', funcao: '', registro: '', rqe: '', telefone: '', email: '' })}
            render={(m) => ({
              title: m.nome,
              meta: [m.funcao, m.registro && `${g.reg} ${m.registro}`, m.rqe && `RQE ${m.rqe}`, m.telefone, m.email]
                .filter(Boolean).join(' · '),
            })}
            onSave={(r) => save.mutateAsync(r)}
            onRemove={(id) => remove.mutateAsync(id)}
          />
        )
      })}
    </div>
  )
}
