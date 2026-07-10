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

      // Fábricas por cliente agregadas no banco (vw_client_fabricas) — sem cap de 1000
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fab = await (sb.from('vw_client_fabricas') as any).select('client_id,fabricas')
      const fabPorCliente = new Map<string, string[]>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of (fab.data ?? []) as any[]) {
        if (f.client_id) fabPorCliente.set(f.client_id, f.fabricas ?? [])
      }

      const rows: CadenceRow[] = (data as CadenceRow[]).map(r => ({
        ...r, fabricas: fabPorCliente.get(r.client_id ?? '') ?? [],
      }))
      const prioritarios = priorizarRadar(rows, { segmentos: ['esfriando', 'em_risco'], limite })
      if (vivo) { setItens(prioritarios); setLoading(false) }
    })()
    return () => { vivo = false }
  }, [limite])

  return { itens, loading }
}
