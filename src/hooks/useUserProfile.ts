'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  full_name: string | null
  display_name: string | null
  area: string | null
  cnpj: string | null
  phone: string | null
  whatsapp_number: string | null
  address: string | null
  city: string | null
  state: string | null
  cep: string | null
  photo_url: string | null
  logo_url: string | null
  evolution_instance_id: string | null
  whatsapp_notifications: boolean
  role: 'user' | 'master'
}

const DEFAULTS: Omit<UserProfile, 'id'> = {
  full_name: null,
  display_name: null,
  area: null,
  cnpj: null,
  phone: null,
  whatsapp_number: null,
  address: null,
  city: null,
  state: null,
  cep: null,
  photo_url: null,
  logo_url: null,
  evolution_instance_id: null,
  whatsapp_notifications: false,
  role: 'user',
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('user_profiles') as any)
      .select('*').eq('id', user.id).single()

    setProfile(data ?? { ...DEFAULTS, id: user.id })
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function salvar(values: Partial<Omit<UserProfile, 'id'>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('user_profiles') as any)
      .upsert({ id: user.id, ...values, updated_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
    setProfile(prev => prev ? { ...prev, ...values } : null)
  }

  async function uploadFile(file: File, type: 'photo' | 'logo'): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${type}.${ext}`

    const { error } = await supabase.storage
      .from('user-files')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw new Error(error.message)

    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(path)

    return publicUrl
  }

  return { profile, loading, salvar, uploadFile, reload: load }
}
