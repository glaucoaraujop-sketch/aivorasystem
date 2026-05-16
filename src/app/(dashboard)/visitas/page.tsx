'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Plus, Calendar, CheckCircle, Clock, RotateCcw, XCircle, MessageCircle } from 'lucide-react'
import { useVisitas } from '@/hooks/useVisitas'
import { formatPhone } from '@/lib/utils'
import type { VisitStatus } from '@/types/database'
import CronogramasTab from './CronogramasTab'
import AgendaTab from './AgendaTab'
import PrioridadesTab from './PrioridadesTab'

const STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  agendada:   { label: 'Agendada',   color: '#0075FF', bg: 'rgba(0,117,255,0.15)',     icon: Calendar    },
  realizada:  { label: 'Realizada',  color: '#01B574', bg: 'rgba(1,181,116,0.15)',     icon: CheckCircle },
  cancelada:  { label: 'Cancelada',  color: '#FC8181', bg: 'rgba(252,129,129,0.15)',   icon: XCircle     },
  reagendada: { label: 'Reagendada', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)',    icon: RotateCcw   },
}

const FILTROS_STATUS: { value: VisitStatus | ''; label: string }[] = [
  { value: '',           label: 'Todas'       },
  { value: 'agendada',   label: 'Agendadas'   },
  { value: 'realizada',  label: 'Realizadas'  },
  { value: 'reagendada', label: 'Reagendadas' },
  { value: 'cancelada',  label: 'Canceladas'  },
]

type Aba = 'visitas' | 'prioridades' | 'cronogramas' | 'agenda'
const ABAS: { value: Aba; label: string }[] = [
  { value: 'visitas',     label: 'Visitas'        },
  { value: 'prioridades', label: 'Prioridades'    },
  { value: 'cronogramas', label: 'Cronogramas'    },
  { value: 'agenda',      label: 'Agenda 4 Semanas' },
]

// ─── Aba de lista de visitas (conteúdo existente) ─────────────────────────────
function VisitasListTab() {
  const [status, setStatus] = useState<VisitStatus | ''>('agendada')
  const { visitas, loading } = useVisitas({ status })

  const hoje = new Date()
  const atrasadas = visitas.filter(v => v.status === 'agendada' && new Date(v.scheduled_at) < hoje)

  return (
    <div>
      {/* Alerta de atrasadas */}
      {atrasadas.length > 0 && (
        <div className="rounded-2xl px-5 py-4 mb-6"
          style={{ background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#F6AD55' }}>
            {atrasadas.length} visita{atrasadas.length > 1 ? 's' : ''} com data passada sem registro
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(246,173,85,0.7)' }}>
            Registre o resultado ou reagende
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS_STATUS.map(f => (
            <button key={f.value} onClick={() => setStatus(f.value as VisitStatus | '')}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={status === f.value ? {
                background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 12px rgba(0,117,255,0.25)',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: '#A0AEC0',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-14 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1">
                  <div className="h-4 rounded-lg w-1/3 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visitas.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <MapPin size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhuma visita encontrada</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {status ? 'Tente outro filtro' : 'Clique em "Agendar Visita" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visitas.map(v => {
            const cfg = STATUS_CONFIG[v.status]
            const StatusIcon = cfg.icon
            const atrasada = v.status === 'agendada' && new Date(v.scheduled_at) < hoje

            return (
              <Link key={v.id} href={`/visitas/${v.id}`}
                className="flex items-center gap-4 glass-card rounded-2xl p-4 transition-all group"
                style={atrasada ? { border: '1px solid rgba(246,173,85,0.25)' } : undefined}
                onMouseEnter={e => {
                  if (!atrasada) {
                    (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = atrasada
                    ? '1px solid rgba(246,173,85,0.25)'
                    : '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}>

                {/* Data/hora */}
                <div className="flex-shrink-0 text-center w-16 py-2.5 rounded-xl"
                  style={{ background: atrasada ? 'rgba(246,173,85,0.12)' : 'rgba(0,117,255,0.1)' }}>
                  <p className="text-xs font-semibold" style={{ color: atrasada ? '#F6AD55' : '#0075FF' }}>
                    {new Date(v.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(v.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                      {v.clients?.name}
                    </p>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      <StatusIcon size={10} /> {cfg.label}
                    </span>
                    {atrasada && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ color: '#F6AD55', background: 'rgba(246,173,85,0.15)' }}>
                        Atrasada
                      </span>
                    )}
                  </div>
                  {v.clients?.company_name && (
                    <p className="text-sm truncate" style={{ color: '#A0AEC0' }}>{v.clients.company_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#56577A' }}>
                    {v.clients?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {v.clients.city}{v.clients.state ? `/${v.clients.state}` : ''}
                      </span>
                    )}
                    {v.objective && <span className="truncate">· {v.objective}</span>}
                  </div>
                </div>

                {/* WhatsApp */}
                {v.clients?.whatsapp && (
                  <a href={`https://wa.me/55${v.clients.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 p-2.5 rounded-xl transition-all"
                    style={{ color: '#01B574' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(1,181,116,0.1)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                    <MessageCircle size={18} />
                  </a>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function VisitasPage() {
  const [aba, setAba] = useState<Aba>('visitas')

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Visitas</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            Gerencie visitas e cronogramas de visitação
          </p>
        </div>
        {aba === 'visitas' && (
          <Link href="/visitas/nova"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 sm:flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
            <Plus size={16} /> Agendar Visita
          </Link>
        )}
      </div>

      {/* Abas de navegação */}
      <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1">
        {ABAS.map(a => (
          <button key={a.value} onClick={() => setAba(a.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={aba === a.value ? {
              background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 12px rgba(0,117,255,0.3)',
            } : {
              color: '#A0AEC0',
            }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {aba === 'visitas'     && <VisitasListTab />}
      {aba === 'prioridades' && <PrioridadesTab />}
      {aba === 'cronogramas' && <CronogramasTab />}
      {aba === 'agenda'      && <AgendaTab />}
    </div>
  )
}
