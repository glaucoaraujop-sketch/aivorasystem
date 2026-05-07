'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, QuoteStatus } from '@/types/database'

type Quote = Database['public']['Tables']['quotes']['Row']

export type QuoteWithDetails = Quote & {
  clients: { name: string; company_name: string | null; whatsapp: string | null } | null
  price_tables: { name: string } | null
  quote_items: {
    id: string
    quantity: number
    unit_price: number
    discount_pct: number
    total: number
    notes: string | null
    products: { id: string; code: string; name: string; unit: string } | null
  }[]
}

interface Filters {
  status?: QuoteStatus | ''
  search?: string
}

export function useOrcamentos(filters: Filters = {}) {
  const [orcamentos, setOrcamentos] = useState<QuoteWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('quotes') as any)
      .select('*, clients(name, company_name, whatsapp), price_tables(name), quote_items(id, quantity, unit_price, discount_pct, total, notes, products(id, code, name, unit))')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.ilike('clients.name', `%${filters.search}%`)

    const { data } = await query
    setOrcamentos(data ?? [])
    setLoading(false)
  }, [filters.status, filters.search])

  useEffect(() => { fetch() }, [fetch])
  return { orcamentos, loading, refetch: fetch }
}

export function useOrcamento(id: string) {
  const [orcamento, setOrcamento] = useState<QuoteWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('quotes') as any)
      .select('*, clients(name, company_name, whatsapp), price_tables(name), quote_items(id, quantity, unit_price, discount_pct, total, notes, products(id, code, name, unit))')
      .eq('id', id).single()
    setOrcamento(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { orcamento, loading, refetch: fetch }
}

export function useOrcamentosMutations() {
  const supabase = createClient()

  async function criar(
    dados: { client_id: string; price_table_id?: string; discount_pct: number; valid_until?: string; notes?: string; subtotal: number; total: number },
    itens: { product_id: string; quantity: number; unit_price: number; discount_pct: number; total: number; notes?: string }[]
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('quotes') as any)
      .insert({ ...dados, user_id: user.id }).select().single()
    if (error) throw new Error(error.message)

    if (itens.length > 0) {
      const rows = itens.map(i => ({ ...i, quote_id: data.id }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemError } = await (supabase.from('quote_items') as any).insert(rows)
      if (itemError) throw new Error(itemError.message)
    }
    return data
  }

  async function atualizarStatus(id: string, status: QuoteStatus) {
    const extra: Record<string, string> = {}
    if (status === 'enviado') extra.sent_at = new Date().toISOString()
    if (status === 'aprovado') extra.approved_at = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('quotes') as any).update({ status, ...extra }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { criar, atualizarStatus }
}
