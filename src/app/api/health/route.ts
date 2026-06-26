import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withObservability, timedQuery } from '@/lib/observability/api'
import { collectSystemMetrics } from '@/lib/observability/metrics'

// Health check sempre dinâmico (nunca cacheado)
export const dynamic = 'force-dynamic'

function round(n: number) {
  return Math.round(n * 10) / 10
}

type Check = { status: 'up' | 'down'; latencyMs?: number; error?: string; configured?: boolean }

export const GET = withObservability('health', async (_req, { requestId, logger }) => {
  const checks: Record<string, Check> = {}

  // 1) Banco de dados (Supabase) — query barata, só para medir conectividade
  const t0 = performance.now()
  try {
    const sb = await createClient()
    const { error } = await timedQuery(logger, 'health.clients.count', () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb.from('clients') as any).select('id', { count: 'exact', head: true }),
    )
    checks.database = {
      status: error ? 'down' : 'up',
      latencyMs: round(performance.now() - t0),
      ...(error ? { error: error.message } : {}),
    }
  } catch (e) {
    checks.database = {
      status: 'down',
      latencyMs: round(performance.now() - t0),
      error: e instanceof Error ? e.message : 'erro desconhecido',
    }
  }

  // 2) IA (Anthropic) — verifica se a chave está configurada
  const anthropicOk = !!process.env.ANTHROPIC_API_KEY
  checks.anthropic = { status: anthropicOk ? 'up' : 'down', configured: anthropicOk }

  const allUp = Object.values(checks).every(c => c.status === 'up')
  const status = allUp ? 'healthy' : 'degraded'

  if (!allUp) logger.warn('health.degraded', { checks })

  return NextResponse.json(
    {
      status,
      requestId,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.COMMIT_SHA || 'dev',
      checks,
      metrics: collectSystemMetrics(),
    },
    { status: allUp ? 200 : 503 },
  )
})
