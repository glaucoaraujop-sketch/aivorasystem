import { NextRequest, NextResponse } from 'next/server'
import { createLogger, serializeError, type Logger } from './logger'

// Contexto de observabilidade injetado em cada handler de rota.
export interface ObsContext {
  requestId: string
  logger: Logger
}

type Handler = (req: NextRequest, ctx: ObsContext) => Promise<Response>

function round(n: number) {
  return Math.round(n * 10) / 10
}

function genId(): string {
  try {
    return globalThis.crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

// Envolve um handler de rota adicionando:
//  - Request ID único (reaproveita x-request-id se vier do cliente/proxy)
//  - Log estruturado de início/fim com método, rota, status e duração
//  - Métrica de memória (delta de heap) por requisição
//  - Captura de erros não tratados com stack trace completo
//  - Header x-request-id na resposta (rastreabilidade ponta a ponta)
export function withObservability(endpoint: string, handler: Handler) {
  return async (req: NextRequest): Promise<Response> => {
    const requestId = req.headers.get('x-request-id') || genId()
    const log = createLogger({ requestId, endpoint })
    const startedAt = performance.now()
    const heapBefore = process.memoryUsage().heapUsed
    let path = req.url
    try {
      path = new URL(req.url).pathname
    } catch {}

    log.info('request.start', { method: req.method, path })

    try {
      const res = await handler(req, { requestId, logger: log })
      const durationMs = round(performance.now() - startedAt)
      const heapDeltaKb = Math.round((process.memoryUsage().heapUsed - heapBefore) / 1024)
      res.headers.set('x-request-id', requestId)
      log.info('request.finish', { status: res.status, durationMs, heapDeltaKb })
      return res
    } catch (err) {
      const durationMs = round(performance.now() - startedAt)
      log.error('request.error', { durationMs, error: serializeError(err) })
      return NextResponse.json(
        { error: 'Erro interno do servidor', requestId },
        { status: 500, headers: { 'x-request-id': requestId } },
      )
    }
  }
}

// Mede a duração de uma operação qualquer (chamada de IA, parsing, etc.).
export async function timed<T>(
  log: Logger,
  op: string,
  fn: () => Promise<T>,
  fields: Record<string, unknown> = {},
): Promise<T> {
  const start = performance.now()
  try {
    const out = await fn()
    log.info('op', { op, durationMs: round(performance.now() - start), ok: true, ...fields })
    return out
  } catch (err) {
    log.warn('op', { op, durationMs: round(performance.now() - start), ok: false, error: serializeError(err), ...fields })
    throw err
  }
}

// Mede e loga uma query do Supabase (formato { data, error }).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function timedQuery<R extends { data: any; error: any }>(
  log: Logger,
  query: string,
  fn: () => PromiseLike<R>,
): Promise<R> {
  const start = performance.now()
  const res = await fn()
  const durationMs = round(performance.now() - start)
  const rows = Array.isArray(res?.data) ? res.data.length : res?.data ? 1 : 0
  if (res?.error) {
    log.warn('db.query', { query, durationMs, ok: false, error: res.error?.message })
  } else {
    log.info('db.query', { query, durationMs, ok: true, rows })
  }
  return res
}
