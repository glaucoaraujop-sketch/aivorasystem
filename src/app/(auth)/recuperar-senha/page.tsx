'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarSenhaPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error,   setError]   = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const redirectTo = `${window.location.origin}/redefinir-senha`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
      setLoading(false)
      return
    }

    setEnviado(true)
    setLoading(false)
  }

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

          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(1,181,116,0.12)' }}>
                <CheckCircle size={28} style={{ color: '#01B574' }} />
              </div>
              <div>
                <p className="font-bold text-white text-lg">E-mail enviado!</p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#A0AEC0' }}>
                  Verifique sua caixa de entrada em <span className="text-white font-medium">{email}</span> e clique no link para redefinir sua senha.
                </p>
              </div>
              <p className="text-xs" style={{ color: '#56577A' }}>
                Não recebeu?{' '}
                <button onClick={() => { setEnviado(false) }}
                  className="underline transition-opacity hover:opacity-80" style={{ color: '#0075FF' }}>
                  Tentar novamente
                </button>
              </p>
              <Link href="/login"
                className="flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80"
                style={{ color: '#A0AEC0' }}>
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="font-bold text-white text-lg mb-1">Recuperar senha</p>
                <p className="text-sm" style={{ color: '#A0AEC0' }}>
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#A0AEC0' }}>E-mail</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#56577A' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="input-dark w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    required autoComplete="email" />
                </div>
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
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <Link href="/login"
                className="flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80"
                style={{ color: '#A0AEC0' }}>
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
