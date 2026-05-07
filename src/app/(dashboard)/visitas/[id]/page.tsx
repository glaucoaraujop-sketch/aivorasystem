'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, MapPin, MessageCircle, Calendar, CheckCircle,
  XCircle, RotateCcw, Clock, ChevronRight,
} from 'lucide-react'
import { useVisita, useVisitasMutations } from '@/hooks/useVisitas'
import type { VisitStatus } from '@/types/database'

const STATUS_CONFIG: Record<VisitStatus, { label: string; badge: string; icon: React.ElementType }> = {
  agendada:   { label: 'Agendada',   badge: 'bg-blue-100 text-blue-700',     icon: Calendar },
  realizada:  { label: 'Realizada',  badge: 'bg-green-100 text-green-700',   icon: CheckCircle },
  cancelada:  { label: 'Cancelada',  badge: 'bg-red-100 text-red-500',       icon: XCircle },
  reagendada: { label: 'Reagendada', badge: 'bg-yellow-100 text-yellow-700', icon: RotateCcw },
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type PanelType = 'resultado' | 'reagendar' | null

export default function VisitaDetalhe() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { visita, loading, refetch } = useVisita(id)
  const { registrarResultado, atualizarStatus, reagendar } = useVisitasMutations()

  const [panel, setPanel] = useState<PanelType>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // resultado
  const [result, setResult]         = useState('')
  const [nextAction, setNextAction] = useState('')
  const [resultNotes, setResultNotes] = useState('')

  // reagendar
  const [novaData, setNovaData] = useState('')
  const minDatetime = new Date().toISOString().slice(0, 16)

  async function handleRegistrar() {
    if (!result.trim()) { setError('Descreva o resultado da visita'); return }
    setSaving(true); setError('')
    try {
      await registrarResultado(id, { result: result.trim(), notes: resultNotes || undefined, next_action: nextAction || undefined })
      await refetch()
      setPanel(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleReagendar() {
    if (!novaData) { setError('Selecione a nova data'); return }
    setSaving(true); setError('')
    try {
      await reagendar(id, new Date(novaData).toISOString())
      await refetch()
      setPanel(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  async function handleCancelar() {
    if (!confirm('Cancelar esta visita?')) return
    setSaving(true); setError('')
    try {
      await atualizarStatus(id, 'cancelada')
      await refetch()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl w-full">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (!visita) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Visita não encontrada.</p>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[visita.status]
  const StatusIcon = cfg.icon
  const agendada = visita.status === 'agendada'
  const atrasada = agendada && new Date(visita.scheduled_at) < new Date()

  return (
    <div className="max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/visitas')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Visita</h1>
          <p className="text-gray-500 text-sm mt-0.5">{visita.clients?.name}</p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.badge}`}>
          <StatusIcon size={13} /> {cfg.label}
        </span>
      </div>

      {/* Alerta atrasada */}
      {atrasada && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-5">
          <p className="text-sm font-semibold text-orange-700">Esta visita está com data passada sem resultado registrado.</p>
          <p className="text-xs text-orange-500 mt-0.5">Registre o resultado ou reagende.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Cliente */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Cliente</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{visita.clients?.name}</p>
              {visita.clients?.company_name && (
                <p className="text-sm text-gray-500 mt-0.5">{visita.clients.company_name}</p>
              )}
              {(visita.clients?.city || visita.clients?.state) && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin size={11} />
                  {[visita.clients.city, visita.clients.state].filter(Boolean).join('/')}
                </p>
              )}
              {visita.clients?.address && (
                <p className="text-xs text-gray-400 mt-0.5">{visita.clients.address}</p>
              )}
            </div>
            {visita.clients?.whatsapp && (
              <a
                href={`https://wa.me/55${visita.clients.whatsapp.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
          </div>
        </section>

        {/* Data e detalhes */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Detalhes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Agendada para</p>
              <p className={`font-medium capitalize ${atrasada ? 'text-orange-600' : 'text-gray-800'}`}>
                {formatDatetime(visita.scheduled_at)}
              </p>
            </div>
            {visita.completed_at && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Realizada em</p>
                <p className="font-medium text-gray-800 capitalize">{formatDatetime(visita.completed_at)}</p>
              </div>
            )}
          </div>
          {visita.objective && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Objetivo</p>
              <p className="text-sm text-gray-800">{visita.objective}</p>
            </div>
          )}
          {visita.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Observações</p>
              <p className="text-sm text-gray-800">{visita.notes}</p>
            </div>
          )}
        </section>

        {/* Resultado (se realizada) */}
        {visita.status === 'realizada' && visita.result && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-green-900">Resultado</h2>
            <div>
              <p className="text-xs text-green-600 mb-0.5">O que aconteceu</p>
              <p className="text-sm text-green-800">{visita.result}</p>
            </div>
            {visita.next_action && (
              <div>
                <p className="text-xs text-green-600 mb-0.5">Próxima ação</p>
                <p className="text-sm text-green-800 flex items-center gap-1"><ChevronRight size={14} />{visita.next_action}</p>
              </div>
            )}
          </section>
        )}

        {/* Painel: Registrar resultado */}
        {panel === 'resultado' && (
          <section className="bg-white rounded-xl border border-blue-300 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Registrar Resultado</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">O que aconteceu na visita? *</label>
              <textarea value={result} onChange={e => setResult(e.target.value)} rows={3}
                placeholder="Descreva como foi a visita, o que foi discutido..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próxima ação</label>
              <input value={nextAction} onChange={e => setNextAction(e.target.value)}
                placeholder="ex: Enviar orçamento, ligar em 15 dias..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações adicionais</label>
              <textarea value={resultNotes} onChange={e => setResultNotes(e.target.value)} rows={2}
                placeholder="Qualquer informação extra relevante..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setPanel(null); setError('') }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleRegistrar} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Confirmar resultado'}
              </button>
            </div>
          </section>
        )}

        {/* Painel: Reagendar */}
        {panel === 'reagendar' && (
          <section className="bg-white rounded-xl border border-yellow-300 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Reagendar Visita</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova data e hora *</label>
              <input type="datetime-local" value={novaData} min={minDatetime}
                onChange={e => setNovaData(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setPanel(null); setError('') }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleReagendar} disabled={saving}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Confirmar reagendamento'}
              </button>
            </div>
          </section>
        )}

        {/* Ações (apenas para visitas agendadas/reagendadas) */}
        {(visita.status === 'agendada' || visita.status === 'reagendada') && panel === null && (
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => { setPanel('resultado'); setError('') }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              <CheckCircle size={15} /> Registrar resultado
            </button>
            <button onClick={() => { setPanel('reagendar'); setError('') }}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors">
              <RotateCcw size={15} /> Reagendar
            </button>
            <button onClick={handleCancelar} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
              <XCircle size={15} /> Cancelar visita
            </button>
          </div>
        )}

        {error && panel === null && <p className="text-red-500 text-sm">{error}</p>}

        {/* Metadata */}
        <p className="text-xs text-gray-400 flex items-center gap-1 pb-4">
          <Clock size={11} />
          Criada em {new Date(visita.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
