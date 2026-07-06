'use client'

import { useEffect, useState } from 'react'
import { Save, CheckCircle, AlertTriangle, Plus, Trash2, Calendar, Layers, SlidersHorizontal, Gauge } from 'lucide-react'
import { useBusinessRules } from '@/hooks/useBusinessRules'
import type { BusinessRules, PriorityLevel, ScoreWeights } from '@/lib/planner/types'

const card = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const DIAS: [string, string][] = [
  ['segunda', 'Seg'], ['terca', 'Ter'], ['quarta', 'Qua'], ['quinta', 'Qui'],
  ['sexta', 'Sex'], ['sabado', 'Sáb'], ['domingo', 'Dom'],
]

const PESOS: { key: keyof ScoreWeights; label: string; hint: string }[] = [
  { key: 'priority_weight',           label: 'Peso da classificação',      hint: 'multiplica o peso do nível' },
  { key: 'days_since_visit',          label: 'Peso: dias sem visita',      hint: 'quanto mais tempo, maior o score' },
  { key: 'pdvs',                      label: 'Peso: nº de PDVs',           hint: 'clientes com mais lojas sobem' },
  { key: 'potencial',                label: 'Peso: potencial comercial',  hint: '0 = ignorar (sem dado hoje)' },
  { key: 'faturamento',              label: 'Peso: faturamento',          hint: 'valor em R$ (peso pequeno)' },
  { key: 'recent_visit_penalty',     label: 'Penalidade: visita recente', hint: 'reduz score de quem foi visitado há pouco' },
  { key: 'already_scheduled_penalty', label: 'Penalidade: já agendado',    hint: 'evita reagendar quem já tem visita' },
]

function num(v: string, decimal = false): number {
  const n = decimal ? parseFloat(v) : parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}

export function BusinessRulesForm() {
  const { rules, loading, salvar } = useBusinessRules()
  const [draft, setDraft] = useState<BusinessRules | null>(null)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => { if (rules) setDraft(structuredClone(rules)) }, [rules])

  if (loading || !draft) {
    return <div className="rounded-2xl p-8 text-center text-sm" style={{ ...card, color: '#A0AEC0' }}>Carregando regras…</div>
  }

  const capacidade = draft.working_days.length * (draft.visits_per_day || 0)

  const set = <K extends keyof BusinessRules>(k: K, v: BusinessRules[K]) =>
    setDraft(d => (d ? { ...d, [k]: v } : d))

  const toggleDia = (dia: string) =>
    setDraft(d => {
      if (!d) return d
      const has = d.working_days.includes(dia)
      const working_days = has ? d.working_days.filter(x => x !== dia) : [...d.working_days, dia]
      // reordena na ordem da semana
      const ordem = DIAS.map(([k]) => k)
      working_days.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
      return { ...d, working_days }
    })

  const setNivel = (i: number, patch: Partial<PriorityLevel>) =>
    setDraft(d => {
      if (!d) return d
      const priority_levels = d.priority_levels.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
      return { ...d, priority_levels }
    })

  const addNivel = () =>
    setDraft(d => {
      if (!d) return d
      const nextId = Math.max(0, ...d.priority_levels.map(l => l.id)) + 1
      const novo: PriorityLevel = { id: nextId, name: `Nível ${nextId}`, ideal_days: 30, tolerance_days: 3, priority_weight: 50, enabled: true }
      return { ...d, priority_levels: [...d.priority_levels, novo] }
    })

  const removeNivel = (i: number) =>
    setDraft(d => (d ? { ...d, priority_levels: d.priority_levels.filter((_, idx) => idx !== i) } : d))

  const setPeso = (k: keyof ScoreWeights, v: number) =>
    setDraft(d => (d ? { ...d, score_weights: { ...d.score_weights, [k]: v } } : d))

  async function handleSalvar() {
    if (!draft) return
    setSaving(true); setErro(''); setSucesso(false)
    try {
      await salvar(draft)
      setSucesso(true); setTimeout(() => setSucesso(false), 2500)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-xs -mt-2" style={{ color: '#56577A' }}>
        Estas regras alimentam o <strong style={{ color: '#9F7AEA' }}>AIVA Planner</strong>. Qualquer alteração muda o planejamento — sem precisar de código.
      </p>

      {/* Capacidade */}
      <section className="rounded-2xl p-6 space-y-4" style={card}>
        <div className="flex items-center gap-2"><Calendar size={16} style={{ color: '#0075FF' }} /><h2 className="font-bold text-white text-base">Dias & Capacidade</h2></div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#A0AEC0' }}>Dias úteis de visita</label>
          <div className="flex gap-2 flex-wrap">
            {DIAS.map(([key, lbl]) => {
              const on = draft.working_days.includes(key)
              return (
                <button key={key} type="button" onClick={() => toggleDia(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={on
                    ? { background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {lbl}
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Visitas por dia (PDVs)</label>
            <input type="number" min={1} value={draft.visits_per_day}
              onChange={e => set('visits_per_day', num(e.target.value))}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div className="flex items-end">
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-2 w-full" style={{ background: 'rgba(159,122,234,0.1)', border: '1px solid rgba(159,122,234,0.2)' }}>
              <Gauge size={15} style={{ color: '#9F7AEA' }} />
              <span className="text-sm text-white font-semibold">Capacidade semanal: {capacidade} PDVs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Níveis de prioridade */}
      <section className="rounded-2xl p-6 space-y-4" style={card}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Layers size={16} style={{ color: '#F6AD55' }} /><h2 className="font-bold text-white text-base">Níveis de Prioridade</h2></div>
          <button type="button" onClick={addNivel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
            <Plus size={12} /> Adicionar nível
          </button>
        </div>
        <p className="text-xs" style={{ color: '#56577A' }}>
          Nome é só visual (crie qualquer classificação: VIP/Ouro, A/B/C, Estratégico…). O motor decide por <em>cadência ideal</em>, <em>tolerância</em> e <em>peso</em>.
        </p>
        <div className="space-y-2">
          {draft.priority_levels.map((lvl, i) => (
            <div key={lvl.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#56577A' }}>Nome</label>
                  <input value={lvl.name} onChange={e => setNivel(i, { name: e.target.value })} className="input-dark w-full px-2.5 py-1.5 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#56577A' }}>Ideal (dias)</label>
                  <input type="number" min={1} value={lvl.ideal_days} onChange={e => setNivel(i, { ideal_days: num(e.target.value) })} className="input-dark w-full px-2.5 py-1.5 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#56577A' }}>Tolerância</label>
                  <input type="number" min={0} value={lvl.tolerance_days} onChange={e => setNivel(i, { tolerance_days: num(e.target.value) })} className="input-dark w-full px-2.5 py-1.5 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: '#56577A' }}>Peso</label>
                  <input type="number" value={lvl.priority_weight} onChange={e => setNivel(i, { priority_weight: num(e.target.value) })} className="input-dark w-full px-2.5 py-1.5 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: '#A0AEC0' }}>
                    <input type="checkbox" checked={lvl.enabled} onChange={e => setNivel(i, { enabled: e.target.checked })} className="w-4 h-4 accent-blue-500 bg-transparent" />
                    Ativo
                  </label>
                  <button type="button" onClick={() => removeNivel(i)} title="Remover" style={{ color: '#56577A' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FC8181')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#56577A')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {draft.priority_levels.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: '#56577A' }}>Nenhum nível. Clique em “Adicionar nível”.</p>
          )}
        </div>
      </section>

      {/* Pesos do score */}
      <section className="rounded-2xl p-6 space-y-4" style={card}>
        <div className="flex items-center gap-2"><SlidersHorizontal size={16} style={{ color: '#01B574' }} /><h2 className="font-bold text-white text-base">Pesos do Score</h2></div>
        <p className="text-xs" style={{ color: '#56577A' }}>Como cada fator influencia a prioridade de um cliente na agenda.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PESOS.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: '#A0AEC0' }}>{label}</label>
              <input type="number" step="any" value={draft.score_weights[key]}
                onChange={e => setPeso(key, num(e.target.value, true))}
                className="input-dark w-full px-3 py-2 rounded-xl text-sm" />
              <p className="text-[11px] mt-0.5" style={{ color: '#56577A' }}>{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {(erro || sucesso) && (
        <div className="flex items-center gap-2 text-sm rounded-xl p-3"
          style={sucesso
            ? { color: '#01B574', background: 'rgba(1,181,116,0.1)', border: '1px solid rgba(1,181,116,0.2)' }
            : { color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
          {sucesso ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {sucesso ? 'Regras salvas — o AIVA Planner já usa as novas regras.' : erro}
        </div>
      )}

      <button type="button" onClick={handleSalvar} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
        <Save size={15} /> {saving ? 'Salvando…' : 'Salvar regras'}
      </button>
    </div>
  )
}
