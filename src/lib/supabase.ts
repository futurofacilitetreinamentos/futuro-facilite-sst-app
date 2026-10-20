import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-key', {
  // PKCE devolve ?code= na URL, o que convive com o roteamento por hash (#/rota)
  auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' },
})

export const PHOTO_BUCKET = 'fotos'

/** Converte um erro do Supabase/PostgREST em mensagem legível. */
export function errMsg(e: unknown): string {
  if (!e) return ''
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  const m = (e as { message?: string }).message
  return m ?? JSON.stringify(e)
}

/** Lança se a resposta do Supabase tiver erro; devolve os dados. */
export function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw new Error(errMsg(res.error))
  return res.data as T
}
