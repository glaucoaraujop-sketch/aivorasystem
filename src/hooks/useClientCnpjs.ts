'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ClientCnpj = Database['public']['Tables']['client_cnpjs']['Row']
type ClientCnpjInsert = Database['public']['Tables']['client_cnpjs']['Insert']
type ClientCnpjUpdate = Database['public']['Tables']['client_cnpjs']['Update']

export type { ClientCnpj }

export function useClientCnpjs(clientId: string) {
  const [cnpjs, setCnpjs] = useState<ClientCnpj[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('client_cnpjs') as any)
      .select('*')
      .eq('client_id', clientId)
      .order('is_primary', { ascending: false })
      .order('created_at')
    setCnpjs(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])

  return { cnpjs, loading, refetch: fetch }
}

export function useClientCnpjsMutations() {
  const supabase = createClient()

  async function criar(dados: ClientCnpjInsert): Promise<ClientCnpj> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('client_cnpjs') as any)
      .insert(dados).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function atualizar(id: string, dados: ClientCnpjUpdate): Promise<ClientCnpj> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('client_cnpjs') as any)
      .update(dados).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function remover(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_cnpjs') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function definirPrincipal(clientId: string, cnpjId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('client_cnpjs') as any)
      .update({ is_primary: false }).eq('client_id', clientId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_cnpjs') as any)
      .update({ is_primary: true }).eq('id', cnpjId)
    if (error) throw new Error(error.message)
  }

  return { criar, atualizar, remover, definirPrincipal }
}
