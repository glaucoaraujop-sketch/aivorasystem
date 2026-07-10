'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClienteQuente {
  client_id: string
  client_name: string | null
  company_name: string | null
  pedidos_28d: number
  valor_28d: number
  ultima_compra: string | null
  dias_desde_ultimo: number | null
  crescendo: boolean
}

// Clientes que mais compraram nas últimas 4 semanas (view vw_client_quentes).
export function useClientesQuentes(limite = 8) {
  const [itens, setItens]   = useState<ClienteQuente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const sb = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (sb.from('vw_client_quentes') as any)
        .select('*').order('valor_28d', { ascending: false }).limit(limite)
      if (!vivo) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItens((data ?? []).map((r: any) => ({
        ...r,
        pedidos_28d: Number(r.pedidos_28d) || 0,
        valor_28d: Number(r.valor_28d) || 0,
        dias_desde_ultimo: r.dias_desde_ultimo != null ? Number(r.dias_desde_ultimo) : null,
        crescendo: !!r.crescendo,
      })))
      setLoading(false)
    })()
    return () => { vivo = false }
  }, [limite])

  return { itens, loading }
}
