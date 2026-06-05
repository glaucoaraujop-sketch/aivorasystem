'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, AlertTriangle, Calendar, MapPin, Users } from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'

type VisitDays = {
  visit_sun: boolean; visit_mon: boolean; visit_tue: boolean
  visit_wed: boolean; visit_thu: boolean; visit_fri: boolean; visit_sat: boolean
}

const PRIORITY_CONFIG = [
  { key: 1, label: 'P1 VIP',    desc: 'Visita mais frequente',  color: '#0075FF', bg: 'rgba(0,117,255,0.12)',   border: 'rgba(0,117,255,0.25)'   },
  { key: 2, label: 'P2 Ouro',   desc: 'Cadência regular',       color: '#01B574', bg: 'rgba(1,181,116,0.12)',   border: 'rgba(1,181,116,0.25)'   },
  { key: 3, label: 'P3 Prata',  desc: 'Em desenvolvimento',     color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  border: 'rgba(246,173,85,0.25)'  },
  { key: 4, label: 'P4 Bronze', desc: 'Baixa frequência',       color: '#A0AEC0', bg: 'rgba(160,174,192,0.12)', border: 'rgba(160,174,192,0.2)'  },
]

const WEEK_DAYS: { key: keyof VisitDays; label: string; short: string }[] = [
  { key: 'visit_sun', label: 'Domingo',  short: 'D' },
  { key: 'visit_mon', label: 'Segunda',  short: 'S' },
  { key: 'visit_tue', label: 'Terça',    short: 'T' },
  { key: 'visit_wed', label: 'Quarta',   short: 'Q' },
  { key: 'visit_thu', label: 'Quinta',   short: 'Q' },
  { key: 'visit_fri', label: 'Sexta',    short: 'S' },
  { key: 'visit_sat', label: 'Sábado',   short: 'S' },
]

const cardStyle = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function ConfiguracoesPage() {
  const { settings, loading, salvar } = useSystemSettings()

  const [days,     setDays]     = useState({ p1: 15, p2: 30, p3: 45, p4: 60 })
  const [perDay,   setPerDay]   = useState(5)
  const [visitDays, setVisitDays] = useState<VisitDays>({
    visit_sun: false, visit_mon: true, visit_tue: true,
    visit_wed: true,  visit_thu: true, visit_fri: true, visit_sat: false,
  })
  const [saving,   setSaving]   = useState(false)
  const [sucesso,  setSucesso]  = useState(false)
  const [erro,     setErro]     = useState('')

  useEffect(() => {
    if (!loading) {
      setDays({
        p1: settings.priority_1_days,
        p2: settings.priority_2_days,
        p3: settings.priority_3_days,
        p4: settings.priority_4_days,
      })
      setPerDay(settings.clients_per_day)
      setVisitDays({
        visit_sun: settings.visit_sun,
        visit_mon: settings.visit_mon,
        visit_tue: settings.visit_tue,
        visit_wed: settings.visit_wed,
        visit_thu: settings.visit_thu,
        visit_fri: settings.visit_fri,
        visit_sat: settings.visit_sat,
      })
    }
  }, [loading, settings])

  const activeDays = WEEK_DAYS.filter(d => visitDays[d.key]).length

  async function handleSalvar() {
    if (activeDays === 0) {
      setErro('Selecione pelo menos um dia de visita.')
      return
    }
    setSaving(true); setErro(''); setSucesso(false)
    try {
      await salvar({
        priority_1_days: days.p1,
        priority_2_days: days.p2,
        priority_3_days: days.p3,
        priority_4_days: days.p4,
        clients_per_day: perDay,
        ...visitDays,
      })
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const daysMap = [days.p1, days.p2, days.p3, days.p4]
  const setDay  = (i: number, v: number) =>
    setDays(prev => ({ ...prev, [(['p1','p2','p3','p4'] as const)[i]]: v }))

  function toggleDay(key: keyof VisitDays) {
    setVisitDays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,117,255,0.12)' }}>
          <Settings size={22} style={{ color: '#0075FF' }} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Configurações</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Preferências do sistema de representação</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Dias de visita */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} style={{ color: '#9F7AEA' }} />
            <h2 className="font-bold text-white text-base">Dias de Visita</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Selecione os dias da semana em que você realiza visitas a clientes.
            O sistema usará esses dias para calcular a próxima visita de cada prioridade.
          </p>

          <div className="flex gap-2 flex-wrap">
            {WEEK_DAYS.map(d => {
              const active = !!visitDays[d.key]
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className="flex flex-col items-center gap-1 w-[calc(14.28%-8px)] min-w-[52px] py-3 rounded-xl font-semibold transition-all"
                  style={active ? {
                    background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(0,117,255,0.35)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    color: '#56577A',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-base font-semibold">{d.short}</span>
                  <span className="text-xs font-medium hidden sm:block"
                    style={{ color: active ? 'rgba(255,255,255,0.8)' : '#56577A' }}>
                    {d.label.slice(0, 3)}
                  </span>
                </button>
              )
            })}
          </div>

          {activeDays > 0 && (
            <p className="text-xs mt-4" style={{ color: '#A0AEC0' }}>
              <span className="font-semibold text-white">{activeDays} dias</span> selecionados ·{' '}
              capacidade semanal de{' '}
              <span className="font-semibold text-white">{activeDays * perDay} visitas</span>
            </p>
          )}

          {activeDays === 0 && (
            <div className="flex items-center gap-2 mt-4 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <AlertTriangle size={13} style={{ color: '#FC8181' }} />
              <p className="text-xs" style={{ color: '#FC8181' }}>Selecione pelo menos um dia.</p>
            </div>
          )}
        </section>

        {/* Prioridades de visita */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} style={{ color: '#0075FF' }} />
            <h2 className="font-bold text-white text-base">Prioridades de Visita</h2>
          </div>
          <p className="text-sm mb-6" style={{ color: '#A0AEC0' }}>
            Intervalo em dias entre visitas para cada nível de prioridade.
          </p>

          <div className="space-y-3">
            {PRIORITY_CONFIG.map((p, i) => (
              <div key={p.key} className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                  style={{ background: p.color, color: '#ffffff' }}>
                  P{p.key}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">{p.label}</p>
                  <p className="text-xs" style={{ color: '#A0AEC0' }}>{p.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>a cada</p>
                  <input
                    type="number" min={1} max={365}
                    value={daysMap[i]}
                    onChange={e => setDay(i, parseInt(e.target.value) || 1)}
                    className="input-dark w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold"
                    style={{ color: p.color }}
                  />
                  <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>dias</p>
                </div>
              </div>
            ))}
          </div>

          {(days.p1 >= days.p2 || days.p2 >= days.p3 || days.p3 >= days.p4) && (
            <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3"
              style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#FC8181' }} />
              <p className="text-xs" style={{ color: '#FC8181' }}>
                P1 deve ter menos dias que P2, P2 menos que P3 e assim por diante.
              </p>
            </div>
          )}
        </section>

        {/* Capacidade diária */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} style={{ color: '#01B574' }} />
            <h2 className="font-bold text-white text-base">Capacidade de Visitas</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Quantos clientes você consegue visitar por dia. Usado para alertas de sobrecarga.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Visitas por dia</p>
              <p className="text-xs" style={{ color: '#A0AEC0' }}>Máximo de clientes por dia de visita</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="number" min={1} max={50}
                value={perDay}
                onChange={e => setPerDay(parseInt(e.target.value) || 1)}
                className="input-dark w-16 px-2 py-1.5 rounded-lg text-sm text-center font-bold"
                style={{ color: '#01B574' }}
              />
              <p className="text-xs font-medium" style={{ color: '#A0AEC0' }}>por dia</p>
            </div>
          </div>
        </section>

        {/* Feedback */}
        {erro && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
            <AlertTriangle size={15} style={{ color: '#FC8181' }} />
            <p className="text-sm" style={{ color: '#FC8181' }}>{erro}</p>
          </div>
        )}
        {sucesso && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{ background: 'rgba(1,181,116,0.1)', border: '1px solid rgba(1,181,116,0.25)' }}>
            <CheckCircle size={15} style={{ color: '#01B574' }} />
            <p className="text-sm" style={{ color: '#01B574' }}>Configurações salvas com sucesso!</p>
          </div>
        )}

        <button
          onClick={handleSalvar}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
          <Save size={15} />
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
