'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, MapPin, MessageCircle, Building2, UserCircle } from 'lucide-react'
import { useClientes } from '@/hooks/useClientes'
import { formatPhone } from '@/lib/utils'
import { clientEngagement } from '@/lib/engagement'
import type { ClientType } from '@/types/database'

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1', color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  2: { label: 'P2', color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  3: { label: 'P3', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
  4: { label: 'P4', color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  loja:         { label: 'Loja',         color: '#0075FF', bg: 'rgba(0,117,255,0.15)' },
  arquiteto:    { label: 'Arquiteto',    color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  decorador:    { label: 'Decorador',    color: '#ED64A6', bg: 'rgba(237,100,166,0.15)' },
  distribuidor: { label: 'Distribuidor', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' },
  outros:       { label: 'Outros',       color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
}

const AVATAR_COLORS = [
  { from: '#0075FF', to: '#2CD9FF' },
  { from: '#4318FF', to: '#9F7AEA' },
  { from: '#01B574', to: '#2CD9FF' },
  { from: '#F6AD55', to: '#FC8181' },
  { from: '#ED64A6', to: '#F6AD55' },
  { from: '#2CD9FF', to: '#01B574' },
]

function getAvatar(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const TIPO_FILTERS: { value: ClientType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'loja', label: 'Loja' },
  { value: 'arquiteto', label: 'Arquiteto' },
  { value: 'decorador', label: 'Decorador' },
  { value: 'distribuidor', label: 'Distribuidor' },
  { value: 'outros', label: 'Outros' },
]

const cardStyle = {
  background: 'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState<ClientType | ''>('')

  const { clientes, loading } = useClientes({ search, type: tipo || undefined })

  const porTipo = (t: string) => clientes.filter(c => c.type === t).length

  const metrics = [
    { label: 'Total', value: clientes.length, icon: Users, color: '#0075FF', bg: 'rgba(0,117,255,0.15)' },
    { label: 'Lojas', value: porTipo('loja'), icon: Building2, color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
    { label: 'Arquitetos', value: porTipo('arquiteto'), icon: UserCircle, color: '#ED64A6', bg: 'rgba(237,100,166,0.15)' },
    { label: 'Distribuidores', value: porTipo('distribuidor'), icon: Users, color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' },
  ]

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Clientes</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>Gerencie sua base de clientes</p>
        </div>
        <Link
          href="/clientes/novo"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 sm:flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
            boxShadow: '0 4px 20px rgba(0, 117, 255, 0.3)',
          }}
        >
          <Plus size={16} />
          Novo Cliente
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A0AEC0' }}>{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-black text-white">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Busca + Filtros */}
      <div className="rounded-2xl p-4 mb-6" style={cardStyle}>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou WhatsApp..."
            className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {TIPO_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTipo(f.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={tipo === f.value ? {
                background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 12px rgba(0,117,255,0.25)',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: '#A0AEC0',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={cardStyle}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1">
                  <div className="h-4 rounded-lg w-1/3 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 rounded-lg w-1/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={cardStyle}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Users size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhum cliente encontrado</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {search || tipo ? 'Tente outros filtros' : 'Clique em "Novo Cliente" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(c => {
            const cfg = TIPO_CONFIG[c.type]
            const avatar = getAvatar(c.name)
            return (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="flex items-center gap-4 rounded-2xl p-4 transition-all group"
                style={cardStyle}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${avatar.from} 0%, ${avatar.to} 100%)`,
                    boxShadow: `0 4px 12px ${avatar.from}40`,
                  }}
                >
                  <span className="text-white font-bold text-base">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {c.name}
                    </p>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    {c.priority && (() => {
                      const pc = PRIORITY_CONFIG[c.priority]
                      return (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                          style={{ color: pc.color, background: pc.bg }}>
                          {pc.label}
                        </span>
                      )
                    })()}
                  </div>
                  {c.company_name && (
                    <p className="text-sm truncate mt-0.5" style={{ color: '#A0AEC0' }}>{c.company_name}</p>
                  )}
                </div>

                {/* Contato + Engajamento */}
                <div className="hidden sm:flex items-center gap-5 text-sm flex-shrink-0" style={{ color: '#A0AEC0' }}>
                  {c.whatsapp && (
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={14} style={{ color: '#01B574' }} />
                      {formatPhone(c.whatsapp)}
                    </span>
                  )}
                  {c.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} style={{ color: '#56577A' }} />
                      {c.city}{c.state ? ` / ${c.state}` : ''}
                    </span>
                  )}
                </div>
                {/* Badge de engajamento */}
                {(() => {
                  const eng = clientEngagement(c.active, c.last_order_at ?? null, c.created_at)
                  return (
                    <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ color: eng.color, background: eng.bg }}>
                      {eng.label}
                    </span>
                  )
                })()}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
