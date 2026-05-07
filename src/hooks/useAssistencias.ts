'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type AssistenciaStatus = 'aberta' | 'em_andamento' | 'resolvida' | 'cancelada'

export interface Assistencia {
  id: string
  user_id: string
  client_id: string | null
  supplier_id: string | null
  product_id: string | null
  product_name: string | null
  invoice_number: string
  image_url: string | null
  description: string | null
  status: AssistenciaStatus
  notes: string | null
  resolution: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  clients:   { name: string; company_name: string | null; whatsapp: string | null } | null
  suppliers: { name: string } | null
  products:  { name: string; code: string | null } | null
}

export function useAssistencias(filters: { status?: AssistenciaStatus | '' } = {}) {
  const [assistencias, setAssistencias] = useState<Assistencia[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('assistencias') as any)
      .select('*, clients(name, company_name, whatsapp), suppliers(name), products(name, code)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)

    const { data } = await query
    setAssistencias(data ?? [])
    setLoading(false)
  }, [filters.status])

  useEffect(() => { fetch() }, [fetch])
  return { assistencias, loading, refetch: fetch }
}

export function useAssistencia(id: string) {
  const [assistencia, setAssistencia] = useState<Assistencia | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('assistencias') as any)
      .select('*, clients(name, company_name, whatsapp), suppliers(name), products(name, code)')
      .eq('id', id).single()
    setAssistencia(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { assistencia, loading, refetch: fetch }
}

export function useAssistenciasMutations() {
  const supabase = createClient()

  async function criar(dados: {
    client_id?: string
    supplier_id?: string
    product_id?: string
    product_name?: string
    invoice_number: string
    image_url?: string
    description?: string
    notes?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('assistencias') as any)
      .insert({ ...dados, user_id: user.id, status: 'aberta' }).select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function atualizarStatus(id: string, status: AssistenciaStatus, resolution?: string) {
    const updates: Record<string, unknown> = { status }
    if (status === 'resolvida') {
      updates.resolved_at = new Date().toISOString()
      if (resolution) updates.resolution = resolution
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('assistencias') as any).update(updates).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function atualizar(id: string, dados: Partial<{
    status: AssistenciaStatus
    notes: string
    resolution: string
    description: string
  }>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('assistencias') as any).update(dados).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function uploadImagem(file: File, userId: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('assistencias')
      .upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data: { publicUrl } } = supabase.storage.from('assistencias').getPublicUrl(data.path)
    return publicUrl
  }

  return { criar, atualizarStatus, atualizar, uploadImagem }
}
