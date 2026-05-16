'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function forca(senha: string): { level: number; label: string; color: string } {
  if (senha.length === 0) return { level: 0, label: '',        color: 'transparent' }
  if (senha.length < 6)   return { level: 1, label: 'Fraca',   color: '#FC8181' }
  const temNum    = /\d/.test(senha)
  const temEsp    = /[^a-zA-Z0-9]/.test(senha)
  const temMaiusc = /[A-Z]/.test(senha)
  const score = [senha.length >= 8, temNum, temEsp, temMaiusc].filter(Boolean).length
  if (score <= 1) return { level: 2, label: 'Fraca',   color: '#FC8181' }
  if (score === 2) return { level: 3, label: 'Média',   color: '#F6AD55' }
  if (score === 3) return { level: 4, label: 'Boa',     color: '#ECC94B' }
  return              { level: 5, label: 'Forte',    color: '#01B574' }
}

export default function RedefinirSenhaPage() {
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [sucesso,         setSucesso]         = useState(false)
  const [sessionOk,       setSessionOk]       = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  // Verifica se o link de recovery é válido (sessão ativa)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionOk(!!session)
    })
  }, [])

  const forcaSenha = forca(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Não foi possível atualizar a senha. O link pode ter expirado.')
      setLoading(false)
      return
    }

    setSucesso(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  const inputBase = 'input-dark w-full px-4 py-3 rounded-xl text-sm pr-11'

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(159.02deg, #0f123b 14.25%, #090d2e 56.45%, #020515 86.14%)' }}>

      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,117,255,0.10) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-sm relative z-10">

        <div className="flex justify-center mb-8">
          <Image src="/logo-aivora.png" alt="Aivora System" width={260} height={180} priority
            style={{ mixBlendMode: 'lighten', filter: 'invert(1) hue-rotate(180deg)' }} />
        </div>

        <div className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
            backdropFilter: 'blur(120px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>

          {sucesso ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(1,181,116,0.12)' }}>
                <CheckCircle size={28} style={{ color: '#01B574' }} />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Senha atualizada!</p>
                <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
                  Redirecionando para o login...
                </p>
              </div>
            </div>
          ) : !sessionOk ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(252,129,129,0.1)' }}>
                <AlertTriangle size={28} style={{ color: '#FC8181' }} />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Link inválido ou expirado</p>
                <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
                  Solicite um novo link de recuperação.
                </p>
              </div>
              <Link href="/recuperar-senha"
                className="block w-full py-3 rounded-xl text-sm font-bold text-white text-center transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
                Solicitar novo link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="font-bold text-white text-lg mb-1">Nova senha</p>
                <p className="text-sm" style={{ color: '#A0AEC0' }}>Escolha uma senha segura.</p>
              </div>

              {/* Nova senha */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#A0AEC0' }}>Nova senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className={inputBase}
                    required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: '#56577A' }} tabIndex={-1}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Barra de força */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all"
                          style={{ background: i <= forcaSenha.level ? forcaSenha.color : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: forcaSenha.color }}>{forcaSenha.label}</p>
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#A0AEC0' }}>Confirmar senha</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha" className={inputBase}
                    required autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: '#56577A' }} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#FC8181' }}>As senhas não coincidem</p>
                )}
              </div>

              {error && (
                <p className="text-sm px-4 py-2.5 rounded-xl"
                  style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 24px rgba(0,117,255,0.35)' }}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
