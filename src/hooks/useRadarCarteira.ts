'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { priorizarRadar, type CadenceRow, type RadarItem } from '@/lib/ai/radar'

// "Ligar esta semana": clientes Esfriando + Em risco, priorizados por valor × atraso.
// Lê a view vw_client_rfm (migration 024) e anexa a(s) fábrica(s) de cada cliente.
export function useRadarCarteira(limite = 8) {
  const [itens, setItens]   = useState<RadarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const sb = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb.from('vw_client_rfm') as any).select('*')
      if (error || !data) { if (vivo) { setItens([]); setLoading(false) }; return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ord = await (sb.from('orders') as any)
        .select('client_id,suppliers(name)').neq('status', 'cancelado').limit(20000)
      const fabPorCliente = new Map<string, Set<string>>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const o of (ord.data ?? []) as any[]) {
        const nome = o.suppliers?.name
        if (!o.client_id || !nome) continue
        if (!fabPorCliente.has(o.client_id)) fabPorCliente.set(o.client_id, new Set())
        fabPorCliente.get(o.client_id)!.add(nome)
      }

      const rows: CadenceRow[] = (data as CadenceRow[]).map(r => ({
        ...r, fabricas: [...(fabPorCliente.get(r.client_id ?? '') ?? [])],
      }))
      const prioritarios = priorizarRadar(rows, { segmentos: ['esfriando', 'em_risco'], limite })
      if (vivo) { setItens(prioritarios); setLoading(false) }
    })()
    return () => { vivo = false }
  }, [limite])

  return { itens, loading }
}
