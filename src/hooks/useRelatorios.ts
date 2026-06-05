'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface KPIs {
  faturamentoMes: number
  faturamentoMesAnterior: number
  pedidosAbertos: number
  comissoesAReceber: number
  clientesAtivos: number
  orcamentosEnviados: number
  totalLojas: number
}

export interface VendasMes {
  mes: string       // "Jan", "Fev"...
  faturamento: number
  comissao: number
}

export interface TopCliente {
  client_id: string
  client_name: string
  company_name: string | null
  total_orders: number
  total_revenue: number
}

export interface PipelineItem {
  status: string
  count: number
  total_value: number
}

export interface ComissaoProxima {
  id: string
  value: number
  pct: number
  due_date: string
  status: string
  client_name: string
  order_number: string | null
}

export function useRelatorios() {
  const [kpis, setKpis]                   = useState<KPIs | null>(null)
  const [vendasMes, setVendasMes]         = useState<VendasMes[]>([])
  const [topClientes, setTopClientes]     = useState<TopCliente[]>([])
  const [pipeline, setPipeline]           = useState<PipelineItem[]>([])
  const [proximasComissoes, setProximasComissoes] = useState<ComissaoProxima[]>([])
  const [loading, setLoading]             = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)

      const agora = new Date()
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
      const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1).toISOString()
      const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0).toISOString()
      const seisAtras = new Date(agora.getFullYear(), agora.getMonth() - 5, 1).toISOString()

      const [
        { data: pedidosMes },
        { data: pedidosMesAnt },
        { data: pedidosAbertos },
        { data: comissoes },
        { data: clientes },
        { data: orcamentos },
        { data: pedidosSeis },
        { data: topCli },
        { data: proximasCom },
        { data: lojasData },
      ] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('orders') as any).select('total').gte('created_at', inicioMes).not('status', 'eq', 'cancelado'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('orders') as any).select('total').gte('created_at', inicioMesAnterior).lte('created_at', fimMesAnterior).not('status', 'eq', 'cancelado'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('orders') as any).select('id').not('status', 'in', '("entregue","cancelado")'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('commissions') as any).select('value').in('status', ['prevista','aprovada']),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('clients') as any).select('id').eq('active', true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('quotes') as any).select('id').eq('status', 'enviado'),
        // Vendas dos últimos 6 meses
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('orders') as any).select('total, commission_value, created_at').gte('created_at', seisAtras).not('status', 'eq', 'cancelado'),
        // Top clientes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('orders') as any).select('total, clients(id, name, company_name)').not('status', 'in', '("cancelado")').limit(100),
        // Próximas comissões
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('commissions') as any)
          .select('id, value, pct, due_date, status, orders(number, clients(name))')
          .in('status', ['prevista','aprovada'])
          .order('due_date', { ascending: true })
          .limit(5),
        // Total de pontos de venda: soma num_lojas de cada CNPJ dos clientes ativos do tipo loja
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('client_cnpjs') as any)
          .select('num_lojas, clients!inner(active, type)')
          .eq('clients.active', true)
          .eq('clients.type', 'loja'),
      ])

      // KPIs
      const fatMes = (pedidosMes ?? []).reduce((a: number, p: { total: number }) => a + p.total, 0)
      const fatMesAnt = (pedidosMesAnt ?? []).reduce((a: number, p: { total: number }) => a + p.total, 0)
      const totalLojas = (lojasData ?? []).reduce(
        (a: number, c: { num_lojas: number | null }) => a + (c.num_lojas ?? 1),
        0
      )

      setKpis({
        faturamentoMes:         fatMes,
        faturamentoMesAnterior: fatMesAnt,
        pedidosAbertos:         (pedidosAbertos ?? []).length,
        comissoesAReceber:      (comissoes ?? []).reduce((a: number, c: { value: number }) => a + c.value, 0),
        clientesAtivos:         (clientes ?? []).length,
        orcamentosEnviados:     (orcamentos ?? []).length,
        totalLojas,
      })

      // Vendas por mês (últimos 6 meses)
      const meses = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1)
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`, label: d.toLocaleString('pt-BR', { month: 'short' }) }
      })
      const vendasMap: Record<string, { faturamento: number; comissao: number }> = {}
      meses.forEach(m => { vendasMap[m.key] = { faturamento: 0, comissao: 0 } })
      ;(pedidosSeis ?? []).forEach((p: { total: number; commission_value: number | null; created_at: string }) => {
        const key = p.created_at.slice(0, 7)
        if (vendasMap[key]) {
          vendasMap[key].faturamento += p.total
          vendasMap[key].comissao += p.commission_value ?? 0
        }
      })
      setVendasMes(meses.map(m => ({ mes: m.label, ...vendasMap[m.key] })))

      // Top clientes (agrupa por cliente)
      const clienteMap: Record<string, TopCliente> = {}
      ;(topCli ?? []).forEach((o: { total: number; clients: { id: string; name: string; company_name: string | null } | null }) => {
        if (!o.clients) return
        const id = o.clients.id
        if (!clienteMap[id]) clienteMap[id] = { client_id: id, client_name: o.clients.name, company_name: o.clients.company_name, total_orders: 0, total_revenue: 0 }
        clienteMap[id].total_orders++
        clienteMap[id].total_revenue += o.total
      })
      setTopClientes(Object.values(clienteMap).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5))

      // Pipeline de orçamentos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: quotesAll } = await (supabase.from('quotes') as any).select('status, total')
      const pipeMap: Record<string, { count: number; total_value: number }> = {}
      ;(quotesAll ?? []).forEach((q: { status: string; total: number }) => {
        if (!pipeMap[q.status]) pipeMap[q.status] = { count: 0, total_value: 0 }
        pipeMap[q.status].count++
        pipeMap[q.status].total_value += q.total
      })
      setPipeline(Object.entries(pipeMap).map(([status, v]) => ({ status, ...v })))

      // Próximas comissões
      setProximasComissoes((proximasCom ?? []).map((c: {
        id: string; value: number; pct: number; due_date: string; status: string
        orders: { number: string | null; clients: { name: string } | null } | null
      }) => ({
        id: c.id, value: c.value, pct: c.pct, due_date: c.due_date, status: c.status,
        client_name: c.orders?.clients?.name ?? '—',
        order_number: c.orders?.number ?? null,
      })))

      setLoading(false)
    }
    load()
  }, [])

  return { kpis, vendasMes, topClientes, pipeline, proximasComissoes, loading }
}
