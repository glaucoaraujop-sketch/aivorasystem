'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft } from 'lucide-react'
import { useVisitasMutations } from '@/hooks/useVisitas'
import { createClient } from '@/lib/supabase/client'

interface ClienteOption { id: string; name: string; company_name: string | null; city: string | null }

export default function NovaVisitaPage() {
  const router   = useRouter()
  const { criar } = useVisitasMutations()
  const supabase  = createClient()

  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientes, setClientes]         = useState<ClienteOption[]>([])
  const [clienteSel, setClienteSel]     = useState<ClienteOption | null>(null)
  const [scheduledAt, setScheduledAt]   = useState('')
  const [objective, setObjective]       = useState('')
  const [notes, setNotes]               = useState('')

  const minDatetime = new Date().toISOString().slice(0, 16)

  useEffect(() => {
    if (clienteBusca.length < 2) { setClientes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name, city')
      .or(`name.ilike.%${clienteBusca}%,company_name.ilike.%${clienteBusca}%`)
      .eq('active', true).limit(6)
      .then(({ data }: { data: ClienteOption[] }) => setClientes(data ?? []))
  }, [clienteBusca])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteSel)    { setError('Selecione um cliente'); return }
    if (!scheduledAt)   { setError('Informe data e hora'); return }
    setSaving(true); setError('')
    try {
      await criar({
        client_id:    clienteSel.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        objective:    objective || undefined,
        notes:        notes || undefined,
      })
      router.push('/visitas')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const sectionStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="max-w-xl w-full">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/visitas')}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white">Agendar Visita</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Registre uma visita a um cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Cliente</p>
          {clienteSel ? (
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'rgba(0,117,255,0.1)', border: '1px solid rgba(0,117,255,0.25)' }}>
              <div>
                <p className="font-semibold text-white">{clienteSel.name}</p>
                {clienteSel.company_name && <p className="text-sm" style={{ color: '#0075FF' }}>{clienteSel.company_name}</p>}
                {clienteSel.city && <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>{clienteSel.city}</p>}
              </div>
              <button type="button" onClick={() => setClienteSel(null)}
                className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: '#0075FF' }}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
              <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)}
                placeholder="Buscar cliente..."
                className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
              {clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
                  style={{ background: 'rgba(6,11,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {clientes.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteSel(c); setClienteBusca(''); setClientes([]) }}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,117,255,0.1)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      {c.company_name && <p className="text-xs" style={{ color: '#A0AEC0' }}>{c.company_name}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data e hora */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Data e Hora</p>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Quando *</label>
            <input type="datetime-local" value={scheduledAt} min={minDatetime}
              onChange={e => setScheduledAt(e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>

        {/* Detalhes */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Detalhes</p>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Objetivo da visita</label>
            <input value={objective} onChange={e => setObjective(e.target.value)}
              placeholder="ex: Apresentar nova coleção, follow-up do orçamento..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Informações adicionais sobre a visita..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          </div>
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl"
            style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.push('/visitas')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
            {saving ? 'Agendando…' : 'Agendar visita'}
          </button>
        </div>
      </form>
    </div>
  )
}
