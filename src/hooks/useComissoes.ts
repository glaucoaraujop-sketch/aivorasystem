'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CommissionStatus } from '@/types/database'

export interface Comissao {
  id: string
  user_id: string
  order_id: string
  value: number
  pct: number
  status: CommissionStatus
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  orders: {
    number: string | null
    total: number
    delivery_date: string | null
    clients: { name: string; company_name: string | null } | null
    suppliers: { name: string } | null
  } | null
}

export interface ComissoesSummary {
  prevista: number
  aprovada: number
  paga: number
  total: number
}

export function useComissoes(filters: { status?: CommissionStatus | '' } = {}) {
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('commissions') as any)
      .select('*, orders(number, total, delivery_date, clients(name, company_name), suppliers(name))')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (filters.status) query = query.eq('status', filters.status)

    const { data } = await query
    setComissoes(data ?? [])
    setLoading(false)
  }, [filters.status])

  useEffect(() => { fetch() }, [fetch])

  const summary: ComissoesSummary = {
    prevista: comissoes.filter(c => c.status === 'prevista').reduce((a, c) => a + c.value, 0),
    aprovada: comissoes.filter(c => c.status === 'aprovada').reduce((a, c) => a + c.value, 0),
    paga:     comissoes.filter(c => c.status === 'paga').reduce((a, c) => a + c.value, 0),
    total:    comissoes.reduce((a, c) => a + c.value, 0),
  }

  return { comissoes, loading, summary, refetch: fetch }
}

export function useComissoesMutations() {
  const supabase = createClient()

  async function atualizarStatus(id: string, status: CommissionStatus, notes?: string) {
    const extra: Record<string, string> = {}
    if (status === 'paga') extra.paid_at = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('commissions') as any)
      .update({ status, notes: notes ?? null, ...extra }).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function criarManual(orderId: string, pct: number, value: number, dueDate?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('commissions') as any).insert({
      user_id: user.id, order_id: orderId, pct, value,
      due_date: dueDate ?? null, status: 'prevista',
    })
    if (error) throw new Error(error.message)
  }

  return { atualizarStatus, criarManual }
}
