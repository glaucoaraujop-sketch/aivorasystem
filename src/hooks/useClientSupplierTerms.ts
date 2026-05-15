'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClientSupplierTerm {
  id: string
  client_id: string
  supplier_id: string
  price_table: string | null
  discount_pct: number | null
  commercialization: string | null
}

export function useClientSupplierTerms(clientId: string) {
  const [terms, setTerms]   = useState<ClientSupplierTerm[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('client_supplier_terms') as any)
      .select('*')
      .eq('client_id', clientId)
    setTerms(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])
  return { terms, loading, refetch: fetch }
}

export function useClientSupplierTermsMutations() {
  const supabase = createClient()

  async function userId() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    return user.id
  }

  async function salvar(
    clientId: string,
    supplierId: string,
    fields: { price_table?: string | null; discount_pct?: number | null; commercialization?: string | null },
  ) {
    const uid = await userId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_supplier_terms') as any)
      .upsert(
        { user_id: uid, client_id: clientId, supplier_id: supplierId, ...fields },
        { onConflict: 'client_id,supplier_id' },
      )
    if (error) throw new Error(error.message)
  }

  return { salvar }
}
