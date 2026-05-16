'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, CheckCircle, AlertTriangle, Calendar, MapPin, Users } from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'

const PRIORITY_CONFIG = [
  { key: 1, label: 'Prioridade 1', desc: 'Clientes VIP — visita mais frequente',     color: '#0075FF', bg: 'rgba(0,117,255,0.12)',   border: 'rgba(0,117,255,0.25)'   },
  { key: 2, label: 'Prioridade 2', desc: 'Clientes ativos — cadência regular',        color: '#01B574', bg: 'rgba(1,181,116,0.12)',   border: 'rgba(1,181,116,0.25)'   },
  { key: 3, label: 'Prioridade 3', desc: 'Clientes em desenvolvimento',               color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  border: 'rgba(246,173,85,0.25)'  },
  { key: 4, label: 'Prioridade 4', desc: 'Clientes de baixa frequência',              color: '#A0AEC0', bg: 'rgba(160,174,192,0.12)', border: 'rgba(160,174,192,0.2)'  },
]

const cardStyle = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function ConfiguracoesPage() {
  const { settings, loading, salvar } = useSystemSettings()

  const [days,    setDays]    = useState({ p1: 15, p2: 30, p3: 45, p4: 60 })
  const [perDay,  setPerDay]  = useState(5)
  const [saving,  setSaving]  = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro,    setErro]    = useState('')

  useEffect(() => {
    if (!loading) {
      setDays({
        p1: settings.priority_1_days,
        p2: settings.priority_2_days,
        p3: settings.priority_3_days,
        p4: settings.priority_4_days,
      })
      setPerDay(settings.clients_per_day)
    }
  }, [loading, settings])

  async function handleSalvar() {
    setSaving(true); setErro(''); setSucesso(false)
    try {
      await salvar({
        priority_1_days: days.p1,
        priority_2_days: days.p2,
        priority_3_days: days.p3,
        priority_4_days: days.p4,
        clients_per_day: perDay,
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

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,117,255,0.12)' }}>
          <Settings size={22} style={{ color: '#0075FF' }} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Configurações</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Preferências do sistema de representação</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Prioridades de visita */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} style={{ color: '#0075FF' }} />
            <h2 className="font-bold text-white text-base">Prioridades de Visita</h2>
          </div>
          <p className="text-sm mb-6" style={{ color: '#A0AEC0' }}>
            Defina de quantos em quantos dias cada nível de prioridade deve receber uma visita.
          </p>

          <div className="space-y-3">
            {PRIORITY_CONFIG.map((p, i) => (
              <div key={p.key} className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                {/* Badge */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black"
                  style={{ background: p.color, color: '#ffffff' }}>
                  P{p.key}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white">{p.label}</p>
                  <p className="text-xs" style={{ color: '#A0AEC0' }}>{p.desc}</p>
                </div>

                {/* Input de dias */}
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

          {/* Aviso de ordenação lógica */}
          {(days.p1 >= days.p2 || days.p2 >= days.p3 || days.p3 >= days.p4) && (
            <div className="flex items-start gap-2 mt-4 rounded-xl px-4 py-3"
              style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#FC8181' }} />
              <p className="text-xs" style={{ color: '#FC8181' }}>
                P1 deve ter menos dias que P2, P2 menos que P3 e assim por diante (P1 é a mais frequente).
              </p>
            </div>
          )}
        </section>

        {/* Capacidade diária */}
        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} style={{ color: '#01B574' }} />
            <h2 className="font-bold text-white text-base">Capacidade de Visitas</h2>
          </div>
          <p className="text-sm mb-5" style={{ color: '#A0AEC0' }}>
            Quantos clientes você consegue visitar por dia. Usado para alertas de sobrecarga na agenda.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(1,181,116,0.15)' }}>
              <Users size={15} style={{ color: '#01B574' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Visitas por dia</p>
              <p className="text-xs" style={{ color: '#A0AEC0' }}>Máximo de clientes por dia útil</p>
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

        {/* Botão */}
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
