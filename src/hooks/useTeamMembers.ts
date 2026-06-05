'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TeamMember {
  id: string
  owner_user_id: string
  name: string
  email: string
  active: boolean
  perm_clientes: boolean
  perm_catalogo: boolean
  perm_orcamentos: boolean
  perm_pedidos: boolean
  perm_comissoes: boolean
  perm_visitas: boolean
  perm_fornecedores: boolean
  perm_assistencia: boolean
  perm_relatorios: boolean
  created_at: string
  updated_at: string
}

export type TeamMemberUpdate = Partial<Omit<TeamMember, 'id' | 'owner_user_id' | 'created_at' | 'updated_at'>>

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('team_members') as any)
      .select('*')
      .order('name')
    setMembers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { members, loading, refetch: fetch }
}

export function useTeamMembersMutations() {
  const supabase = createClient()

  async function atualizar(id: string, dados: TeamMemberUpdate): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('team_members') as any)
      .update({ ...dados, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function adicionar(dados: { name: string; email: string }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('team_members') as any)
      .insert({ ...dados, owner_user_id: user.id })
    if (error) throw new Error(error.message)
  }

  async function remover(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('team_members') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { atualizar, adicionar, remover }
}
