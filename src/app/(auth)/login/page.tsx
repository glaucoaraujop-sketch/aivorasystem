'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, AlertTriangle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const MAX_TENTATIVAS  = 3
const LOCKOUT_MINUTOS = 5
const LS_KEY          = 'login_lockout'

function lerLockout(): { count: number; lockedUntil: number } {
  if (typeof window === 'undefined') return { count: 0, lockedUntil: 0 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { count: 0, lockedUntil: 0 }
    return JSON.parse(raw)
  } catch { return { count: 0, lockedUntil: 0 } }
}

function salvarLockout(count: number, lockedUntil: number) {
  localStorage.setItem(LS_KEY, JSON.stringify({ count, lockedUntil }))
}

function limparLockout() { localStorage.removeItem(LS_KEY) }

export default function LoginPage() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)

  const [tentativas,   setTentativas]   = useState(0)
  const [lockedUntil,  setLockedUntil]  = useState(0)
  const [restante,     setRestante]     = useState(0)   // segundos restantes do bloqueio

  const router   = useRouter()
  const supabase = createClient()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Carrega estado de bloqueio do localStorage ao montar
  useEffect(() => {
    const { count, lockedUntil } = lerLockout()
    if (lockedUntil && Date.now() < lockedUntil) {
      setTentativas(count)
      setLockedUntil(lockedUntil)
    } else if (lockedUntil) {
      limparLockout()
    }
  }, [])

  // Conta sem acesso ao Aivora: encerra a sessão e avisa
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('erro') === 'sem_acesso') {
      setError('Esta conta não tem acesso ao sistema Aivora. Entre com uma conta autorizada.')
      supabase.auth.signOut()
    }
  }, [])

  // Countdown enquanto bloqueado
  useEffect(() => {
    if (!lockedUntil) return
    function tick() {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (secs <= 0) {
        setLockedUntil(0); setTentativas(0); setError(''); limparLockout()
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setRestante(secs)
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [lockedUntil])

  const bloqueado = lockedUntil > 0 && Date.now() < lockedUntil

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueado) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const novasTentativas = tentativas + 1

      if (novasTentativas >= MAX_TENTATIVAS) {
        const ate = Date.now() + LOCKOUT_MINUTOS * 60 * 1000
        setLockedUntil(ate)
        setTentativas(novasTentativas)
        salvarLockout(novasTentativas, ate)
        setError('')
      } else {
        setTentativas(novasTentativas)
        salvarLockout(novasTentativas, 0)
        setError(`E-mail ou senha inválidos. ${MAX_TENTATIVAS - novasTentativas} tentativa${MAX_TENTATIVAS - novasTentativas > 1 ? 's' : ''} restante${MAX_TENTATIVAS - novasTentativas > 1 ? 's' : ''}.`)
      }

      setLoading(false)
      return
    }

    limparLockout()
    router.push('/inicio')
  }

  const inputStyle = 'input-dark w-full px-4 py-3 rounded-xl text-sm'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(159.02deg, #0f123b 14.25%, #090d2e 56.45%, #020515 86.14%)' }}
    >
      {/* Glow radial */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,117,255,0.10) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo-aivora.png" alt="Aivora System" width={260} height={180} priority />
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
            backdropFilter: 'blur(120px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>

          {/* Banner de bloqueio */}
          {bloqueado ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(252,129,129,0.1)' }}>
                <Lock size={28} style={{ color: '#FC8181' }} />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Acesso bloqueado</p>
                <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
                  {MAX_TENTATIVAS} tentativas inválidas consecutivas
                </p>
              </div>
              <div className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
                <p className="text-sm font-semibold" style={{ color: '#FC8181' }}>
                  Tente novamente em {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}
                </p>
              </div>
              <p className="text-xs" style={{ color: '#56577A' }}>
                Esqueceu sua senha?{' '}
                <Link href="/recuperar-senha"
                  className="underline transition-opacity hover:opacity-80" style={{ color: '#0075FF' }}>
                  Recuperar acesso
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#A0AEC0' }}>E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" className={inputStyle} required autoComplete="email" />
              </div>

              {/* Senha com olho */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#A0AEC0' }}>Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputStyle} pr-11`}
                    required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 transition-opacity hover:opacity-70"
                    style={{ color: '#56577A' }} tabIndex={-1}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-2.5 rounded-xl"
                  style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Indicador de tentativas */}
              {tentativas > 0 && !bloqueado && (
                <div className="flex gap-1.5 justify-center">
                  {Array.from({ length: MAX_TENTATIVAS }).map((_, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all"
                      style={{ background: i < tentativas ? '#FC8181' : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 24px rgba(0,117,255,0.35)' }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <p className="text-center text-xs" style={{ color: '#56577A' }}>
                <Link href="/recuperar-senha"
                  className="transition-opacity hover:opacity-80" style={{ color: '#A0AEC0' }}>
                  Esqueci minha senha
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
