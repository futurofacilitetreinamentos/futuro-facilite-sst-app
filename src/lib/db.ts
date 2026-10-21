import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PHOTO_BUCKET, must, supabase } from './supabase'
import type {
  Agendamento, Condominio, DocRevisao, DrpsResposta, Epi, Equipe, Funcao, Ghe, Inspecao, Profile, Risco, Setor,
} from './types'

// Tabelas filhas de um condomínio, todas com a coluna condominio_id
export type ChildTable =
  | 'setores' | 'funcoes' | 'riscos' | 'agendamentos' | 'inspecoes' | 'drps_respostas' | 'doc_revisoes' | 'epis'

type ChildRow = {
  setores: Setor
  funcoes: Funcao
  riscos: Risco
  agendamentos: Agendamento
  inspecoes: Inspecao
  drps_respostas: DrpsResposta
  doc_revisoes: DocRevisao
  epis: Epi
}

const ORDER: Record<ChildTable, { column: string; ascending: boolean }> = {
  setores: { column: 'created_at', ascending: true },
  funcoes: { column: 'created_at', ascending: true },
  riscos: { column: 'created_at', ascending: true },
  agendamentos: { column: 'data', ascending: false },
  inspecoes: { column: 'created_at', ascending: false },
  drps_respostas: { column: 'created_at', ascending: true },
  doc_revisoes: { column: 'created_at', ascending: true },
  epis: { column: 'created_at', ascending: true },
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export function useCondominios() {
  return useQuery({
    queryKey: ['condominios'],
    queryFn: async () =>
      must(await supabase.from('condominios').select('*').order('razao_social')) as Condominio[],
  })
}

export function useEquipe() {
  return useQuery({
    queryKey: ['equipe'],
    queryFn: async () => must(await supabase.from('equipe').select('*').order('nome')) as Equipe[],
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => must(await supabase.from('profiles').select('*').order('nome')) as Profile[],
  })
}

export function useChildren<T extends ChildTable>(table: T, condoId: string | null | undefined) {
  return useQuery({
    queryKey: [table, condoId],
    enabled: Boolean(condoId),
    queryFn: async () => {
      const o = ORDER[table]
      const res = await supabase.from(table).select('*').eq('condominio_id', condoId!).order(o.column, { ascending: o.ascending })
      return must(res) as ChildRow[T][]
    },
  })
}

export function useGhes(condoId: string | null | undefined) {
  return useQuery({
    queryKey: ['ghes', condoId],
    enabled: Boolean(condoId),
    queryFn: async () => {
      const rows = must(
        await supabase.from('ghes').select('*, ghe_funcoes(funcao_id)').eq('condominio_id', condoId!).order('created_at'),
      ) as (Omit<Ghe, 'funcao_ids'> & { ghe_funcoes: { funcao_id: string }[] })[]
      return rows.map(({ ghe_funcoes, ...g }) => ({ ...g, funcao_ids: ghe_funcoes.map((x) => x.funcao_id) })) as Ghe[]
    },
  })
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

type AnyTable = ChildTable | 'condominios' | 'equipe' | 'profiles'

/** Insere (sem id) ou atualiza (com id) uma linha e invalida o cache da tabela. */
export function useSave<R extends { id?: string }>(table: AnyTable) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: R) => {
      const { id, ...fields } = row
      const rest = fields as Record<string, unknown>
      const q = id
        ? supabase.from(table).update(rest).eq('id', id).select().single()
        : supabase.from(table).insert(rest).select().single()
      return must(await q) as R & { id: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  })
}

export function useRemove(table: AnyTable | 'ghes') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      must(await supabase.from(table).delete().eq('id', id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  })
}

export function useSaveGhe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (g: Partial<Ghe> & { condominio_id: string; nome: string }) => {
      const { id, funcao_ids = [], ...rest } = g
      const saved = must(
        await (id
          ? supabase.from('ghes').update(rest).eq('id', id).select().single()
          : supabase.from('ghes').insert(rest).select().single()),
      ) as { id: string }
      must(await supabase.from('ghe_funcoes').delete().eq('ghe_id', saved.id))
      if (funcao_ids.length) {
        must(await supabase.from('ghe_funcoes').insert(funcao_ids.map((funcao_id) => ({ ghe_id: saved.id, funcao_id }))))
      }
      return saved
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ghes'] }),
  })
}

// ---------------------------------------------------------------------------
// Fotos (bucket privado; exibidas por URL assinada)
// ---------------------------------------------------------------------------

/** Reduz a imagem para no máximo `max` px no maior lado, em JPEG. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar imagem'))), 'image/jpeg', quality),
  )
}

export async function uploadPhoto(condoId: string, file: Blob): Promise<string> {
  const path = `${condoId}/${crypto.randomUUID()}.jpg`
  must(await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: 'image/jpeg' }))
  return path
}

export async function removePhotos(paths: string[]) {
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
}

/** Gera URLs assinadas (válidas por 2 h) para uma lista de caminhos. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))]
  if (!unique.length) return {}
  const res = must(await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, 7200))
  const out: Record<string, string> = {}
  for (const r of res) if (r.path && r.signedUrl) out[r.path] = r.signedUrl
  return out
}

export function usePhotoUrls(paths: string[]) {
  const key = [...new Set(paths)].sort().join('|')
  return useQuery({
    queryKey: ['photo-urls', key],
    enabled: key.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: () => signedUrls(paths),
  })
}
