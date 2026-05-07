'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Plus, Calendar, CheckCircle, Clock, RotateCcw, XCircle, MessageCircle } from 'lucide-react'
import { useVisitas } from '@/hooks/useVisitas'
import { formatPhone } from '@/lib/utils'
import type { VisitStatus } from '@/types/database'

const STATUS_CONFIG: Record<VisitStatus, { label: string; badge: string; icon: React.ElementType }> = {
  agendada:   { label: 'Agendada',   badge: 'bg-blue-100 text-blue-700',   icon: Calendar },
  realizada:  { label: 'Realizada',  badge: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelada:  { label: 'Cancelada',  badge: 'bg-red-100 text-red-500',     icon: XCircle },
  reagendada: { label: 'Reagendada', badge: 'bg-yellow-100 text-yellow-700', icon: RotateCcw },
}

const FILTROS: { value: VisitStatus | ''; label: string }[] = [
  { value: '',          label: 'Todas' },
  { value: 'agendada',  label: 'Agendadas' },
  { value: 'realizada', label: 'Realizadas' },
  { value: 'reagendada',label: 'Reagendadas' },
  { value: 'cancelada', label: 'Canceladas' },
]

function formatVisitDate(iso: string) {
  const d = new Date(iso)
  const hoje = new Date()
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1)

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`
  if (d.toDateString() === amanha.toDateString()) return `Amanhã, ${hora}`
  return `${data}, ${hora}`
}

export default function VisitasPage() {
  const [status, setStatus] = useState<VisitStatus | ''>('agendada')
  const { visitas, loading } = useVisitas({ status })

  const hoje = new Date()
  const proximas = visitas.filter(v => v.status === 'agendada' && new Date(v.scheduled_at) >= hoje)
  const atrasadas = visitas.filter(v => v.status === 'agendada' && new Date(v.scheduled_at) < hoje)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{visitas.length} visita{visitas.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/visitas/nova"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Agendar Visita
        </Link>
      </div>

      {/* Alerta de atrasadas */}
      {atrasadas.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-6">
          <p className="text-sm font-semibold text-orange-700">
            {atrasadas.length} visita{atrasadas.length > 1 ? 's' : ''} com data passada sem registro de resultado
          </p>
          <p className="text-xs text-orange-500 mt-0.5">Registre o resultado ou reagende</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.value} onClick={() => setStatus(f.value as VisitStatus | '')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === f.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : visitas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma visita encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Agendar Visita" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visitas.map(v => {
            const cfg = STATUS_CONFIG[v.status]
            const StatusIcon = cfg.icon
            const atrasada = v.status === 'agendada' && new Date(v.scheduled_at) < hoje

            return (
              <Link key={v.id} href={`/visitas/${v.id}`}
                className={`flex items-center gap-4 bg-white rounded-xl border p-4 hover:shadow-sm transition-all group ${
                  atrasada ? 'border-orange-200 bg-orange-50/20' : 'border-gray-200 hover:border-blue-300'
                }`}>

                {/* Data/hora */}
                <div className={`flex-shrink-0 text-center w-16 py-2 rounded-lg ${atrasada ? 'bg-orange-100' : 'bg-gray-50'}`}>
                  <p className={`text-xs font-semibold ${atrasada ? 'text-orange-600' : 'text-blue-600'}`}>
                    {new Date(v.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(v.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {v.clients?.name}
                    </p>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.badge}`}>
                      <StatusIcon size={10} />
                      {cfg.label}
                    </span>
                    {atrasada && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600 flex-shrink-0">
                        Atrasada
                      </span>
                    )}
                  </div>
                  {v.clients?.company_name && (
                    <p className="text-sm text-gray-400 truncate">{v.clients.company_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {v.clients?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {v.clients.city}{v.clients.state ? `/${v.clients.state}` : ''}
                      </span>
                    )}
                    {v.objective && <span className="truncate">· {v.objective}</span>}
                  </div>
                </div>

                {/* WhatsApp */}
                {v.clients?.whatsapp && (
                  <a
                    href={`https://wa.me/55${v.clients.whatsapp.replace(/\D/g,'')}`}
                    target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-shrink-0 p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
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
