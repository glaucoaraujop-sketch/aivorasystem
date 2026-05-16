'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SystemSettings {
  priority_1_days: number
  priority_2_days: number
  priority_3_days: number
  priority_4_days: number
  clients_per_day: number
  visit_sun: boolean
  visit_mon: boolean
  visit_tue: boolean
  visit_wed: boolean
  visit_thu: boolean
  visit_fri: boolean
  visit_sat: boolean
}

const DEFAULTS: SystemSettings = {
  priority_1_days: 15,
  priority_2_days: 30,
  priority_3_days: 45,
  priority_4_days: 60,
  clients_per_day: 5,
  visit_sun: false,
  visit_mon: true,
  visit_tue: true,
  visit_wed: true,
  visit_thu: true,
  visit_fri: true,
  visit_sat: false,
}

/** Retorna Set com os índices de dia (0=Dom…6=Sáb) marcados como dia de visita. */
export function visitDaysSet(s: SystemSettings): Set<number> {
  const keys: (keyof SystemSettings)[] = ['visit_sun','visit_mon','visit_tue','visit_wed','visit_thu','visit_fri','visit_sat']
  return new Set(keys.map((k, i) => (s[k] ? i : -1)).filter(i => i >= 0))
}

/** Avança `date` para o próximo dia de visita (inclusive o próprio se já for válido). */
export function nextVisitDay(date: Date, workDays: Set<number>): Date {
  if (workDays.size === 0) return date   // sem dias configurados: não avança
  const d = new Date(date)
  for (let i = 0; i < 7; i++) {
    if (workDays.has(d.getDay())) return d
    d.setDate(d.getDate() + 1)
  }
  return d
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('system_settings') as any)
      .select('*').eq('id', 1).single()
      .then(({ data }: { data: SystemSettings | null }) => {
        if (data) setSettings({ ...DEFAULTS, ...data })
        setLoading(false)
      })
  }, [])

  async function salvar(values: Partial<SystemSettings>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('system_settings') as any)
      .upsert({ id: 1, ...values }, { onConflict: 'id' })
    if (error) throw new Error(error.message)
    setSettings(prev => ({ ...prev, ...values }))
  }

  return { settings, loading, salvar }
}
