import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Client com service_role para uso SERVIDOR-A-SERVIDOR (cron/n8n), sem sessão
// de usuário. Ignora RLS — usar SOMENTE em endpoints protegidos por segredo.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  return createClient<Database, 'aivora_rep'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      db: { schema: 'aivora_rep' },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
