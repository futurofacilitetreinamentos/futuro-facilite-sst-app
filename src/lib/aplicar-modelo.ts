// Grava no condomínio as funções escolhidas da biblioteca padrão, com setores,
// GHEs, riscos e EPIs recomendados. Reaproveita o que já existe (mesmo nome) e
// nunca duplica: rodar de novo só acrescenta o que faltar.
import { BIBLIOTECA } from './biblioteca'
import type { BibFuncao } from './biblioteca-tipos'
import { must, supabase } from './supabase'

export interface EscolhaFuncao {
  funcao: BibFuncao
  quantidade: number
  cargaHoraria: string
}

export interface OpcoesModelo {
  criarGhe: boolean
  criarRiscos: boolean
  criarEpis: boolean
}

export interface ResultadoModelo {
  setores: number
  funcoes: number
  funcoesExistentes: number
  ghes: number
  riscos: number
  epis: number
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

export async function aplicarModelo(condoId: string, escolhas: EscolhaFuncao[], op: OpcoesModelo): Promise<ResultadoModelo> {
  const r: ResultadoModelo = { setores: 0, funcoes: 0, funcoesExistentes: 0, ghes: 0, riscos: 0, epis: 0 }
  if (!escolhas.length) return r

  const [setores, funcoes, ghes, riscos, epis] = await Promise.all([
    supabase.from('setores').select('id,nome').eq('condominio_id', condoId).then((x) => must(x) as { id: string; nome: string }[]),
    supabase.from('funcoes').select('id,nome').eq('condominio_id', condoId).then((x) => must(x) as { id: string; nome: string }[]),
    supabase.from('ghes').select('id,nome,numero,ghe_funcoes(funcao_id)').eq('condominio_id', condoId)
      .then((x) => must(x) as { id: string; nome: string; numero: number | null; ghe_funcoes: { funcao_id: string }[] }[]),
    supabase.from('riscos').select('perigo,funcao_id').eq('condominio_id', condoId).then((x) => must(x) as { perigo: string; funcao_id: string | null }[]),
    supabase.from('epis').select('nome,funcao_id').eq('condominio_id', condoId).then((x) => must(x) as { nome: string; funcao_id: string | null }[]),
  ])

  // 1) Setores
  const setorId = new Map<string, string>() // id da biblioteca -> id no banco
  for (const bibId of new Set(escolhas.map((e) => e.funcao.setor))) {
    const bs = BIBLIOTECA.setores.find((s) => s.id === bibId)
    if (!bs) continue
    const found = setores.find((s) => norm(s.nome) === norm(bs.nome))
    if (found) { setorId.set(bibId, found.id); continue }
    const row = must(await supabase.from('setores').insert({
      condominio_id: condoId, nome: bs.nome, ambiente: bs.ambiente, descricao: bs.descricao,
    }).select('id,nome').single()) as { id: string; nome: string }
    setores.push(row)
    setorId.set(bibId, row.id)
    r.setores++
  }

  // 2) Funções
  const funcaoId = new Map<string, string>() // id da biblioteca -> id no banco
  for (const e of escolhas) {
    const f = e.funcao
    const found = funcoes.find((x) => norm(x.nome) === norm(f.nome))
    if (found) { funcaoId.set(f.id, found.id); r.funcoesExistentes++; continue }
    const row = must(await supabase.from('funcoes').insert({
      condominio_id: condoId, setor_id: setorId.get(f.setor) ?? null, nome: f.nome, cbo: f.cbo,
      atividades: f.atividades, quantidade: Math.max(0, Math.round(e.quantidade) || 0), carga_horaria: e.cargaHoraria,
    }).select('id,nome').single()) as { id: string; nome: string }
    funcoes.push(row)
    funcaoId.set(f.id, row.id)
    r.funcoes++
  }

  // 3) GHEs (funções com o mesmo GHE sugerido ficam juntas)
  const gheDaFuncao = new Map<string, string>() // id da biblioteca da função -> id do GHE
  if (op.criarGhe) {
    let proximo = Math.max(0, ...ghes.map((g) => g.numero ?? 0)) + 1
    const grupos = new Map<string, EscolhaFuncao[]>()
    for (const e of escolhas) grupos.set(e.funcao.ghe, [...(grupos.get(e.funcao.ghe) ?? []), e])
    for (const [nome, membros] of grupos) {
      let ghe = ghes.find((g) => norm(g.nome) === norm(nome))
      if (!ghe) {
        const primeiro = membros[0].funcao
        const row = must(await supabase.from('ghes').insert({
          condominio_id: condoId, nome, numero: proximo++, setor_id: setorId.get(primeiro.setor) ?? null,
          descricao: `Trabalhadores com exposição semelhante: ${membros.map((m) => m.funcao.nome).join(', ')}.`,
        }).select('id,nome,numero').single()) as { id: string; nome: string; numero: number | null }
        ghe = { ...row, ghe_funcoes: [] }
        ghes.push(ghe)
        r.ghes++
      }
      const ligados = new Set(ghe.ghe_funcoes.map((x) => x.funcao_id))
      const novos = membros.map((m) => funcaoId.get(m.funcao.id)).filter((id): id is string => !!id && !ligados.has(id))
      if (novos.length) must(await supabase.from('ghe_funcoes').insert(novos.map((funcao_id) => ({ ghe_id: ghe!.id, funcao_id }))))
      for (const m of membros) gheDaFuncao.set(m.funcao.id, ghe.id)
    }
  }

  // 4) Riscos
  if (op.criarRiscos) {
    const linhas = escolhas.flatMap((e) => {
      const fid = funcaoId.get(e.funcao.id) ?? null
      return e.funcao.riscos
        .filter((b) => !riscos.some((x) => x.funcao_id === fid && norm(x.perigo) === norm(b.perigo)))
        .map((b) => ({
          condominio_id: condoId, funcao_id: fid, ghe_id: gheDaFuncao.get(e.funcao.id) ?? null,
          grupo: b.grupo, perigo: b.perigo, fonte: b.fonte, dano: b.dano, prob: b.prob, sev: b.sev,
          controles: '', controles_adm: b.controlesAdm, controles_epc: b.controlesEpc, controles_epi: b.controlesEpi,
          acao: b.acao, prioridade: b.prioridade ?? '', indicadores_saude: b.indicadoresSaude ?? '',
          cod_esocial: b.codEsocial ?? '', meio_propagacao: b.meioPropagacao ?? '', habitualidade: b.habitualidade ?? '',
          tecnica_analise: 'Qualitativa', responsavel: 'Administração do condomínio', status: 'Pendente',
        }))
    })
    if (linhas.length) must(await supabase.from('riscos').insert(linhas))
    r.riscos = linhas.length
  }

  // 5) EPIs recomendados
  if (op.criarEpis) {
    const linhas = escolhas.flatMap((e) => {
      const fid = funcaoId.get(e.funcao.id) ?? null
      return e.funcao.epis
        .filter((b) => !epis.some((x) => x.funcao_id === fid && norm(x.nome) === norm(b.nome)))
        .map((b) => ({
          condominio_id: condoId, funcao_id: fid, ghe_id: gheDaFuncao.get(e.funcao.id) ?? null,
          nome: b.nome, imagem: b.imagem ?? '', status: 'recomendado',
        }))
    })
    if (linhas.length) must(await supabase.from('epis').insert(linhas))
    r.epis = linhas.length
  }

  return r
}
