'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Settings, X, Check, Edit2 } from 'lucide-react'
import {
  useVisitSchedules, useScheduleSettings,
  useVisitSchedulesMutations, type VisitSchedule,
} from '@/hooks/useVisitSchedules'
import { createClient } from '@/lib/supabase/client'

interface ClienteOpt { id: string; name: string; company_name: string | null; city: string | null }

const DIAS_SEMANA = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const POSITION_COLORS: Record<number, { color: string; bg: string; border: string }> = {
  1: { color: '#0075FF', bg: 'rgba(0,117,255,0.12)',    border: 'rgba(0,117,255,0.3)'    },
  2: { color: '#01B574', bg: 'rgba(1,181,116,0.12)',    border: 'rgba(1,181,116,0.3)'    },
  3: { color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',   border: 'rgba(246,173,85,0.3)'   },
  4: { color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)',  border: 'rgba(159,122,234,0.3)'  },
}

// ─── Painel de configurações ──────────────────────────────────────────────────
function ConfigPanel() {
  const { settings, refetch } = useScheduleSettings()
  const { salvarSettings }    = useVisitSchedulesMutations()

  const [clientesPerDia, setClientesPerDia] = useState(5)
  const [workDays, setWorkDays]             = useState<number[]>([1, 2, 3, 4, 5])
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [erro, setErro]                     = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setClientesPerDia(settings.clients_per_day)
      setWorkDays(settings.work_days)
    }
  }, [settings])

  function toggleDia(d: number) {
    setWorkDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function salvar() {
    setSaving(true)
    setErro(null)
    try {
      await salvarSettings({ clients_per_day: clientesPerDia, work_days: workDays })
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar configurações')
    } finally { setSaving(false) }
  }

  return (
    <div className="glass-card rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={15} style={{ color: '#A0AEC0' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
            Configurações da Agenda
          </p>
        </div>
        <button onClick={salvar} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all hover:opacity-90 text-white"
          style={{ background: saved ? 'linear-gradient(135deg, #01B574 0%, #00875A 100%)' : 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
          {saved ? <><Check size={12} /> Salvo</> : saving ? 'Salvando…' : <><Check size={12} /> Salvar</>}
        </button>
      </div>
      {erro && (
        <p className="text-xs mt-2 px-1" style={{ color: '#FC8181' }}>⚠ {erro}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>
            Clientes por dia
          </label>
          <div className="flex items-center gap-2">
            <button onClick={() => setClientesPerDia(v => Math.max(1, v - 1))}
              className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#A0AEC0' }}>−</button>
            <span className="text-2xl font-bold text-white w-8 text-center">{clientesPerDia}</span>
            <button onClick={() => setClientesPerDia(v => Math.min(20, v + 1))}
              className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#A0AEC0' }}>+</button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>
            Dias de visitação
          </label>
          <div className="flex gap-1.5">
            {DIAS_SEMANA.map(d => (
              <button key={d.value} onClick={() => toggleDia(d.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={workDays.includes(d.value)
                  ? { background: 'rgba(0,117,255,0.2)', color: '#0075FF', border: '1px solid rgba(0,117,255,0.4)' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#56577A', border: '1px solid rgba(255,255,255,0.08)' }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card de um cronograma ────────────────────────────────────────────────────
function CronogramaCard({
  schedule, onRefetch,
}: {
  schedule: VisitSchedule
  onRefetch: () => void
}) {
  const { atualizarCronograma, removerCronograma, adicionarCliente, removerCliente } = useVisitSchedulesMutations()
  const supabase = createClient()

  const accent = POSITION_COLORS[schedule.position] ?? POSITION_COLORS[1]

  const [editandoNome, setEditandoNome]       = useState(false)
  const [editandoDias, setEditandoDias]       = useState(false)
  const [nomeEdit, setNomeEdit]               = useState(schedule.name)
  const [diasEdit, setDiasEdit]               = useState(String(schedule.interval_days))
  const [busca, setBusca]                     = useState('')
  const [opcoes, setOpcoes]                   = useState<ClienteOpt[]>([])
  const [showBusca, setShowBusca]             = useState(false)
  const [saving, setSaving]                   = useState(false)

  // IDs já vinculados a QQ cronograma — para bloquear duplicata (via prop não temos todos, mas o DB rejeita)
  const clientesIds = new Set(schedule.schedule_clients.map(sc => sc.client_id))

  useEffect(() => {
    if (busca.length < 2) { setOpcoes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name, city')
      .or(`name.ilike.%${busca}%,company_name.ilike.%${busca}%`)
      .eq('active', true).limit(6)
      .then(({ data }: { data: ClienteOpt[] }) => setOpcoes(data ?? []))
  }, [busca])

  async function salvarNome() {
    if (nomeEdit.trim()) await atualizarCronograma(schedule.id, { name: nomeEdit.trim() })
    setEditandoNome(false)
    onRefetch()
  }

  async function salvarDias() {
    const d = parseInt(diasEdit)
    if (d > 0) await atualizarCronograma(schedule.id, { interval_days: d })
    setEditandoDias(false)
    onRefetch()
  }

  async function addCliente(c: ClienteOpt) {
    if (clientesIds.has(c.id)) return
    setSaving(true)
    try { await adicionarCliente(schedule.id, c.id) }
    finally { setSaving(false); setBusca(''); setOpcoes([]); setShowBusca(false); onRefetch() }
  }

  async function removeCliente(id: string) {
    await removerCliente(id)
    onRefetch()
  }

  async function deletarCronograma() {
    if (!confirm(`Remover "${schedule.name}" e todos os clientes vinculados?`)) return
    await removerCronograma(schedule.id)
    onRefetch()
  }

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4"
      style={{ borderTop: `3px solid ${accent.color}` }}>

      {/* Header do card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editandoNome ? (
            <div className="flex items-center gap-2">
              <input value={nomeEdit} onChange={e => setNomeEdit(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditandoNome(false) }}
                autoFocus className="input-dark flex-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold" />
              <button onClick={salvarNome} className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ color: '#01B574' }}><Check size={14} /></button>
              <button onClick={() => setEditandoNome(false)} className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ color: '#A0AEC0' }}><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white text-base truncate">{schedule.name}</p>
              <button onClick={() => { setNomeEdit(schedule.name); setEditandoNome(true) }}
                className="p-1 transition-opacity hover:opacity-60 flex-shrink-0"
                style={{ color: '#56577A' }}><Edit2 size={12} /></button>
            </div>
          )}

          {/* Intervalo */}
          <div className="flex items-center gap-1.5 mt-1">
            {editandoDias ? (
              <div className="flex items-center gap-1.5">
                <input type="number" min="1" value={diasEdit}
                  onChange={e => setDiasEdit(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') salvarDias(); if (e.key === 'Escape') setEditandoDias(false) }}
                  autoFocus className="input-dark w-16 px-2 py-1 rounded-lg text-sm text-center" />
                <span className="text-xs" style={{ color: '#56577A' }}>dias</span>
                <button onClick={salvarDias}
                  className="p-1 rounded transition-all hover:opacity-80" style={{ color: '#01B574' }}>
                  <Check size={12} />
                </button>
                <button onClick={() => setEditandoDias(false)}
                  className="p-1 rounded transition-all hover:opacity-80" style={{ color: '#A0AEC0' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => { setDiasEdit(String(schedule.interval_days)); setEditandoDias(true) }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80"
                style={{ color: accent.color, background: accent.bg, border: `1px solid ${accent.border}` }}>
                a cada {schedule.interval_days} dias
                <Edit2 size={10} />
              </button>
            )}
          </div>
        </div>

        <button onClick={deletarCronograma}
          className="p-1.5 rounded-lg flex-shrink-0 transition-all"
          style={{ color: '#56577A' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-1.5">
        {schedule.schedule_clients.length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: '#56577A' }}>
            Nenhum cliente adicionado
          </p>
        )}
        {schedule.schedule_clients.map(sc => (
          <div key={sc.id}
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{sc.clients.name}</p>
              {(sc.clients.company_name || sc.clients.city) && (
                <p className="text-xs truncate" style={{ color: '#56577A' }}>
                  {[sc.clients.company_name, sc.clients.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button onClick={() => removeCliente(sc.id)}
              className="ml-2 p-1 flex-shrink-0 transition-all"
              style={{ color: '#56577A' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Busca de clientes */}
      {showBusca ? (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
          <input autoFocus value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="input-dark w-full pl-8 pr-8 py-2 rounded-xl text-sm" />
          <button onClick={() => { setShowBusca(false); setBusca(''); setOpcoes([]) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#56577A' }}><X size={13} /></button>
          {opcoes.length > 0 && (
            <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: 'rgba(6,11,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {opcoes.map(c => (
                <button key={c.id} type="button"
                  onClick={() => addCliente(c)}
                  disabled={saving || clientesIds.has(c.id)}
                  className="w-full text-left px-4 py-2.5 transition-colors disabled:opacity-40"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => !clientesIds.has(c.id) && ((e.currentTarget as HTMLElement).style.background = 'rgba(0,117,255,0.1)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  {c.company_name && <p className="text-xs" style={{ color: '#A0AEC0' }}>{c.company_name}</p>}
                  {clientesIds.has(c.id) && <p className="text-xs" style={{ color: '#F6AD55' }}>Já adicionado</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setShowBusca(true)}
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: accent.color }}>
          <Plus size={14} /> Adicionar cliente
        </button>
      )}
    </div>
  )
}

// ─── Tab principal ────────────────────────────────────────────────────────────
export default function CronogramasTab() {
  const { schedules, loading, refetch } = useVisitSchedules()
  const { criarCronograma }             = useVisitSchedulesMutations()
  const [criando, setCriando]           = useState(false)
  const [erroCriar, setErroCriar]       = useState<string | null>(null)

  const positionsUsed = new Set(schedules.map(s => s.position))
  const nextPosition  = ([1, 2, 3, 4] as const).find(p => !positionsUsed.has(p))

  async function adicionar() {
    if (!nextPosition) return
    setCriando(true)
    setErroCriar(null)
    try {
      const nomes = ['Prioridade Alta', 'Prioridade Média', 'Prioridade Baixa', 'Cronograma 4']
      const intervalos = [15, 30, 45, 60]
      await criarCronograma(
        nomes[nextPosition - 1],
        intervalos[nextPosition - 1],
        nextPosition,
      )
      await refetch()
    } catch (e) {
      setErroCriar(e instanceof Error ? e.message : 'Erro ao criar cronograma')
    } finally { setCriando(false) }
  }

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 animate-pulse h-48"
          style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <ConfigPanel />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {schedules.map(s => (
          <CronogramaCard key={s.id} schedule={s} onRefetch={refetch} />
        ))}

        {nextPosition && (
          <div className="flex flex-col gap-2">
            <button onClick={adicionar} disabled={criando}
              className="glass-card rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all min-h-40 disabled:opacity-50"
              style={{ border: '2px dashed rgba(255,255,255,0.1)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,117,255,0.4)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,117,255,0.12)' }}>
                <Plus size={20} style={{ color: '#0075FF' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#A0AEC0' }}>
                {criando ? 'Criando…' : `Adicionar Cronograma ${nextPosition}`}
              </p>
            </button>
            {erroCriar && (
              <p className="text-xs text-center" style={{ color: '#FC8181' }}>⚠ {erroCriar}</p>
            )}
          </div>
        )}
      </div>

      {schedules.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: '#56577A' }}>
          Clique no botão acima para criar seu primeiro cronograma de visitação.
        </p>
      )}
    </div>
  )
}
