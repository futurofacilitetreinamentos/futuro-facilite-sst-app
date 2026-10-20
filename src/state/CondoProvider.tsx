import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useCondominios } from '../lib/db'
import type { Condominio } from '../lib/types'

const KEY = 'ff_sst_condo_ativo'

interface CondoState {
  condos: Condominio[]
  loading: boolean
  condo: Condominio | null
  setCondoId: (id: string | null) => void
}

const Ctx = createContext<CondoState | null>(null)

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function CondoProvider({ children }: { children: ReactNode }) {
  const { data: condos = [], isLoading } = useCondominios()
  const [condoId, setId] = useState<string | null>(readStored)

  const setCondoId = (id: string | null) => {
    setId(id)
    try {
      if (id) localStorage.setItem(KEY, id)
      else localStorage.removeItem(KEY)
    } catch {
      /* armazenamento indisponível: só não lembra a escolha */
    }
  }

  // Se o condomínio lembrado sumiu, cai para o primeiro da lista.
  useEffect(() => {
    if (isLoading) return
    if (condoId && condos.some((c) => c.id === condoId)) return
    setCondoId(condos[0]?.id ?? null)
  }, [condos, condoId, isLoading])

  const condo = condos.find((c) => c.id === condoId) ?? null
  return <Ctx.Provider value={{ condos, loading: isLoading, condo, setCondoId }}>{children}</Ctx.Provider>
}

export function useCondo() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCondo fora do CondoProvider')
  return v
}
