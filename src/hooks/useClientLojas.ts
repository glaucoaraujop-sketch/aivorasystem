'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// PDV (loja física / filial) de um cliente. Ver migration 031/034.
export interface ClientLoja {
  id: string
  client_id: string
  nome: string
  apelidos: string[]            // códigos/prefixos da OC que identificam o PDV
  tipo: string                  // 'loja' | 'estoque'
  ativo: boolean
  prioridade: number | null     // 1=VIP 2=Ouro 3=Prata 4=Bronze
  endereco: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  whatsapp: string | null
  responsavel: string | null
  created_at: string
  // agregados (vw_lojas_resumo)
  pedidos: number
  faturamento: number
  dias_desde_ultima: number | null
}

export interface ClientLojaInput {
  nome: string
  tipo?: string
  apelidos?: string[]
  ativo?: boolean
  prioridade?: number | null
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  whatsapp?: string | null
  responsavel?: string | null
}

export function useClientLojas(clientId: string) {
  const [lojas, setLojas] = useState<ClientLoja[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [ls, rs] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('client_lojas') as any).select('*').eq('client_id', clientId).order('tipo').order('nome'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('vw_lojas_resumo') as any).select('loja_id,pedidos,faturamento,dias_desde_ultima').eq('client_id', clientId),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = new Map<string, any>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (rs.data ?? []) as any[]) stats.set(r.loja_id, r)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: ClientLoja[] = (ls.data ?? []).map((l: any) => ({
      ...l,
      apelidos: l.apelidos ?? [],
      pedidos: Number(stats.get(l.id)?.pedidos) || 0,
      faturamento: Number(stats.get(l.id)?.faturamento) || 0,
      dias_desde_ultima: stats.get(l.id)?.dias_desde_ultima ?? null,
    }))
    setLojas(merged)
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])
  return { lojas, loading, refetch: fetch }
}

export function useClientLojasMutations() {
  const supabase = createClient()

  async function criar(clientId: string, dados: ClientLojaInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('client_lojas') as any)
      .insert({ client_id: clientId, tipo: 'loja', ativo: true, ...dados }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function atualizar(id: string, dados: ClientLojaInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('client_lojas') as any)
      .update(dados).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  // Remove o PDV. Os pedidos ligados ficam com loja_id = null (FK ON DELETE SET NULL).
  async function remover(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_lojas') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Atribui manualmente um pedido a um PDV.
  async function atribuirPedido(orderId: string, lojaId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any).update({ loja_id: lojaId }).eq('id', orderId)
    if (error) throw new Error(error.message)
  }

  // Reroda a atribuição automática (código/nome da OC) nos pedidos sem loja do cliente.
  async function reatribuirAuto(clientId: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('fn_reatribuir_lojas', { p_client_id: clientId })
    if (error) throw new Error(error.message)
    return Number(data) || 0
  }

  return { criar, atualizar, remover, atribuirPedido, reatribuirAuto }
}

export interface PedidoSemLoja {
  id: string
  number: string | null
  oc: string | null
  total: number
  data: string | null
}

export function usePedidosSemLoja(clientId: string, reloadKey = 0) {
  const [pedidos, setPedidos] = useState<PedidoSemLoja[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count } = await (supabase.from('orders') as any)
      .select('id,number,purchase_order,ped_consultor,total,data_emissao,created_at', { count: 'exact' })
      .eq('client_id', clientId).is('loja_id', null).neq('status', 'cancelado')
      .order('data_emissao', { ascending: false, nullsFirst: false })
      .limit(300)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: PedidoSemLoja[] = (data ?? []).map((o: any) => ({
      id: o.id, number: o.number,
      oc: (o.purchase_order || o.ped_consultor || null),
      total: Number(o.total) || 0,
      data: o.data_emissao || (o.created_at ? String(o.created_at).slice(0, 10) : null),
    }))
    setPedidos(rows); setTotal(count ?? rows.length); setLoading(false)
  }, [clientId, reloadKey])

  useEffect(() => { fetch() }, [fetch])
  return { pedidos, total, loading, refetch: fetch }
}

export interface LojaRanking {
  loja_id: string
  cliente: string
  loja: string
  prioridade: number | null
  faturamento: number
  pedidos: number
  dias_desde_ultima: number | null
  cidade: string | null
  uf: string | null
  whatsapp: string | null
}

// Todos os PDVs (tipo loja) de todas as redes, para a lista de visita por classificação.
export function useLojasRanking() {
  const [lojas, setLojas] = useState<LojaRanking[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  useEffect(() => {
    let vivo = true
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('vw_lojas_resumo') as any)
        .select('loja_id,client_name,loja_nome,tipo,prioridade,faturamento,pedidos,dias_desde_ultima,cidade,uf,whatsapp')
        .eq('tipo', 'loja').order('faturamento', { ascending: false })
      if (!vivo) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLojas(((data ?? []) as any[]).map(r => ({
        loja_id: r.loja_id, cliente: r.client_name, loja: r.loja_nome, prioridade: r.prioridade,
        faturamento: Number(r.faturamento) || 0, pedidos: Number(r.pedidos) || 0,
        dias_desde_ultima: r.dias_desde_ultima != null ? Number(r.dias_desde_ultima) : null,
        cidade: r.cidade, uf: r.uf, whatsapp: r.whatsapp,
      })))
      setLoading(false)
    })()
    return () => { vivo = false }
  }, [])
  return { lojas, loading }
}

export const PRIORIDADE_PDV: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'VIP',    color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  2: { label: 'Ouro',   color: '#ECC94B', bg: 'rgba(236,201,75,0.15)'  },
  3: { label: 'Prata',  color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
  4: { label: 'Bronze', color: '#DD8B4E', bg: 'rgba(221,139,78,0.15)'  },
}
