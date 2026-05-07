'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, OrderStatus } from '@/types/database'
import type { VariationOption } from './useVariacoes'

type Order = Database['public']['Tables']['orders']['Row']

export type OrderWithDetails = Order & {
  clients: { name: string; company_name: string | null; whatsapp: string | null } | null
  suppliers: { name: string; lead_time_days: number } | null
  order_items: {
    id: string
    quantity: number
    unit_price: number
    discount_pct: number
    total: number
    notes: string | null
    products: { id: string; code: string; name: string; unit: string } | null
    order_item_variations: {
      id: string
      variation_type_name: string
      option_name: string
      price_add: number
    }[]
  }[]
}

export interface ItemPedido {
  product_id: string
  name: string
  code: string
  unit: string
  quantity: number
  unit_price: number        // preço base
  unit_price_final: number  // preço base + variações
  discount_pct: number
  notes: string
  variacoes: Record<string, VariationOption | null>  // typeId → opção selecionada
}

export function usePedidos(filters: { status?: OrderStatus | '' } = {}) {
  const [pedidos, setPedidos] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('orders') as any)
      .select('*, clients(name, company_name, whatsapp), suppliers(name, lead_time_days), order_items(id, quantity, unit_price, discount_pct, total, notes, products(id, code, name, unit), order_item_variations(id, variation_type_name, option_name, price_add))')
      .order('created_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    const { data } = await query
    setPedidos(data ?? [])
    setLoading(false)
  }, [filters.status])

  useEffect(() => { fetch() }, [fetch])
  return { pedidos, loading, refetch: fetch }
}

export function usePedido(id: string) {
  const [pedido, setPedido] = useState<OrderWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('orders') as any)
      .select('*, clients(name, company_name, whatsapp), suppliers(name, lead_time_days), order_items(id, quantity, unit_price, discount_pct, total, notes, products(id, code, name, unit), order_item_variations(id, variation_type_name, option_name, price_add))')
      .eq('id', id).single()
    setPedido(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { pedido, loading, refetch: fetch }
}

export function usePedidosMutations() {
  const supabase = createClient()

  async function criar(
    dados: {
      client_id: string
      supplier_id?: string
      quote_id?: string
      finalidade?: 'mostruario' | 'venda'
      discount_pct: number
      subtotal: number
      total: number
      commission_pct?: number
      commission_value?: number
      payment_terms?: string
      delivery_date?: string
      notes?: string
    },
    itens: ItemPedido[]
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error } = await (supabase.from('orders') as any)
      .insert({ ...dados, user_id: user.id }).select().single()
    if (error) throw new Error(error.message)

    for (const item of itens) {
      const itemTotal = item.unit_price_final * item.quantity * (1 - item.discount_pct / 100)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orderItem, error: itemError } = await (supabase.from('order_items') as any)
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price_final,
          discount_pct: item.discount_pct,
          total: itemTotal,
          notes: item.notes || null,
        }).select().single()
      if (itemError) throw new Error(itemError.message)

      // Salvar variações selecionadas
      const varRows = Object.entries(item.variacoes)
        .filter(([, opt]) => opt !== null)
        .map(([typeId, opt]) => ({
          order_item_id: orderItem.id,
          variation_type_id: typeId,
          variation_type_name: opt!.variation_type_id, // será substituído abaixo
          option_id: opt!.id,
          option_name: opt!.name,
          price_add: opt!.price_add,
        }))

      if (varRows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('order_item_variations') as any).insert(varRows)
      }
    }

    // Criar registro de comissão automaticamente
    if (dados.commission_pct && dados.commission_value) {
      // Prazo padrão: 30 dias após entrega prevista (ou hoje + 30)
      const base = dados.delivery_date ? new Date(dados.delivery_date) : new Date()
      base.setDate(base.getDate() + 30)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('commissions') as any).insert({
        user_id:  user.id,
        order_id: order.id,
        pct:      dados.commission_pct,
        value:    dados.commission_value,
        due_date: base.toISOString().split('T')[0],
        status:   'prevista',
      })
    }

    return order
  }

  async function atualizarStatus(id: string, status: OrderStatus) {
    const extra: Record<string, string> = {}
    if (status === 'confirmado') extra.confirmed_at = new Date().toISOString()
    if (status === 'entregue')   extra.delivered_at = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('orders') as any).update({ status, ...extra }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { criar, atualizarStatus }
}
