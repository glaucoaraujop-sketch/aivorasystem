import { describe, it, expect } from 'vitest'
import { serializeError } from './logger'

describe('serializeError', () => {
  it('preserva nome, mensagem e stack de um Error', () => {
    const err = new Error('falhou')
    const out = serializeError(err)
    expect(out.name).toBe('Error')
    expect(out.message).toBe('falhou')
    expect(typeof out.stack).toBe('string')
  })
  it('lida com valores que não são Error', () => {
    expect(serializeError('texto')).toEqual({ message: 'texto' })
    expect(serializeError(42)).toEqual({ message: '42' })
  })
})
