import { logger } from './logger'

// Cache em memória com TTL e tracking de hit/miss. Adequado para consultas
// pesadas e repetidas (ex: agregações da AIVA). Processo único (PM2) — não é
// compartilhado entre instâncias, o que é suficiente nesta escala.

interface Entry {
  value: unknown
  expiresAt: number
}

const store = new Map<string, Entry>()
let hits = 0
let misses = 0

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const entry = store.get(key)
  if (entry && entry.expiresAt > now) {
    hits++
    logger.info('cache', { event: 'hit', key })
    return entry.value as T
  }
  misses++
  logger.info('cache', { event: 'miss', key })
  const value = await fn()
  store.set(key, { value, expiresAt: now + ttlMs })
  return value
}

export function cacheStats() {
  const total = hits + misses
  return {
    hits,
    misses,
    entries: store.size,
    hitRate: total ? Math.round((hits / total) * 1000) / 1000 : 0,
  }
}

export function invalidate(key?: string) {
  if (key) store.delete(key)
  else store.clear()
}
