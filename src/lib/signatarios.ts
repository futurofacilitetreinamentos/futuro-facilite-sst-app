// Quem assina cada documento de um condomínio.
// Ordem: escolha feita no cadastro do condomínio → padrão marcado na Equipe técnica
// → campos antigos (condomínios cadastrados antes da migração 0003).
import type { Condominio, Equipe, EquipeTipo } from './types'

export type DocAssinatura = 'pgr' | 'pgr_aux' | 'inspecao' | 'nr1' | 'pcmso' | 'ltcat'

type CampoCondo = 'resp_sst_id' | 'aux_sst_id' | 'inspecao_rt_id' | 'nr1_rt_id' | 'medico_id' | 'ltcat_rt_id'

export const DOCS_ASSINATURA: { doc: DocAssinatura; label: string; campo: CampoCondo; tipos: EquipeTipo[] }[] = [
  { doc: 'pgr', label: 'PGR — responsável técnico', campo: 'resp_sst_id', tipos: ['sst'] },
  { doc: 'pgr_aux', label: 'PGR — auxiliou na elaboração', campo: 'aux_sst_id', tipos: ['sst'] },
  { doc: 'inspecao', label: 'Relatório de inspeção', campo: 'inspecao_rt_id', tipos: ['sst'] },
  { doc: 'nr1', label: 'NR-1 / DRPS', campo: 'nr1_rt_id', tipos: ['sst'] },
  { doc: 'pcmso', label: 'PCMSO', campo: 'medico_id', tipos: ['medico'] },
  { doc: 'ltcat', label: 'LTCAT', campo: 'ltcat_rt_id', tipos: ['medico', 'engenheiro'] },
]

export const docInfo = (doc: DocAssinatura) => DOCS_ASSINATURA.find((d) => d.doc === doc)!

/** Documentos que cada tipo de profissional pode assinar (para marcar o padrão). */
export const docsDoTipo = (tipo: EquipeTipo) => DOCS_ASSINATURA.filter((d) => d.tipos.includes(tipo))

export const padraoDe = (doc: DocAssinatura, equipe: Equipe[]) =>
  equipe.find((m) => (m.padrao ?? []).includes(doc) && docInfo(doc).tipos.includes(m.tipo)) ?? null

export interface Signatario {
  membro: Equipe | null
  origem: 'condominio' | 'padrao' | 'anterior' | null
}

export function signatario(doc: DocAssinatura, condo: Partial<Condominio> | null | undefined, equipe: Equipe[]): Signatario {
  const info = docInfo(doc)
  const byId = (id: string | null | undefined) => (id ? equipe.find((m) => m.id === id) ?? null : null)

  const escolhido = byId(condo?.[info.campo] as string | null | undefined)
  if (escolhido) return { membro: escolhido, origem: 'condominio' }

  const padrao = padraoDe(doc, equipe)
  if (padrao) return { membro: padrao, origem: 'padrao' }

  // campos de antes da migração 0003
  let anterior: Equipe | null = null
  if (doc === 'inspecao' || doc === 'nr1') anterior = byId(condo?.resp_sst_id)
  if (doc === 'ltcat') anterior = condo?.ltcat_rt === 'medico' ? byId(condo?.medico_id) : byId(condo?.engenheiro_id)
  return anterior ? { membro: anterior, origem: 'anterior' } : { membro: null, origem: null }
}
