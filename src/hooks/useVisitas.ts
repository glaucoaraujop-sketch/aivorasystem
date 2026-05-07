'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VisitStatus } from '@/types/database'

export interface Visita {
  id: string
  user_id: string
  client_id: string
  scheduled_at: string
  completed_at: string | null
  status: VisitStatus
  objective: string | null
  notes: string | null
  result: string | null
  next_action: string | null
  created_at: string
  clients: {
    name: string
    company_name: string | null
    whatsapp: string | null
    city: string | null
    state: string | null
    address: string | null
  } | null
}

export function useVisitas(filters: { status?: VisitStatus | '' } = {}) {
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('visits') as any)
      .select('*, clients(name, company_name, whatsapp, city, state, address)')
      .order('scheduled_at', { ascending: true })

    if (filters.status) query = query.eq('status', filters.status)

    const { data } = await query
    setVisitas(data ?? [])
    setLoading(false)
  }, [filters.status])

  useEffect(() => { fetch() }, [fetch])
  return { visitas, loading, refetch: fetch }
}

export function useVisita(id: string) {
  const [visita, setVisita] = useState<Visita | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('visits') as any)
      .select('*, clients(name, company_name, whatsapp, city, state, address)')
      .eq('id', id).single()
    setVisita(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { visita, loading, refetch: fetch }
}

export function useVisitasMutations() {
  const supabase = createClient()

  async function criar(dados: {
    client_id: string
    scheduled_at: string
    objective?: string
    notes?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('visits') as any)
      .insert({ ...dados, user_id: user.id, status: 'agendada' }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function registrarResultado(id: string, dados: {
    result: string
    notes?: string
    next_action?: string
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('visits') as any)
      .update({ ...dados, status: 'realizada', completed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function atualizarStatus(id: string, status: VisitStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('visits') as any).update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function reagendar(id: string, scheduled_at: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('visits') as any)
      .update({ scheduled_at, status: 'reagendada' }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { criar, registrarResultado, atualizarStatus, reagendar }
}
