'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database, ClientType } from '@/types/database'

type Client = Database['aivora_rep']['Tables']['clients']['Row']
type ClientInsert = Database['aivora_rep']['Tables']['clients']['Insert']
type ClientUpdate = Database['aivora_rep']['Tables']['clients']['Update']

export type ClientWithCnpjCount = Client & {
  client_cnpjs: Array<{ id: string; num_lojas: number | null }>
}

interface Filters {
  search?: string
  type?: ClientType | ''
  state?: string
  active?: boolean
}

export function useClientes(filters: Filters = {}) {
  const [clientes, setClientes] = useState<ClientWithCnpjCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('clients') as any).select('*, client_cnpjs(id, num_lojas)').order('name')

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`)
    }
    if (filters.type) query = query.eq('type', filters.type)
    if (filters.state) query = query.eq('state', filters.state)
    if (filters.active !== undefined) query = query.eq('active', filters.active)

    const { data, error } = await query
    if (error) setError(error.message)
    else setClientes((data ?? []) as ClientWithCnpjCount[])
    setLoading(false)
  }, [filters.search, filters.type, filters.state, filters.active])

  useEffect(() => { fetch() }, [fetch])

  return { clientes, loading, error, refetch: fetch }
}

export function useCliente(id: string) {
  const [cliente, setCliente] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('clients').select('*').eq('id', id).single()
      .then(({ data }) => { setCliente(data); setLoading(false) })
  }, [id])

  return { cliente, loading }
}

export function useClientesMutations() {
  const supabase = createClient()

  async function criar(dados: Omit<ClientInsert, 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('clients') as any).insert({ ...dados, user_id: user.id }).select().single()
    if (error) throw new Error(error.message)
    return data as Client
  }

  async function atualizar(id: string, dados: ClientUpdate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('clients') as any).update(dados).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as Client
  }

  async function arquivar(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('clients') as any).update({ active: false }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function deletar(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('clients') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { criar, atualizar, arquivar, deletar }
}
