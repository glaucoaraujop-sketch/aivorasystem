'use client'
import { useState, useCallback } from 'react'

export function useAI() {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const generate = useCallback(async (endpoint: string, body: object) => {
    setLoading(true)
    setText('')
    setError('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok || !res.body) throw new Error('Falha na requisição')
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setText(prev => prev + decoder.decode(value, { stream: true }))
      }
    } catch {
      setError('Não foi possível gerar a resposta. Verifique a configuração da API.')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => { setText(''); setError('') }, [])

  return { text, loading, error, generate, reset }
}
