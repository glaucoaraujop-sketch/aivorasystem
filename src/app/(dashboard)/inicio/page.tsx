'use client'

import { useState, useEffect } from 'react'
import { Sparkles, MapPin, Cloud, Settings, ArrowRight, Users, ShoppingCart, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
import { useCurrentUserName } from '@/hooks/useCurrentUserName'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useAI } from '@/hooks/useAI'
import { AivaChat } from '@/components/ai/AivaChat'

function getSaudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getDiaSemana() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

const QUICK_LINKS = [
  { href: '/clientes',   label: 'Clientes',    icon: Users,        color: '#0075FF' },
  { href: '/pedidos',    label: 'Pedidos',      icon: ShoppingCart, color: '#01B574' },
  { href: '/comissoes',  label: 'Comissões',    icon: DollarSign,   color: '#F6AD55' },
  { href: '/orcamentos', label: 'Orçamentos',   icon: FileText,     color: '#A78BFA' },
]

export default function InicioPage() {
  const { name: userName }       = useCurrentUserName()
  const { settings, loading: settingsLoading } = useSystemSettings()
  const bomDia = useAI()
  const [chatOpen, setChatOpen]  = useState(false)
  const [generated, setGenerated] = useState(false)

  const area = settings.area_atuacao

  useEffect(() => {
    if (settingsLoading || generated) return
    if (!userName) return
    setGenerated(true)
    const h = new Date().getHours()
    const dia = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
    bomDia.generate('/api/ai/bom-dia', {
      userName,
      area: area ?? 'São Paulo',
      hora: h,
      diaSemana: dia,
    })
  }, [userName, settingsLoading, area])

  return (
    <>
      <div className="max-w-3xl w-full space-y-6">

        {/* Saudação principal */}
        <div
          className="rounded-3xl p-7 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,117,255,0.15) 0%, rgba(109,40,217,0.2) 50%, rgba(0,181,116,0.08) 100%)',
            border: '1px solid rgba(109,40,217,0.25)',
          }}
        >
          {/* Glow decorativo */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)' }} />

          <div className="relative">
            <p className="text-sm font-medium mb-1 capitalize" style={{ color: '#A78BFA' }}>{getDiaSemana()}</p>
            <h1 className="text-4xl font-bold text-white mb-1">
              {getSaudacao()}{userName ? `,` : '!'}
            </h1>
            {userName && (
              <h1 className="text-4xl font-bold mb-5" style={{
                background: 'linear-gradient(90deg, #0075FF, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {userName}
              </h1>
            )}

            {/* Área de atuação */}
            {area && (
              <div className="flex items-center gap-1.5 mb-5">
                <MapPin size={13} style={{ color: '#A78BFA' }} />
                <span className="text-sm" style={{ color: '#A0AEC0' }}>{area}</span>
              </div>
            )}

            {/* Briefing AIVA */}
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={13} style={{ color: '#A78BFA' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A78BFA' }}>
                  AIVA · Contexto do dia
                </span>
              </div>
              {bomDia.loading && !bomDia.text && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#A78BFA', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: '#56577A' }}>Consultando clima e contexto…</span>
                </div>
              )}
              {!area && !settingsLoading && !bomDia.loading && (
                <p className="text-sm" style={{ color: '#A0AEC0' }}>
                  Configure sua área de atuação em{' '}
                  <Link href="/configuracoes" className="underline" style={{ color: '#A78BFA' }}>Configurações</Link>
                  {' '}para receber briefings personalizados.
                </p>
              )}
              {bomDia.text && (
                <p className="text-sm leading-relaxed" style={{ color: '#CBD5E0', whiteSpace: 'pre-wrap' }}>
                  {bomDia.text}
                  {bomDia.loading && (
                    <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
                      style={{ background: '#A78BFA', animation: 'pulse 1s ease-in-out infinite' }} />
                  )}
                </p>
              )}
            </div>

            {/* Botão AIVA */}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-3 w-full py-4 px-5 rounded-2xl text-left transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #0075FF 0%, #6D28D9 100%)',
                boxShadow: '0 8px 32px rgba(109,40,217,0.35)',
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Sparkles size={18} color="#fff" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Fale com a AIVA</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Sua assistente estratégica de IA · Pergunte qualquer coisa
                </p>
              </div>
              <ArrowRight size={18} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>

        {/* Atalhos rápidos */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>
            Acesso rápido
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:opacity-80"
                style={{ border: `1px solid rgba(255,255,255,0.06)` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}20` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <span className="text-xs font-semibold text-white">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Configurar área se não tiver */}
        {!area && !settingsLoading && (
          <Link
            href="/configuracoes"
            className="flex items-center justify-between p-4 rounded-2xl transition-all hover:opacity-80"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <Settings size={16} style={{ color: '#A78BFA' }} />
              <div>
                <p className="text-sm font-semibold text-white">Configure sua área de atuação</p>
                <p className="text-xs mt-0.5" style={{ color: '#A0AEC0' }}>
                  Permite que a AIVA traga clima e contexto personalizado
                </p>
              </div>
            </div>
            <ArrowRight size={16} style={{ color: '#A78BFA' }} />
          </Link>
        )}
      </div>

      <AivaChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        userName={userName ?? undefined}
      />
    </>
  )
}
