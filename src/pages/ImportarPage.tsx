import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorBox, PanelHead } from '../components/ui'
import { compressImage, uploadPhoto } from '../lib/db'
import { must, supabase } from '../lib/supabase'
import { GRUPOS_RISCO, STATUS_RISCO, type ChecklistItem, type Equipe } from '../lib/types'
import type { LegacyEquipe, LegacyInspection, LegacyProject } from '../reports/types'

// Comando colado no console (F12) do sistema antigo para baixar o backup
const EXPORT_SNIPPET = `(()=>{const k=['ff_sst_v8_projects','ff_sst_v7_reports','ff_sst_v8_drps','ff_sst_v8_equipe'];const o={};k.forEach(x=>o[x]=JSON.parse(localStorage.getItem(x)||'[]'));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));a.download='backup-sst-v8.json';a.click()})()`

interface LegacyDrps { token?: string; condominioId?: string; funcao?: string; setor?: string; answers?: Record<string, number>; ts?: string }

interface Backup {
  ff_sst_v8_projects?: LegacyProject[]
  ff_sst_v7_reports?: LegacyInspection[]
  ff_sst_v8_drps?: LegacyDrps[]
  ff_sst_v8_equipe?: LegacyEquipe[]
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase()
const dateOrNull = (v: unknown) => (/^\d{4}-\d{2}-\d{2}/.test(String(v ?? '')) ? String(v).slice(0, 10) : null)
const clamp15 = (v: unknown) => Math.min(5, Math.max(1, Math.round(Number(v)) || 1))
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  list.find((x) => norm(x) === norm(v)) ?? fallback

async function dataUrlToPath(condoId: string, src: string | undefined): Promise<string | null> {
  if (!src || !src.startsWith('data:')) return null
  const blob = await (await fetch(src)).blob()
  return uploadPhoto(condoId, await compressImage(blob as File))
}

export default function ImportarPage() {
  const qc = useQueryClient()
  const [backup, setBackup] = useState<Backup | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const say = (m: string) => setLog((l) => [...l, m])

  async function load(f: File | undefined) {
    setError(null); setLog([])
    if (!f) return
    try {
      const b = JSON.parse(await f.text()) as Backup
      setBackup(b)
      setSelected(new Set((b.ff_sst_v8_projects ?? []).map((p) => p.id)))
    } catch (e) {
      setError('Arquivo inválido: ' + (e instanceof Error ? e.message : e))
    }
  }

  async function run() {
    if (!backup) return
    setBusy(true); setError(null); setLog([])
    try {
      // 1) Equipe técnica: reaproveita quem já existe (mesmo tipo + nome)
      const existing = must(await supabase.from('equipe').select('*')) as Equipe[]
      const equipeMap = new Map<string, string>()
      for (const m of backup.ff_sst_v8_equipe ?? []) {
        const found = existing.find((e) => e.tipo === m.tipo && norm(e.nome) === norm(m.nome))
        if (found) { equipeMap.set(m.id, found.id); continue }
        const tipo = (['sst', 'medico', 'engenheiro'] as const).find((t) => t === m.tipo) ?? 'sst'
        const row = must(await supabase.from('equipe').insert({
          tipo, nome: m.nome, funcao: m.funcao ?? '', registro: m.registro ?? '', rqe: m.rqe ?? '',
          telefone: m.telefone ?? '', email: m.email ?? '',
        }).select().single()) as Equipe
        equipeMap.set(m.id, row.id)
        existing.push(row)
      }
      say(`Equipe técnica: ${equipeMap.size} profissional(is) vinculados.`)
      const equipeByName = (tipo: string, nome?: string) =>
        existing.find((e) => e.tipo === tipo && nome && norm(e.nome) === norm(nome))?.id ?? null

      // 2) Condomínios e cadastros técnicos
      const condoMap = new Map<string, string>() // legacy id -> novo id
      const tokenMap = new Map<string, string>()
      const nameMap = new Map<string, string>()
      for (const p of backup.ff_sst_v8_projects ?? []) {
        if (!selected.has(p.id)) continue
        const e = p.empresa ?? {}
        const dup = must(await supabase.from('condominios').select('id').eq('legacy_id', p.id).maybeSingle()) as { id: string } | null
        if (dup) {
          say(`• ${e.razaoSocial}: já importado antes, ignorado.`)
          condoMap.set(p.id, dup.id)
          if (p.drpsToken) tokenMap.set(p.drpsToken, dup.id)
          continue
        }
        const condo = must(await supabase.from('condominios').insert({
          legacy_id: p.id,
          razao_social: e.razaoSocial || e.nomeFantasia || 'Condomínio sem nome',
          nome_fantasia: e.nomeFantasia ?? '', cnpj: e.cnpj ?? '', cnae: e.cnae ?? '', grau_risco: e.grauRisco ?? '',
          num_trabalhadores: e.numTrabalhadores ? Number(e.numTrabalhadores) || null : null,
          endereco: e.endereco ?? '', responsavel_empresa: e.responsavelEmpresa ?? '', contato_empresa: e.contatoEmpresa ?? '',
          email_empresa: e.emailEmpresa ?? '', data_elaboracao: dateOrNull(e.dataElaboracao), atividade_empresa: e.atividadeEmpresa ?? '',
          resp_sst_id: (e.respSstId && equipeMap.get(e.respSstId)) || equipeByName('sst', e.respSst),
          medico_id: (e.medicoId && equipeMap.get(e.medicoId)) || equipeByName('medico', e.medicoTrabalho),
          engenheiro_id: (e.engId && equipeMap.get(e.engId)) || equipeByName('engenheiro', e.engSeguranca),
        }).select().single()) as { id: string }
        const cid = condo.id
        condoMap.set(p.id, cid)
        if (p.drpsToken) tokenMap.set(p.drpsToken, cid)
        nameMap.set(norm(e.razaoSocial), cid)

        const setores = (p.setores ?? []).filter((x) => x.nome)
        const setorRows = setores.length
          ? must(await supabase.from('setores').insert(setores.map((x) => ({
              condominio_id: cid, nome: x.nome, ambiente: x.ambiente ?? '', descricao: x.descricao ?? '',
            }))).select()) as { id: string; nome: string }[]
          : []
        const setorId = (n?: string) => setorRows.find((x) => norm(x.nome) === norm(n))?.id ?? null

        const funcoes = (p.funcoes ?? []).filter((x) => x.nome)
        const funcaoRows = funcoes.length
          ? must(await supabase.from('funcoes').insert(funcoes.map((x) => ({
              condominio_id: cid, nome: x.nome, setor_id: setorId(x.setor), quantidade: Number(x.quantidade) || 0,
              cbo: x.cbo ?? '', atividades: x.atividades ?? '',
            }))).select()) as { id: string; nome: string }[]
          : []
        const funcaoId = (n?: string) => funcaoRows.find((x) => norm(x.nome) === norm(n))?.id ?? null

        const gheRows: { id: string; nome: string }[] = []
        for (const g of (p.ghe ?? []).filter((x) => x.nome)) {
          const row = must(await supabase.from('ghes').insert({
            condominio_id: cid, nome: g.nome, setor_id: setorId(g.setor), descricao: g.descricao ?? '',
          }).select().single()) as { id: string; nome: string }
          gheRows.push(row)
          const ids = (g.funcoes ?? '').split(/[,;\n]/).map(funcaoId).filter(Boolean) as string[]
          if (ids.length) must(await supabase.from('ghe_funcoes').insert([...new Set(ids)].map((funcao_id) => ({ ghe_id: row.id, funcao_id }))))
        }
        const gheId = (n?: string) => gheRows.find((x) => norm(x.nome) === norm(n))?.id ?? null

        const riscos = p.riscos ?? []
        if (riscos.length) must(await supabase.from('riscos').insert(riscos.map((r) => ({
          condominio_id: cid, ghe_id: gheId(r.ghe), funcao_id: funcaoId(r.funcao),
          grupo: pick(r.grupo, GRUPOS_RISCO, 'Acidente'), perigo: r.perigo ?? '', fonte: r.fonte ?? '', dano: r.dano ?? '',
          controles: r.controles ?? '', prob: clamp15(r.prob), sev: clamp15(r.sev), acao: r.acao ?? '',
          responsavel: r.responsavel ?? '', prazo: dateOrNull(r.prazo), status: pick(r.status, STATUS_RISCO, 'Pendente'),
        }))))

        const agenda = (p.agenda ?? []).filter((a) => dateOrNull(a.data))
        if (agenda.length) must(await supabase.from('agendamentos').insert(agenda.map((a) => ({
          condominio_id: cid, data: dateOrNull(a.data), hora: a.hora || null, tecnico: a.tecnico ?? '', obs: a.obs ?? '',
          status: pick(a.status, ['agendada', 'realizada', 'cancelada'] as const, 'agendada'),
        }))))
        say(`• ${e.razaoSocial}: ${setores.length} setores, ${funcoes.length} funções, ${gheRows.length} GHE, ${riscos.length} riscos, ${agenda.length} agendamentos.`)
      }

      // 3) Inspeções (fotos vão para o armazenamento)
      let nInsp = 0
      for (const i of backup.ff_sst_v7_reports ?? []) {
        const cid = (i.condominioId && condoMap.get(i.condominioId)) || nameMap.get(norm(i.condominio))
        if (!cid) continue
        if (i.numero) {
          const dup = must(await supabase.from('inspecoes').select('id').eq('numero', i.numero).maybeSingle())
          if (dup) { say(`• Inspeção ${i.numero}: já existe, ignorada.`); continue }
        }
        const checklist: Record<string, ChecklistItem> = {}
        for (const [k, it] of Object.entries(i.checklist ?? {})) {
          const photos: string[] = []
          for (const ph of it.photos ?? []) { const path = await dataUrlToPath(cid, ph); if (path) photos.push(path) }
          checklist[k] = {
            titulo: it.titulo ?? '', status: pick(it.status, ['Pendente', 'Conforme', 'Não conforme', 'Não se aplica'] as const, 'Pendente'),
            obs: it.obs ?? '', acao: it.acao ?? '', risco: pick(it.risco, ['', 'Baixo', 'Médio', 'Alto', 'Crítico'] as const, ''),
            prazo: it.prazo ?? '', responsavel: it.responsavel ?? '', photos,
          }
        }
        must(await supabase.from('inspecoes').insert({
          numero: i.numero || null, condominio_id: cid, data_visita: dateOrNull(i.dataVisita) ?? new Date().toISOString().slice(0, 10),
          tecnico: i.tecnico ?? '', objetivo: i.objetivo ?? '', total_empregados: i.totalEmpregados ?? '', proprios: i.proprios ?? '',
          terceirizados: i.terceirizados ?? '', funcoes: i.funcoes ?? '', jornadas: i.jornadas ?? '', conclusao: i.conclusao ?? '',
          recomendacoes: i.recomendacoes ?? '', assinatura_sindica: i.assinaturaSindica ?? '', assinatura_tecnico: i.assinaturaTecnico ?? '',
          foto_capa: await dataUrlToPath(cid, i.fotoCapa), checklist,
        }))
        nInsp++
        say(`• Inspeção ${i.numero ?? '(sem número)'} importada.`)
      }

      // 4) Respostas DRPS (descarta as de demonstração, que usavam escala 0–4)
      let nDrps = 0, skipped = 0
      const drpsRows = []
      for (const d of backup.ff_sst_v8_drps ?? []) {
        const cid = (d.token && tokenMap.get(d.token)) || (d.condominioId && condoMap.get(d.condominioId))
        if (!cid || !d.answers) continue
        const vals = Object.values(d.answers).map(Number)
        if (vals.length < 50 || vals.some((v) => !(v >= 1 && v <= 5))) { skipped++; continue }
        drpsRows.push({ condominio_id: cid, funcao: d.funcao ?? '', setor: d.setor ?? '', answers: d.answers, created_at: d.ts ?? undefined })
        nDrps++
      }
      if (drpsRows.length) must(await supabase.from('drps_respostas').insert(drpsRows))
      say(`Inspeções: ${nInsp}. Respostas DRPS: ${nDrps}${skipped ? ` (${skipped} de demonstração/incompletas descartadas)` : ''}.`)
      say('Importação concluída.')
      await qc.invalidateQueries()
    } catch (e) {
      setError(e)
      say('Importação interrompida. O que já foi gravado permanece; rodar de novo ignora os condomínios já importados.')
    } finally {
      setBusy(false)
    }
  }

  const projects = backup?.ff_sst_v8_projects ?? []
  return (
    <div className="view">
      <section className="panel">
        <PanelHead eyebrow="MIGRAÇÃO" title="Importar dados da V8 (navegador)" />
        <ol style={{ fontSize: 13, lineHeight: 1.7 }}>
          <li>Abra o sistema antigo (V8) no mesmo navegador/aparelho onde os dados foram salvos.</li>
          <li>Pressione <b>F12</b>, vá na aba <b>Console</b>, cole o comando abaixo e tecle Enter. Um arquivo <code>backup-sst-v8.json</code> será baixado.</li>
          <li>Selecione esse arquivo aqui embaixo, revise e clique em Importar.</li>
        </ol>
        <div className="code">{EXPORT_SNIPPET}</div>
        <button className="outline small" style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(EXPORT_SNIPPET)}>Copiar comando</button>
      </section>

      <section className="panel">
        <PanelHead eyebrow="ARQUIVO" title="Backup">
          <button className="primary" disabled={!backup || busy || selected.size === 0} onClick={run}>{busy ? 'Importando…' : 'Importar'}</button>
        </PanelHead>
        <input type="file" accept="application/json,.json" onChange={(e) => load(e.target.files?.[0])} />
        <ErrorBox error={error} />
        {backup && (
          <>
            <p className="entity-meta">
              {projects.length} condomínio(s), {backup.ff_sst_v7_reports?.length ?? 0} inspeção(ões),{' '}
              {backup.ff_sst_v8_drps?.length ?? 0} resposta(s) DRPS, {backup.ff_sst_v8_equipe?.length ?? 0} profissional(is).
              Desmarque condomínios de teste/demonstração.
            </p>
            <div className="check-list">
              {projects.map((p) => (
                <label key={p.id}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => {
                    const s = new Set(selected)
                    if (e.target.checked) s.add(p.id); else s.delete(p.id)
                    setSelected(s)
                  }} />
                  {p.empresa?.razaoSocial || p.empresa?.nomeFantasia || p.id}
                </label>
              ))}
            </div>
          </>
        )}
        {log.length > 0 && <div className="code" style={{ marginTop: 12 }}>{log.join('\n')}</div>}
      </section>
    </div>
  )
}
