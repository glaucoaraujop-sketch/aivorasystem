'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ScheduleClient {
  id: string
  client_id: string
  clients: {
    id: string
    name: string
    company_name: string | null
    city: string | null
  }
}

export interface VisitSchedule {
  id: string
  user_id: string
  name: string
  interval_days: number
  position: number
  schedule_clients: ScheduleClient[]
}

export interface ScheduleSettings {
  id: string
  user_id: string
  clients_per_day: number
  work_days: number[]
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

export function useVisitSchedules() {
  const [schedules, setSchedules] = useState<VisitSchedule[]>([])
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('visit_schedules') as any)
      .select('*, schedule_clients(id, client_id, clients(id, name, company_name, city))')
      .order('position', { ascending: true })
    setSchedules(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { schedules, loading, refetch: fetch }
}

export function useScheduleSettings() {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null)
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('schedule_settings') as any)
      .select('*').maybeSingle()
    setSettings(data ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { settings, loading, refetch: fetch }
}

// ─── Mutações ─────────────────────────────────────────────────────────────────

export function useVisitSchedulesMutations() {
  const supabase = createClient()

  async function userId() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    return user.id
  }

  async function criarCronograma(name: string, interval_days: number, position: number) {
    const uid = await userId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('visit_schedules') as any)
      .insert({ user_id: uid, name, interval_days, position })
      .select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function atualizarCronograma(id: string, fields: { name?: string; interval_days?: number }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('visit_schedules') as any)
      .update(fields).eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function removerCronograma(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('visit_schedules') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function adicionarCliente(schedule_id: string, client_id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('schedule_clients') as any)
      .insert({ schedule_id, client_id })
    if (error) throw new Error(error.message)
  }

  async function removerCliente(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('schedule_clients') as any).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async function salvarSettings(fields: { clients_per_day?: number; work_days?: number[] }) {
    const uid = await userId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('schedule_settings') as any)
      .upsert({ user_id: uid, ...fields }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }

  return {
    criarCronograma, atualizarCronograma, removerCronograma,
    adicionarCliente, removerCliente, salvarSettings,
  }
}

// ─── Algoritmo de geração de agenda ──────────────────────────────────────────

export interface AgendaSlot {
  date: Date
  items: {
    clientId: string
    clientName: string
    companyName: string | null
    city: string | null
    scheduleName: string
    intervalDays: number
    overdue: boolean
  }[]
}

export interface AgendaSemana {
  label: string       // "Semana 1 (14/05 – 18/05)"
  slots: AgendaSlot[]
}

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatShort(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Recebe os cronogramas, configurações e a data da última visita de cada cliente.
 * Devolve 4 semanas de agenda distribuídas respeitando:
 * - intervalo de cada cronograma
 * - clientes por dia
 * - dias úteis configurados
 * Clientes sem histórico são agendados a partir de hoje.
 */
export function gerarAgenda(
  schedules: VisitSchedule[],
  settings: ScheduleSettings,
  lastVisitDates: Record<string, string>, // client_id -> ISO date da última visita realizada
): AgendaSemana[] {
  const today = stripTime(new Date())

  // 1. Montar lista de visitas pendentes com data ideal
  const pending: {
    clientId: string
    clientName: string
    companyName: string | null
    city: string | null
    scheduleName: string
    intervalDays: number
    idealDate: Date
    overdue: boolean
  }[] = []

  for (const sch of schedules) {
    for (const sc of sch.schedule_clients) {
      const c = sc.clients
      const lastRaw = lastVisitDates[sc.client_id]
      let idealDate: Date
      let overdue = false

      if (!lastRaw) {
        idealDate = new Date(today)
      } else {
        const last = stripTime(new Date(lastRaw))
        idealDate = addDays(last, sch.interval_days)
        if (idealDate < today) { idealDate = new Date(today); overdue = true }
      }

      pending.push({
        clientId: sc.client_id,
        clientName: c.name,
        companyName: c.company_name,
        city: c.city,
        scheduleName: sch.name,
        intervalDays: sch.interval_days,
        idealDate,
        overdue,
      })
    }
  }

  // 2. Ordenar por data ideal (mais urgente primeiro; clientes vencidos ficam no topo)
  pending.sort((a, b) => a.idealDate.getTime() - b.idealDate.getTime())

  // 3. Montar slots dos próximos 28 dias (apenas dias úteis)
  const workDays = new Set(settings.work_days)
  const slots: AgendaSlot[] = []
  for (let i = 0; i < 28; i++) {
    const d = addDays(today, i)
    if (workDays.has(d.getDay())) {
      slots.push({ date: d, items: [] })
    }
  }

  // 4. Distribuir clientes nos slots
  for (const p of pending) {
    // Primeiro slot disponível na data ideal ou depois, com vagas
    const slot = slots.find(s =>
      s.date >= p.idealDate && s.items.length < settings.clients_per_day
    )
    if (slot) {
      slot.items.push({
        clientId:    p.clientId,
        clientName:  p.clientName,
        companyName: p.companyName,
        city:        p.city,
        scheduleName: p.scheduleName,
        intervalDays: p.intervalDays,
        overdue:     p.overdue,
      })
    }
  }

  // 5. Agrupar em 4 semanas
  const semanas: AgendaSemana[] = []
  for (let w = 0; w < 4; w++) {
    const inicio = addDays(today, w * 7)
    const fim    = addDays(today, w * 7 + 6)
    const weekSlots = slots.filter(s => s.date >= inicio && s.date <= fim)

    semanas.push({
      label: `Semana ${w + 1} (${DIAS_PT[inicio.getDay()]} ${formatShort(inicio)} – ${DIAS_PT[fim.getDay()]} ${formatShort(fim)})`,
      slots: weekSlots,
    })
  }

  return semanas
}
