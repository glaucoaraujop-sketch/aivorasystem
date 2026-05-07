'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useVisitasMutations } from '@/hooks/useVisitas'
import { createClient } from '@/lib/supabase/client'

interface ClienteOption { id: string; name: string; company_name: string | null; city: string | null }

export default function NovaVisitaPage() {
  const router = useRouter()
  const { criar } = useVisitasMutations()
  const supabase = createClient()

  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientes, setClientes]       = useState<ClienteOption[]>([])
  const [clienteSel, setClienteSel]   = useState<ClienteOption | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [objective, setObjective]     = useState('')
  const [notes, setNotes]             = useState('')

  // Data mínima: agora
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
    if (!clienteSel) { setError('Selecione um cliente'); return }
    if (!scheduledAt) { setError('Informe data e hora'); return }
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agendar Visita</h1>
        <p className="text-gray-500 text-sm mt-0.5">Registre uma visita a um cliente</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        {/* Cliente */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Cliente</h2>
          {clienteSel ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-blue-900">{clienteSel.name}</p>
                {clienteSel.company_name && <p className="text-sm text-blue-600">{clienteSel.company_name}</p>}
                {clienteSel.city && <p className="text-xs text-blue-400 mt-0.5">{clienteSel.city}</p>}
              </div>
              <button type="button" onClick={() => setClienteSel(null)}
                className="text-sm text-blue-500 hover:text-blue-700">Trocar</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {clientes.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteSel(c); setClienteBusca(''); setClientes([]) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {c.company_name && <p className="text-xs text-gray-500">{c.company_name}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Data e hora */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Data e Hora</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quando *</label>
            <input type="datetime-local" value={scheduledAt} min={minDatetime}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </section>

        {/* Objetivo */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Detalhes</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo da visita</label>
            <input value={objective} onChange={e => setObjective(e.target.value)}
              placeholder="ex: Apresentar nova coleção de sofás, follow-up do orçamento..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Informações adicionais sobre a visita..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </section>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/visitas')}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Agendando...' : 'Agendar visita'}
          </button>
        </div>
      </form>
    </div>
  )
}
