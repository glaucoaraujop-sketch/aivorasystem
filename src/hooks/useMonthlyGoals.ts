'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MonthlyGoal {
  id: string
  user_id: string
  year: number
  month: number
  orders_goal: number
  visits_goal: number
  revenue_goal: number
}

export function useMonthlyGoals(year?: number, month?: number) {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? (now.getMonth() + 1)

  const [goal, setGoal] = useState<MonthlyGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('monthly_goals') as any)
      .select('*').eq('year', y).eq('month', m).eq('user_id', user.id).single()

    setGoal(data ?? null)
    setLoading(false)
  }, [supabase, y, m])

  useEffect(() => { load() }, [load])

  async function salvar(values: { orders_goal: number; visits_goal: number; revenue_goal: number }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // orders_goal e visits_goal são colunas INTEIRAS — arredonda pra não estourar
    // "invalid input syntax for type integer". revenue_goal é numeric (aceita decimal).
    const payload = {
      user_id: user.id, year: y, month: m,
      orders_goal:  Math.max(0, Math.round(Number(values.orders_goal)  || 0)),
      visits_goal:  Math.max(0, Math.round(Number(values.visits_goal)  || 0)),
      revenue_goal: Math.max(0, Number(values.revenue_goal) || 0),
      updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('monthly_goals') as any)
      .upsert(payload, { onConflict: 'user_id,year,month' }).select().single()
    if (error) throw new Error(error.message)
    setGoal(data)
  }

  return { goal, loading, salvar, y, m }
}
