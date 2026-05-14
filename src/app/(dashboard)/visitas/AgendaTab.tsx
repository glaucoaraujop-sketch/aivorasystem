'use client'

import { useState, useCallback, useEffect } from 'react'
import { CalendarDays, RefreshCw, AlertTriangle, MapPin, Clock, Users } from 'lucide-react'
import {
  useVisitSchedules, useScheduleSettings,
  gerarAgenda, type AgendaSemana,
} from '@/hooks/useVisitSchedules'
import { createClient } from '@/lib/supabase/client'

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const POSITION_COLORS: Record<string, { color: string; bg: string }> = {
  'Prioridade Alta':   { color: '#0075FF', bg: 'rgba(0,117,255,0.12)'   },
  'Prioridade Média':  { color: '#01B574', bg: 'rgba(1,181,116,0.12)'   },
  'Prioridade Baixa':  { color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  'Cronograma 4':      { color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
}

function accentForSchedule(name: string) {
  return POSITION_COLORS[name] ?? { color: '#A0AEC0', bg: 'rgba(160,174,192,0.1)' }
}

export default function AgendaTab() {
  const { schedules, loading: loadingSch } = useVisitSchedules()
  const { settings,  loading: loadingSet } = useScheduleSettings()
  const supabase = createClient()

  const [semanas, setSemanas]       = useState<AgendaSemana[]>([])
  const [gerando, setGerando]       = useState(false)
  const [gerado, setGerado]         = useState(false)
  const [totalClientes, setTotal]   = useState(0)
  const [semFolga, setSemFolga]     = useState(0)

  const gerar = useCallback(async () => {
    if (!settings || schedules.length === 0) return
    setGerando(true)

    // Buscar última visita realizada de cada cliente nos cronogramas
    const allClientIds = schedules.flatMap(s => s.schedule_clients.map(sc => sc.client_id))
    const uniqueIds    = [...new Set(allClientIds)]

    let lastVisitDates: Record<string, string> = {}

    if (uniqueIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('visits') as any)
        .select('client_id, completed_at')
        .in('client_id', uniqueIds)
        .eq('status', 'realizada')
        .order('completed_at', { ascending: false })

      if (data) {
        // Para cada cliente, pegar a mais recente
        for (const row of data as { client_id: string; completed_at: string }[]) {
          if (!lastVisitDates[row.client_id]) {
            lastVisitDates[row.client_id] = row.completed_at
          }
        }
      }
    }

    const resultado = gerarAgenda(schedules, settings, lastVisitDates)
    setSemanas(resultado)
    setGerado(true)

    const total = resultado.flatMap(s => s.slots).reduce((acc, sl) => acc + sl.items.length, 0)
    const semSlot = uniqueIds.length - total
    setTotal(total)
    setSemFolga(Math.max(0, semSlot))

    setGerando(false)
  }, [schedules, settings])

  // Gerar automaticamente assim que tiver dados
  useEffect(() => {
    if (!loadingSch && !loadingSet && schedules.length > 0 && settings) {
      gerar()
    }
  }, [loadingSch, loadingSet])

  const loading = loadingSch || loadingSet

  if (loading) return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 animate-pulse h-40"
          style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )

  if (schedules.length === 0) return (
    <div className="glass-card rounded-2xl p-16 text-center">
      <CalendarDays size={32} className="mx-auto mb-3" style={{ color: '#56577A' }} />
      <p className="text-white font-semibold">Nenhum cronograma configurado</p>
      <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
        Acesse a aba <strong className="text-white">Cronogramas</strong> para criar e adicionar clientes.
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header de ação */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-black text-white">Agenda — Próximas 4 Semanas</h2>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>
            Gerada com base nos seus cronogramas e última visita de cada cliente
          </p>
        </div>
        <button onClick={gerar} disabled={gerando}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 sm:flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 16px rgba(0,117,255,0.3)' }}>
          <RefreshCw size={14} className={gerando ? 'animate-spin' : ''} />
          {gerando ? 'Gerando…' : 'Regerar agenda'}
        </button>
      </div>

      {/* Resumo */}
      {gerado && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A0AEC0' }}>
              Clientes agendados
            </p>
            <p className="text-2xl font-black" style={{ color: '#0075FF' }}>{totalClientes}</p>
          </div>
          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#A0AEC0' }}>
              Visitas/dia
            </p>
            <p className="text-2xl font-black text-white">{settings?.clients_per_day ?? 5}</p>
          </div>
          {semFolga > 0 && (
            <div className="glass-card rounded-xl px-4 py-3"
              style={{ border: '1px solid rgba(246,173,85,0.3)', background: 'rgba(246,173,85,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#F6AD55' }}>
                Sem encaixe
              </p>
              <p className="text-2xl font-black" style={{ color: '#F6AD55' }}>{semFolga}</p>
            </div>
          )}
        </div>
      )}

      {/* Semanas */}
      {gerado && semanas.map((semana, wi) => {
        const temItens = semana.slots.some(s => s.items.length > 0)
        return (
          <div key={wi} className="glass-card rounded-2xl overflow-hidden">
            {/* Header da semana */}
            <div className="px-5 py-3 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <CalendarDays size={15} style={{ color: '#0075FF' }} />
              <p className="font-bold text-white text-sm">{semana.label}</p>
              <span className="ml-auto text-xs" style={{ color: '#56577A' }}>
                {semana.slots.reduce((a, s) => a + s.items.length, 0)} visitas
              </span>
            </div>

            {!temItens ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm" style={{ color: '#56577A' }}>Nenhuma visita prevista nesta semana.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {semana.slots.map((slot, si) => {
                  if (slot.items.length === 0) return null
                  const diaSemana = DIAS_PT[slot.date.getDay()]
                  const dataStr   = slot.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  const isHoje    = slot.date.toDateString() === new Date().toDateString()

                  return (
                    <div key={si} className="px-5 py-4">
                      {/* Cabeçalho do dia */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex flex-col items-center w-10 flex-shrink-0">
                          <span className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: isHoje ? '#0075FF' : '#56577A' }}>
                            {diaSemana}
                          </span>
                          <span className="text-lg font-black leading-none"
                            style={{ color: isHoje ? '#0075FF' : '#ffffff' }}>
                            {slot.date.getDate().toString().padStart(2, '0')}
                          </span>
                          <span className="text-xs" style={{ color: '#56577A' }}>
                            {String(slot.date.getMonth() + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#56577A' }}>
                          <Users size={11} /> {slot.items.length}/{settings?.clients_per_day}
                        </span>
                      </div>

                      {/* Cards dos clientes do dia */}
                      <div className="space-y-2 ml-12">
                        {slot.items.map((item, ii) => {
                          const ac = accentForSchedule(item.scheduleName)
                          return (
                            <div key={ii}
                              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              {item.overdue && (
                                <AlertTriangle size={13} className="flex-shrink-0" style={{ color: '#F6AD55' }} />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{item.clientName}</p>
                                {item.companyName && (
                                  <p className="text-xs truncate" style={{ color: '#56577A' }}>{item.companyName}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {item.city && (
                                  <span className="hidden sm:flex items-center gap-1 text-xs" style={{ color: '#56577A' }}>
                                    <MapPin size={10} /> {item.city}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ color: ac.color, background: ac.bg }}>
                                  <Clock size={9} /> {item.intervalDays}d
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
