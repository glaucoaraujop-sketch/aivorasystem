'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useCurrentUserName() {
  const [name, setName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('team_members') as any)
        .select('name')
        .eq('email', user.email)
        .maybeSingle()

      if (data?.name) {
        setName(data.name)
      } else {
        const emailName = user.email?.split('@')[0] ?? ''
        setName(emailName === 'glaucoaraujop' ? 'Glauco' : emailName)
      }
    }
    load()
  }, [])

  return { name }
}
