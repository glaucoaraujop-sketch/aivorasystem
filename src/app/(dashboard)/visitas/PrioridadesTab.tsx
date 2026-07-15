'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, MapPin, MessageCircle, CalendarDays, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBusinessRules } from '@/hooks/useBusinessRules'
import { diasDeVisitaSet, proximoDiaDeVisita, idealDaysPrioridade } from '@/lib/planner/dias'
import { capacidadeSemanal } from '@/lib/planner/engine'
import { formatPhone } from '@/lib/utils'
import { LojasPrioridade } from '@/components/visitas/LojasPrioridade'

interface ClientePrio {
  id: string
  name: string
  company_name: string | null
  city: string | null
  state: string | null
  whatsapp: string | null
  priority: number
  last_visit_at: string | null   // última visita realizada
  next_visit_at: Date            // próxima visita calculada
  dias_atraso: number            // < 0 = antecipado, > 0 = atrasado em dias
}

const PRIORITY_CFG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'P1', color: '#0075FF', bg: 'rgba(0,117,255,0.12)',   border: 'rgba(0,117,255,0.25)'   },
  2: { label: 'P2', color: '#01B574', bg: 'rgba(1,181,116,0.12)',   border: 'rgba(1,181,116,0.25)'   },
  3: { label: 'P3', color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  border: 'rgba(246,173,85,0.25)'  },
  4: { label: 'P4', color: '#A0AEC0', bg: 'rgba(160,174,192,0.12)', border: 'rgba(160,174,192,0.2)'  },
}

function weekStart(d: Date) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  const day = dt.getDay()
  dt.setDate(dt.getDate() - (day === 0 ? 6 : day - 1)) // segunda-feira
  return dt
}

function sameWeek(a: Date, b: Date) {
  return weekStart(a).getTime() === weekStart(b).getTime()
}

function weekLabel(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${fmt(monday)} — ${fmt(sunday)}`
}

function ClienteCard({ c, showConflict }: { c: ClientePrio; showConflict: boolean }) {
  const pc = PRIORITY_CFG[c.priority]
  const atrasado = c.dias_atraso > 0
  const hoje     = c.dias_atraso === 0

  return (
    <Link href={`/clientes/${c.id}`}
      className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all group"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${atrasado ? 'rgba(252,129,129,0.2)' : 'rgba(255,255,255,0.06)'}` }}>

      {/* Badge prioridade */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold"
        style={{ background: pc.color, color: '#fff' }}>
        {pc.label}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-white truncate group-hover:text-blue-300 transition-colors">
            {c.name}
          </p>
          {showConflict && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{ color: '#F6AD55', background: 'rgba(246,173,85,0.15)' }}>
              <AlertTriangle size={9} /> Conflito
            </span>
          )}
        </div>
        {c.company_name && (
          <p className="text-xs truncate" style={{ color: '#56577A' }}>{c.company_name}</p>
        )}
        {c.city && (
          <span className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#56577A' }}>
            <MapPin size={10} /> {c.city}{c.state ? `/${c.state}` : ''}
          </span>
        )}
      </div>

      {/* Direita */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {c.whatsapp && (
          <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`}
            target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: '#01B574' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(1,181,116,0.1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
            <MessageCircle size={16} />
          </a>
        )}
        <div className="text-right">
          {atrasado ? (
            <span className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#FC8181' }}>
              <AlertTriangle size={11} /> {c.dias_atraso}d atrasado
            </span>
          ) : hoje ? (
            <span className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#01B574' }}>
              <CheckCircle size={11} /> Hoje
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs"
              style={{ color: '#A0AEC0' }}>
              <Clock size={11} />
              {c.next_visit_at.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
          {c.last_visit_at && (
            <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>
              Última: {new Date(c.last_visit_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function PrioridadesTab() {
  const { rules, loading: loadingCfg } = useBusinessRules()
  const [clientes, setClientes] = useState<ClientePrio[]>([])
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (loadingCfg || !rules) return

    async function carregar() {
      if (!rules) return
      setLoading(true)

      // Buscar todos os clientes com prioridade definida
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientsData } = await (supabase.from('clients') as any)
        .select('id, name, company_name, city, state, whatsapp, priority, created_at')
        .not('priority', 'is', null)
        .eq('active', true)
        .order('priority')

      if (!clientsData || clientsData.length === 0) { setLoading(false); return }

      const ids = clientsData.map((c: { id: string }) => c.id)

      // Última visita realizada de cada cliente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: visitasData } = await (supabase.from('visits') as any)
        .select('client_id, scheduled_at')
        .in('client_id', ids)
        .eq('status', 'realizada')
        .order('scheduled_at', { ascending: false })

      const lastVisit: Record<string, string> = {}
      for (const v of (visitasData ?? []) as { client_id: string; scheduled_at: string }[]) {
        if (!lastVisit[v.client_id]) lastVisit[v.client_id] = v.scheduled_at
      }

      const diasPorPrio: Record<number, number> = {
        1: idealDaysPrioridade(rules, 1),
        2: idealDaysPrioridade(rules, 2),
        3: idealDaysPrioridade(rules, 3),
        4: idealDaysPrioridade(rules, 4),
      }

      const hoje    = new Date()
      hoje.setHours(0, 0, 0, 0)
      const workDays = diasDeVisitaSet(rules)

      const lista: ClientePrio[] = clientsData.map((c: {
        id: string; name: string; company_name: string | null
        city: string | null; state: string | null; whatsapp: string | null
        priority: number; created_at: string
      }) => {
        const dias    = diasPorPrio[c.priority] ?? 30
        const base    = lastVisit[c.id] ? new Date(lastVisit[c.id]) : new Date(c.created_at)
        base.setHours(0, 0, 0, 0)
        const raw     = new Date(base)
        raw.setDate(base.getDate() + dias)
        const nextDt  = proximoDiaDeVisita(raw, workDays)
        const diff    = Math.round((nextDt.getTime() - hoje.getTime()) / 86400000)

        return {
          id:           c.id,
          name:         c.name,
          company_name: c.company_name,
          city:         c.city,
          state:        c.state,
          whatsapp:     c.whatsapp,
          priority:     c.priority,
          last_visit_at: lastVisit[c.id] ?? null,
          next_visit_at: nextDt,
          dias_atraso:   diff < 0 ? -diff : 0,  // positivo = atrasado, 0 = em dia/antecipado
        }
      })

      // Ordenar: atrasados primeiro, depois por data
      lista.sort((a, b) => {
        if (b.dias_atraso !== a.dias_atraso) return b.dias_atraso - a.dias_atraso
        return a.next_visit_at.getTime() - b.next_visit_at.getTime()
      })

      setClientes(lista)
      setLoading(false)
    }

    carregar()
  }, [loadingCfg, rules])

  if (loading || loadingCfg || !rules) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 animate-pulse h-20"
          style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )

  if (clientes.length === 0) return (
    <div className="space-y-6">
      <LojasPrioridade />
      <div className="glass-card rounded-2xl p-16 text-center">
        <CalendarDays size={32} className="mx-auto mb-3" style={{ color: '#56577A' }} />
        <p className="text-white font-semibold">Nenhum cliente com prioridade definida</p>
        <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
          Defina a prioridade de visita em cada cliente para visualizar aqui.
        </p>
        <Link href="/clientes"
          className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
          Ir para Clientes
        </Link>
      </div>
    </div>
  )

  // Agrupar por semana
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const atrasados  = clientes.filter(c => c.dias_atraso > 0)
  const estaSemanaDados = clientes.filter(c => c.dias_atraso === 0 && sameWeek(c.next_visit_at, hoje))

  // Semanas futuras (próximas 6 semanas)
  const semanasMap = new Map<number, ClientePrio[]>()
  for (const c of clientes) {
    if (c.dias_atraso > 0) continue
    if (sameWeek(c.next_visit_at, hoje)) continue
    const monday = weekStart(c.next_visit_at).getTime()
    const diff   = Math.round((monday - weekStart(hoje).getTime()) / 604800000)
    if (diff > 6) continue   // só 6 semanas à frente
    if (!semanasMap.has(monday)) semanasMap.set(monday, [])
    semanasMap.get(monday)!.push(c)
  }
  const semanasFuturas = [...semanasMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, items]) => ({ monday: new Date(ts), items }))

  // Detectar conflitos: semanas com mais clientes que capacidade semanal
  const capSemana = capacidadeSemanal(rules)

  function temConflito(items: ClientePrio[]) {
    return items.length > capSemana
  }

  // Para card individual: conflito = mais de 1 cliente com MESMO dia exato calculado
  function clientesNaMesmaData(c: ClientePrio, lista: ClientePrio[]) {
    return lista.filter(x => x.id !== c.id && x.next_visit_at.toDateString() === c.next_visit_at.toDateString()).length > 0
  }

  return (
    <div className="space-y-6">

      {/* Prioridade de visita por PDV (lojas físicas) */}
      <LojasPrioridade />

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(p => {
          const pc  = PRIORITY_CFG[p]
          const cnt = clientes.filter(c => c.priority === p).length
          return (
            <div key={p} className="glass-card rounded-xl px-4 py-3"
              style={{ border: `1px solid ${pc.border}`, background: pc.bg }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: pc.color }}>P{p}</p>
              <p className="text-2xl font-bold text-white">{cnt}</p>
              <p className="text-xs" style={{ color: '#A0AEC0' }}>clientes</p>
            </div>
          )
        })}
      </div>

      {/* Atrasados */}
      {atrasados.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} style={{ color: '#FC8181' }} />
            <h2 className="font-bold text-white text-sm">Em atraso ({atrasados.length})</h2>
          </div>
          <div className="space-y-2">
            {atrasados.map(c => (
              <ClienteCard key={c.id} c={c} showConflict={clientesNaMesmaData(c, atrasados)} />
            ))}
          </div>
        </section>
      )}

      {/* Esta semana */}
      {estaSemanaDados.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={15} style={{ color: '#01B574' }} />
            <h2 className="font-bold text-white text-sm">Esta semana ({estaSemanaDados.length})</h2>
            {temConflito(estaSemanaDados) && (
              <span className="flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ color: '#F6AD55', background: 'rgba(246,173,85,0.15)', border: '1px solid rgba(246,173,85,0.25)' }}>
                <AlertTriangle size={10} /> Semana sobrecarregada
              </span>
            )}
          </div>
          <div className="space-y-2">
            {estaSemanaDados.map(c => (
              <ClienteCard key={c.id} c={c} showConflict={clientesNaMesmaData(c, estaSemanaDados)} />
            ))}
          </div>
        </section>
      )}

      {/* Semanas futuras */}
      {semanasFuturas.map(({ monday, items }) => (
        <section key={monday.getTime()}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={15} style={{ color: '#56577A' }} />
            <h2 className="font-bold text-white text-sm">{weekLabel(monday)} ({items.length})</h2>
            {temConflito(items) && (
              <span className="flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ color: '#F6AD55', background: 'rgba(246,173,85,0.15)', border: '1px solid rgba(246,173,85,0.25)' }}>
                <AlertTriangle size={10} /> Semana sobrecarregada
              </span>
            )}
          </div>
          <div className="space-y-2">
            {items.map(c => (
              <ClienteCard key={c.id} c={c} showConflict={clientesNaMesmaData(c, items)} />
            ))}
          </div>
        </section>
      ))}

      {/* Sem visitas próximas */}
      {atrasados.length === 0 && estaSemanaDados.length === 0 && semanasFuturas.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <CheckCircle size={28} className="mx-auto mb-3" style={{ color: '#01B574' }} />
          <p className="text-white font-semibold">Agenda em dia!</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>Nenhuma visita pendente nas próximas 6 semanas.</p>
        </div>
      )}
    </div>
  )
}
