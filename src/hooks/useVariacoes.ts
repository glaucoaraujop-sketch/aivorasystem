'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface VariationType {
  id: string
  product_id: string
  name: string
  required: boolean
  sort_order: number
  options: VariationOption[]
}

export interface VariationOption {
  id: string
  variation_type_id: string
  name: string
  price_add: number
  active: boolean
  sort_order: number
}

export function useVariacoes(productId: string | null) {
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!productId) { setVariationTypes([]); return }
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('product_variation_types') as any)
      .select('*, options:product_variation_options(*)')
      .eq('product_id', productId)
      .order('sort_order')
    setVariationTypes((data ?? []).map((t: VariationType & { options: VariationOption[] }) => ({
      ...t,
      options: (t.options ?? []).filter((o: VariationOption) => o.active).sort((a: VariationOption, b: VariationOption) => a.sort_order - b.sort_order)
    })))
    setLoading(false)
  }, [productId])

  useEffect(() => { fetch() }, [fetch])
  return { variationTypes, loading, refetch: fetch }
}

export function useVariacoesMutations() {
  const supabase = createClient()

  async function criarTipo(productId: string, name: string, required = true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('product_variation_types') as any)
      .insert({ product_id: productId, name, required }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function removerTipo(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('product_variation_types') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function criarOpcao(typeId: string, name: string, priceAdd = 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('product_variation_options') as any)
      .insert({ variation_type_id: typeId, name, price_add: priceAdd }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function removerOpcao(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('product_variation_options') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { criarTipo, removerTipo, criarOpcao, removerOpcao }
}

// Calcula preço final baseado nas variações selecionadas
export function calcularPrecoComVariacoes(
  precoBase: number,
  selecoes: Record<string, VariationOption | null>
): number {
  const adicional = Object.values(selecoes).reduce((acc, opt) => acc + (opt?.price_add ?? 0), 0)
  return precoBase + adicional
}
