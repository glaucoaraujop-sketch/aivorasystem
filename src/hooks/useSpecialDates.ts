'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SpecialDate {
  id: string
  user_id: string
  title: string
  date: string
  recurring: boolean
  notify_whatsapp: boolean
  notes: string | null
  created_at: string
}

export function useSpecialDates() {
  const [dates, setDates] = useState<SpecialDate[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('special_dates') as any)
      .select('*').order('date')
    setDates(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function adicionar(values: Omit<SpecialDate, 'id' | 'user_id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('special_dates') as any)
      .insert({ ...values, user_id: user.id }).select().single()
    if (error) throw new Error(error.message)
    setDates(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
  }

  async function remover(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('special_dates') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
    setDates(prev => prev.filter(d => d.id !== id))
  }

  return { dates, loading, adicionar, remover, reload: load }
}
