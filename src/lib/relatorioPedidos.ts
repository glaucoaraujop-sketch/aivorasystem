import { createClient } from '@/lib/supabase/client'
import type { OrderStatus } from '@/types/database'
import { nomeEmpresaCliente } from '@/lib/nomeCliente'

// Base de data do relatório: quando o pedido foi emitido vs. quando foi faturado.
export type BaseData = 'emissao' | 'faturamento'

export interface FiltroRelatorio {
  de: string           // YYYY-MM-DD (inclusive)
  ate: string          // YYYY-MM-DD (inclusive)
  base: BaseData
  status: OrderStatus | ''  // '' = todos
  supplierId: string        // '' = todas as fábricas
  lojaId: string            // '' = todas as lojas (PDV)
  clienteId: string         // '' = todos os clientes (seleção exata)
  finalidade: string        // '' = todas | 'venda' | 'mostruario'
}

export interface LinhaRelatorio {
  number: string | null
  status: OrderStatus
  total: number
  data_emissao: string | null
  created_at: string
  delivery_date: string | null
  delivered_at: string | null
  cliente: string
  loja: string | null
  fabrica: string
}

const SEL =
  'number, status, total, finalidade, data_emissao, created_at, delivery_date, delivered_at, clients(name, company_name, razao_social), suppliers(name), client_lojas(nome)'

// Data que representa a linha conforme a base escolhida.
export function dataDaLinha(l: LinhaRelatorio, base: BaseData): string | null {
  if (base === 'faturamento') return l.delivered_at
  return l.data_emissao ?? l.created_at
}

// Busca TODOS os pedidos do período (pagina de 1000 em 1000 pra furar o cap do PostgREST).
export async function buscarPedidosRelatorio(f: FiltroRelatorio): Promise<LinhaRelatorio[]> {
  const supabase = createClient()
  const rows: LinhaRelatorio[] = []
  const pageSize = 1000
  let from = 0

  for (;;) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('orders') as any).select(SEL)

    if (f.base === 'faturamento') {
      q = q
        .gte('delivered_at', `${f.de}T00:00:00`)
        .lte('delivered_at', `${f.ate}T23:59:59`)
        .order('delivered_at', { ascending: true })
    } else {
      q = q
        .gte('data_emissao', f.de)
        .lte('data_emissao', f.ate)
        .order('data_emissao', { ascending: true })
    }
    if (f.status) q = q.eq('status', f.status)
    if (f.supplierId) q = q.eq('supplier_id', f.supplierId)
    if (f.lojaId) q = q.eq('loja_id', f.lojaId)
    if (f.finalidade) q = q.eq('finalidade', f.finalidade)
    if (f.clienteId) q = q.eq('client_id', f.clienteId)

    q = q.range(from, from + pageSize - 1)

    const { data, error } = await q
    if (error) throw new Error(error.message)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch = (data ?? []) as any[]
    for (const o of batch) {
      rows.push({
        number: o.number,
        status: o.status,
        total: Number(o.total) || 0,
        data_emissao: o.data_emissao,
        created_at: o.created_at,
        delivery_date: o.delivery_date,
        delivered_at: o.delivered_at,
        cliente: nomeEmpresaCliente(o.clients),
        loja: o.client_lojas?.nome ?? null,
        fabrica: o.suppliers?.name || '—',
      })
    }
    if (batch.length < pageSize) break
    from += pageSize
  }
  return rows
}
