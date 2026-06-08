'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Product = Database['aivora_rep']['Tables']['products']['Row']
type ProductInsert = Database['aivora_rep']['Tables']['products']['Insert']
type ProductUpdate = Database['aivora_rep']['Tables']['products']['Update']

export type ProductWithPrices = Product & {
  product_categories: { name: string } | null
  product_prices: { price: number; price_table_id: string; price_tables: { name: string } | null }[]
}

interface Filters {
  search?: string
  category_id?: string
  brand?: string
  active?: boolean
}

export function useProdutos(filters: Filters = {}) {
  const [produtos, setProdutos] = useState<ProductWithPrices[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('products') as any)
      .select('*, product_categories(name), product_prices(price, price_table_id, price_tables(name))')
      .order('brand')
      .order('name')

    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.brand) query = query.eq('brand', filters.brand)
    if (filters.active !== undefined) query = query.eq('active', filters.active)

    const { data } = await query
    setProdutos(data ?? [])
    setLoading(false)
  }, [filters.search, filters.category_id, filters.brand, filters.active])

  useEffect(() => { fetch() }, [fetch])

  return { produtos, loading, refetch: fetch }
}

export function useProduto(id: string) {
  const [produto, setProduto] = useState<ProductWithPrices | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('products') as any)
      .select('*, product_categories(name), product_prices(price, price_table_id, price_tables(name))')
      .eq('id', id)
      .single()
      .then(({ data }: { data: ProductWithPrices }) => { setProduto(data); setLoading(false) })
  }, [id])

  return { produto, loading }
}

export function useProdutosMutations() {
  const supabase = createClient()

  async function criar(dados: Omit<ProductInsert, 'id'>, precos: { price_table_id: string; price: number }[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('products') as any).insert(dados).select().single()
    if (error) throw new Error(error.message)

    if (precos.length > 0) {
      const rows = precos.filter(p => p.price > 0).map(p => ({ ...p, product_id: data.id }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (rows.length > 0) await (supabase.from('product_prices') as any).insert(rows)
    }
    return data as Product
  }

  async function atualizar(id: string, dados: ProductUpdate, precos: { price_table_id: string; price: number }[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('products') as any).update(dados).eq('id', id)
    if (error) throw new Error(error.message)

    // Upsert preços
    const rows = precos.filter(p => p.price > 0).map(p => ({ ...p, product_id: id }))
    if (rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('product_prices') as any).upsert(rows, { onConflict: 'product_id,price_table_id' })
    }
  }

  async function arquivar(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('products') as any).update({ active: false }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { criar, atualizar, arquivar }
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('product_categories') as any)
      .select('id, name').eq('active', true).order('name')
      .then(({ data }: { data: { id: string; name: string }[] }) => setCategorias(data ?? []))
  }, [])

  return categorias
}

export function useTabelasPreco() {
  const [tabelas, setTabelas] = useState<{ id: string; name: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('price_tables') as any)
      .select('id, name').eq('active', true).order('name')
      .then(({ data }: { data: { id: string; name: string }[] }) => setTabelas(data ?? []))
  }, [])

  return tabelas
}
