// Alertas de vencimento de um condomínio (ASO, treinamentos, CA de EPI, laudos, PGR, PCMSO).
// Função pura: recebe as linhas já carregadas e devolve a lista ordenada por gravidade.
// O hook que carrega os dados do condomínio ativo fica em components/AlertasPanel.tsx (useAlertas).
//
// Limiares:
//  - "vencido" (vermelho): prazo já passou; trabalhador ativo sem nenhum ASO = "sem admissional";
//  - "vencendo" (âmbar): faltam até 30 dias (JANELA_AVISO_DIAS);
//  - "info": falta dado para calcular (ex.: PGR sem data de elaboração / revisão).
//  - ASO: próximo periódico pela periodicidade do PCMSO da função (lib/periodicidade.ts).
//  - Treinamento: só o mais recente de cada trabalhador + NR (o renovado substitui o antigo);
//    trabalhadores desligados não geram alerta.
//  - CA de EPI: epis.validade_ca.
//  - Laudo anterior: docs_anteriores.validade, só o mais recente de cada tipo.
//  - PGR: revisão a cada 2 anos (NR-1 1.5.4.4.6) — data da última revisão "pgr" em doc_revisoes,
//    senão condominios.data_elaboracao.
//  - PCMSO: relatório analítico anual (NR-7 7.6.2) — última revisão "pcmso" em doc_revisoes,
//    senão condominios.data_elaboracao; > 12 meses = vencido.
import type { Aso, Condominio, DocAnterior, DocRevisao, Epi, Trabalhador, Treinamento } from './types'
import { TIPOS_DOC_ANTERIOR } from './types'
import { addMonths, desligado, hojeISO, JANELA_AVISO_DIAS, MESES_PADRAO, statusAso, statusValidade } from './periodicidade'

export type Severidade = 'vencido' | 'vencendo' | 'info'
export type CategoriaAlerta = 'aso' | 'treinamento' | 'epi' | 'laudo' | 'pgr' | 'pcmso'

export interface Alerta {
  id: string
  severidade: Severidade
  categoria: CategoriaAlerta
  titulo: string
  detalhe: string
  /** rota do app onde se resolve */
  to: string
  /** dias até o prazo (negativo = vencido) */
  dias: number | null
}

export interface AlertasInput {
  condo: Pick<Condominio, 'data_elaboracao'>
  trabalhadores?: Trabalhador[]
  asos?: Aso[]
  treinamentos?: Treinamento[]
  epis?: Epi[]
  docsAnteriores?: DocAnterior[]
  revisoes?: DocRevisao[]
  /** meses entre periódicos para o trabalhador (padrão 12) */
  mesesPeriodico?: (t: Trabalhador) => number
  hoje?: string
  janela?: number
}

export const SEVERIDADES: { value: Severidade; label: string; cls: 'bad' | 'warn' | '' }[] = [
  { value: 'vencido', label: 'Vencidos', cls: 'bad' },
  { value: 'vencendo', label: 'Vencendo', cls: 'warn' },
  { value: 'info', label: 'Informativos', cls: '' },
]

const ordemSev: Record<Severidade, number> = { vencido: 0, vencendo: 1, info: 2 }

const fmt = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Prazo de documento a partir de uma data-base + meses. */
function prazoDoc(base: string, meses: number, hoje: string, janela: number) {
  const ate = addMonths(base, meses)
  return { ate, st: statusValidade(ate, hoje, janela) }
}

const ultimaRevisao = (revs: DocRevisao[], doc: DocRevisao['documento']) =>
  revs.filter((r) => r.documento === doc && r.data).map((r) => r.data!.slice(0, 10)).sort().pop() ?? null

export function computeAlertas(input: AlertasInput): Alerta[] {
  const hoje = input.hoje ?? hojeISO()
  const janela = input.janela ?? JANELA_AVISO_DIAS
  const out: Alerta[] = []
  const trabs = input.trabalhadores ?? []
  const nomeTrab = new Map(trabs.map((t) => [t.id, t.nome]))
  const ativos = trabs.filter((t) => !desligado(t, hoje))
  const ativoIds = new Set(ativos.map((t) => t.id))

  // ASO
  for (const t of ativos) {
    const meses = input.mesesPeriodico?.(t) ?? MESES_PADRAO
    const st = statusAso(t, input.asos ?? [], meses, hoje, janela)
    if (st.key === 'sem_admissional') {
      out.push({
        id: `aso-adm-${t.id}`, severidade: 'vencido', categoria: 'aso', to: '/asos', dias: null,
        titulo: `${t.nome}: sem ASO admissional`,
        detalhe: t.data_admissao ? `Admitido(a) em ${fmt(t.data_admissao)} — registre o ASO admissional.` : 'Nenhum ASO registrado para este trabalhador.',
      })
    } else if (st.key === 'vencido' || st.key === 'vencendo') {
      out.push({
        id: `aso-${t.id}`, severidade: st.key, categoria: 'aso', to: '/asos', dias: st.dias,
        titulo: `${t.nome}: ASO periódico ${st.label}`,
        detalhe: `Previsto para ${fmt(st.proximo!)} (a cada ${st.meses} meses, pelo PCMSO).`,
      })
    }
  }

  // Treinamentos: o mais recente de cada trabalhador + NR
  const ultimos = new Map<string, Treinamento>()
  for (const tr of input.treinamentos ?? []) {
    if (!ativoIds.has(tr.trabalhador_id)) continue
    const k = `${tr.trabalhador_id}|${tr.nr || tr.titulo}`
    const prev = ultimos.get(k)
    if (!prev || (tr.data ?? '') > (prev.data ?? '')) ultimos.set(k, tr)
  }
  for (const tr of ultimos.values()) {
    const st = statusValidade(tr.validade, hoje, janela)
    if (st.key !== 'vencido' && st.key !== 'vencendo') continue
    const nome = [tr.nr !== 'outro' ? tr.nr : '', tr.titulo].filter(Boolean).join(' — ') || 'Treinamento'
    out.push({
      id: `tre-${tr.id}`, severidade: st.key, categoria: 'treinamento', to: '/treinamentos', dias: st.dias,
      titulo: `${nomeTrab.get(tr.trabalhador_id) ?? 'Trabalhador'}: ${nome} ${st.label}`,
      detalhe: `Validade ${fmt(tr.validade!)} — programe a reciclagem.`,
    })
  }

  // CA de EPI
  for (const e of input.epis ?? []) {
    const st = statusValidade(e.validade_ca, hoje, janela)
    if (st.key !== 'vencido' && st.key !== 'vencendo') continue
    out.push({
      id: `epi-${e.id}`, severidade: st.key, categoria: 'epi', to: '/epis', dias: st.dias,
      titulo: `CA do EPI ${e.nome}${e.ca ? ` (CA ${e.ca})` : ''} ${st.label}`,
      detalhe: `Validade do CA ${fmt(e.validade_ca!)} — confira no CAEPI e troque o EPI ou o fornecedor.`,
    })
  }

  // Laudos anteriores: o mais recente de cada tipo
  const porTipo = new Map<string, DocAnterior>()
  for (const d of input.docsAnteriores ?? []) {
    const prev = porTipo.get(d.tipo)
    if (!prev || (d.data_emissao ?? '') > (prev.data_emissao ?? '')) porTipo.set(d.tipo, d)
  }
  for (const d of porTipo.values()) {
    const st = statusValidade(d.validade, hoje, janela)
    if (st.key !== 'vencido' && st.key !== 'vencendo') continue
    const tipo = TIPOS_DOC_ANTERIOR.find((x) => x.value === d.tipo)?.label ?? d.tipo
    out.push({
      id: `ant-${d.id}`, severidade: st.key, categoria: 'laudo', to: '/anteriores', dias: st.dias,
      titulo: `Laudo anterior ${tipo}${d.empresa ? ` (${d.empresa})` : ''} ${st.label}`,
      detalhe: `Válido até ${fmt(d.validade!)} — o documento novo precisa estar emitido.`,
    })
  }

  // PGR (2 anos) e relatório analítico do PCMSO (12 meses)
  const revs = input.revisoes ?? []
  const elab = input.condo.data_elaboracao?.slice(0, 10) || null
  const docs: { cat: 'pgr' | 'pcmso'; meses: number; nome: string; acao: string }[] = [
    { cat: 'pgr', meses: 24, nome: 'PGR', acao: 'revisão do PGR (a cada 2 anos)' },
    { cat: 'pcmso', meses: 12, nome: 'PCMSO', acao: 'relatório analítico anual do PCMSO' },
  ]
  for (const d of docs) {
    const base = ultimaRevisao(revs, d.cat) ?? elab
    if (!base) {
      out.push({
        id: `${d.cat}-sem-data`, severidade: 'info', categoria: d.cat, to: '/condominio', dias: null,
        titulo: `${d.nome}: sem data de elaboração ou revisão`,
        detalhe: `Informe a data de elaboração do condomínio ou registre a revisão para acompanhar o prazo da ${d.acao}.`,
      })
      continue
    }
    const { ate, st } = prazoDoc(base, d.meses, hoje, janela)
    if (st.key !== 'vencido' && st.key !== 'vencendo') continue
    out.push({
      id: `${d.cat}-prazo`, severidade: st.key, categoria: d.cat, to: '/condominio', dias: st.dias,
      titulo: d.cat === 'pgr' ? `PGR: revisão ${st.label}` : `PCMSO: relatório analítico anual ${st.label}`,
      detalhe: `Última data ${fmt(base)}; prazo ${fmt(ate)}. Ao revisar, registre a revisão na tabela de revisões do condomínio.`,
    })
  }

  return out.sort((a, b) => ordemSev[a.severidade] - ordemSev[b.severidade] || (a.dias ?? -1e9) - (b.dias ?? -1e9) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
}

export function contarPorSeveridade(alertas: Alerta[]): Record<Severidade, number> {
  const c: Record<Severidade, number> = { vencido: 0, vencendo: 0, info: 0 }
  for (const a of alertas) c[a.severidade]++
  return c
}
