// Guarda dos endpoints de IA (defesa em profundidade).
//
// O middleware já exige sessão para /api/ai/* (exceto o consultor, que tem
// segredo próprio). Este guard revalida a sessão DENTRO do handler (fail-closed,
// não confia só no gate de borda) e aplica rate limiting por usuário — contendo
// estouro de custo da Anthropic e travamento de workers por loops de requisição.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rateLimit'

const JANELA_MS = 60_000

export type ResultadoGuarda =
  | { ok: true; userId: string }
  | { ok: false; resposta: Response }

// endpoint: rótulo para a chave do rate limit (ex.: 'ai/chat').
// max: requisições permitidas por minuto por usuário (padrão 40; use menor em
// endpoints caros como import de PDF).
export async function guardaIA(req: NextRequest, endpoint: string, max = 40): Promise<ResultadoGuarda> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return { ok: false, resposta: NextResponse.json({ error: 'não autenticado' }, { status: 401 }) }
  }

  const rl = rateLimit(`${endpoint}:${user.id}`, max, JANELA_MS)
  if (!rl.ok) {
    return {
      ok: false,
      resposta: NextResponse.json(
        { error: 'Muitas requisições em pouco tempo. Aguarde alguns instantes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      ),
    }
  }

  return { ok: true, userId: user.id }
}
