import { describe, it, expect } from 'vitest'
import { cached, invalidate } from './cache'

describe('cached', () => {
  it('executa a função no miss e reaproveita no hit', async () => {
    let calls = 0
    const fn = async () => { calls++; return 'valor' }
    const key = 'teste:hit-miss'
    invalidate(key)

    expect(await cached(key, 1000, fn)).toBe('valor') // miss → executa
    expect(await cached(key, 1000, fn)).toBe('valor') // hit → não executa
    expect(calls).toBe(1)

    invalidate(key)
    expect(await cached(key, 1000, fn)).toBe('valor') // miss de novo
    expect(calls).toBe(2)
  })
})
