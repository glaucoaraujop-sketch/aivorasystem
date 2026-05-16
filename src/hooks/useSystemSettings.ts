'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SystemSettings {
  priority_1_days: number
  priority_2_days: number
  priority_3_days: number
  priority_4_days: number
  clients_per_day: number
}

const DEFAULTS: SystemSettings = {
  priority_1_days: 15,
  priority_2_days: 30,
  priority_3_days: 45,
  priority_4_days: 60,
  clients_per_day: 5,
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
        if (data) setSettings(data)
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
