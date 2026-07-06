'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_BUSINESS_RULES } from '@/lib/planner/rules'
import type { BusinessRules } from '@/lib/planner/types'

// Carrega/salva as Business Rules (config-driven) da tabela business_rules.
export function useBusinessRules() {
  const [rules, setRules] = useState<BusinessRules | null>(null)
  const [id, setId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('business_rules') as any)
      .select('id,rules').order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (data) { setId(data.id); setRules(data.rules as BusinessRules) }
    else { setId(null); setRules(DEFAULT_BUSINESS_RULES) }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const salvar = useCallback(async (novo: BusinessRules) => {
    if (id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('business_rules') as any)
        .update({ rules: novo, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('business_rules') as any)
        .insert({ rules: novo }).select('id').single()
      if (error) throw new Error(error.message)
      setId(data.id)
    }
    setRules(novo)
  }, [id])

  return { rules, loading, salvar, refetch: fetch }
}
