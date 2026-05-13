'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha inválidos')
      setLoading(false)
      return
    }

    router.push('/clientes')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(159.02deg, #0f123b 14.25%, #090d2e 56.45%, #020515 86.14%)',
      }}
    >
      {/* Glow radial de fundo */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,117,255,0.10) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo — mix-blend-mode:multiply remove o fundo branco no dark */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-aivora.png"
            alt="Aivora System"
            width={260}
            height={180}
            priority
            style={{ mixBlendMode: 'screen' }}
          />
        </div>

        {/* Card do formulário */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
            backdropFilter: 'blur(120px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#A0AEC0' }}
              >
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#A0AEC0' }}
              >
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                required
              />
            </div>

            {error && (
              <p
                className="text-sm px-4 py-2.5 rounded-xl"
                style={{
                  color: '#FC8181',
                  background: 'rgba(252,129,129,0.1)',
                  border: '1px solid rgba(252,129,129,0.2)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                boxShadow: '0 4px 24px rgba(0,117,255,0.35)',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
