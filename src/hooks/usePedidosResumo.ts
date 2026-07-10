'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PedidosResumo {
  total_pedidos: number
  em_aberto: number
  total_vendas: number
  total_em_aberto: number
}

// KPIs da aba Pedidos agregados no BANCO (view vw_pedidos_resumo), para não
// depender de somar no navegador uma lista limitada a 1000 linhas.
export function usePedidosResumo(refreshKey?: unknown) {
  const [resumo, setResumo] = useState<PedidosResumo | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const sb = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (sb.from('vw_pedidos_resumo') as any).select('*').single()
      if (vivo && data) {
        setResumo({
          total_pedidos: Number(data.total_pedidos) || 0,
          em_aberto: Number(data.em_aberto) || 0,
          total_vendas: Number(data.total_vendas) || 0,
          total_em_aberto: Number(data.total_em_aberto) || 0,
        })
      }
    })()
    return () => { vivo = false }
  }, [refreshKey])

  return resumo
}
