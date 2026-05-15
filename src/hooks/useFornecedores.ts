'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Supplier {
  id: string
  name: string
  lead_time_days: number
  email: string | null
  phone: string | null
  whatsapp: string | null
  contact_name: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
  // Contatos setoriais
  assistencia_nome:     string | null
  assistencia_whatsapp: string | null
  assistencia_email:    string | null
  financeiro_nome:      string | null
  financeiro_whatsapp:  string | null
  financeiro_email:     string | null
  logistica_nome:       string | null
  logistica_whatsapp:   string | null
  logistica_email:      string | null
  supervisor_nome:      string | null
  supervisor_whatsapp:  string | null
  supervisor_email:     string | null
}

export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetch() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('suppliers') as any).select('*').order('name')
    setFornecedores(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])
  return { fornecedores, loading, refetch: fetch }
}

export function useFornecedor(id: string) {
  const [fornecedor, setFornecedor] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('suppliers') as any).select('*').eq('id', id).single()
      .then(({ data }: { data: Supplier }) => { setFornecedor(data); setLoading(false) })
  }, [id])

  return { fornecedor, loading }
}

export function useFornecedoresMutations() {
  const supabase = createClient()

  async function atualizar(id: string, dados: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('suppliers') as any).update(dados).eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { atualizar }
}

export function calcularEntrega(leadTimeDays: number, dataInicio?: Date): Date {
  const inicio = dataInicio ?? new Date()
  const entrega = new Date(inicio)
  entrega.setDate(entrega.getDate() + leadTimeDays)
  return entrega
}
