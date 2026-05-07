'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Wrench, AlertCircle, Clock, CheckCircle,
  XCircle, MessageCircle, FileText, ZoomIn,
} from 'lucide-react'
import { useAssistencia, useAssistenciasMutations } from '@/hooks/useAssistencias'
import type { AssistenciaStatus } from '@/hooks/useAssistencias'

const STATUS_CONFIG: Record<AssistenciaStatus, { label: string; badge: string; icon: React.ElementType }> = {
  aberta:       { label: 'Aberta',       badge: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  em_andamento: { label: 'Em Andamento', badge: 'bg-blue-100 text-blue-700',     icon: Clock },
  resolvida:    { label: 'Resolvida',    badge: 'bg-green-100 text-green-700',   icon: CheckCircle },
  cancelada:    { label: 'Cancelada',    badge: 'bg-gray-100 text-gray-500',     icon: XCircle },
}

export default function AssistenciaDetalhe() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { assistencia, loading, refetch } = useAssistencia(id)
  const { atualizarStatus, atualizar } = useAssistenciasMutations()

  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [showResolve, setShowResolve] = useState(false)
  const [resolution, setResolution]   = useState('')
  const [imageZoom, setImageZoom]     = useState(false)

  async function handleStatus(status: AssistenciaStatus) {
    if (status === 'resolvida') { setShowResolve(true); return }
    if (!confirm(`Alterar status para "${STATUS_CONFIG[status].label}"?`)) return
    setSaving(true); setError('')
    try {
      await atualizarStatus(id, status)
      await refetch()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally { setSaving(false) }
  }

  async function handleResolve() {
    setSaving(true); setError('')
    try {
      await atualizarStatus(id, 'resolvida', resolution || undefined)
      await refetch()
      setShowResolve(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao resolver')
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

  if (!assistencia) {
    return <div className="text-center py-20 text-gray-400">Solicitação não encontrada.</div>
  }

  const cfg = STATUS_CONFIG[assistencia.status]
  const StatusIcon = cfg.icon
  const pendente = assistencia.status === 'aberta' || assistencia.status === 'em_andamento'

  return (
    <div className="max-w-2xl w-full">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/assistencia')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Assistência Técnica</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {assistencia.product_name ?? assistencia.products?.name ?? 'Produto não vinculado'}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.badge}`}>
          <StatusIcon size={13} /> {cfg.label}
        </span>
      </div>

      <div className="space-y-4">

        {/* Dados principais */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Informações da Solicitação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">

            <div>
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><FileText size={11} /> Nota Fiscal</p>
              <p className="font-mono font-semibold text-gray-900">{assistencia.invoice_number}</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-0.5">Aberta em</p>
              <p className="font-medium text-gray-800">
                {new Date(assistencia.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {assistencia.suppliers?.name && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Fábrica / Fornecedor</p>
                <p className="font-medium text-gray-800">{assistencia.suppliers.name}</p>
              </div>
            )}

            {assistencia.products && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Produto</p>
                <p className="font-medium text-gray-800">
                  {assistencia.products.name}
                  {assistencia.products.code && <span className="text-gray-400 font-mono text-xs ml-1">({assistencia.products.code})</span>}
                </p>
              </div>
            )}

            {assistencia.resolved_at && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Resolvida em</p>
                <p className="font-medium text-gray-800">
                  {new Date(assistencia.resolved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Cliente */}
        {assistencia.clients && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{assistencia.clients.name}</p>
                {assistencia.clients.company_name && (
                  <p className="text-sm text-gray-500 mt-0.5">{assistencia.clients.company_name}</p>
                )}
              </div>
              {assistencia.clients.whatsapp && (
                <a href={`https://wa.me/55${assistencia.clients.whatsapp.replace(/\D/g,'')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
            </div>
          </section>
        )}

        {/* Foto do dano */}
        {assistencia.image_url && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Foto do Produto Danificado</h2>
              <button onClick={() => setImageZoom(true)}
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700">
                <ZoomIn size={13} /> Ampliar
              </button>
            </div>
            <img
              src={assistencia.image_url}
              alt="produto danificado"
              onClick={() => setImageZoom(true)}
              className="w-full max-h-72 object-contain rounded-lg border border-gray-100 bg-gray-50 cursor-zoom-in"
            />
          </section>
        )}

        {/* Descrição e notas */}
        {(assistencia.description || assistencia.notes) && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            {assistencia.description && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Descrição do defeito</p>
                <p className="text-sm text-gray-800 leading-relaxed">{assistencia.description}</p>
              </div>
            )}
            {assistencia.notes && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Observações internas</p>
                <p className="text-sm text-gray-800 leading-relaxed">{assistencia.notes}</p>
              </div>
            )}
          </section>
        )}

        {/* Resolução */}
        {assistencia.status === 'resolvida' && assistencia.resolution && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h2 className="font-semibold text-green-900 mb-2">Como foi resolvido</h2>
            <p className="text-sm text-green-800 leading-relaxed">{assistencia.resolution}</p>
          </section>
        )}

        {/* Painel: registrar resolução */}
        {showResolve && (
          <section className="bg-white rounded-xl border border-green-300 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Registrar Resolução</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Como foi resolvido? (opcional)</label>
              <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3}
                placeholder="Descreva a solução aplicada: troca do produto, reparo, crédito, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowResolve(false); setError('') }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleResolve} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Confirmar resolução'}
              </button>
            </div>
          </section>
        )}

        {/* Ações */}
        {pendente && !showResolve && (
          <div className="flex gap-3 flex-wrap">
            {assistencia.status === 'aberta' && (
              <button onClick={() => handleStatus('em_andamento')} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Clock size={15} /> Iniciar atendimento
              </button>
            )}
            <button onClick={() => handleStatus('resolvida')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              <CheckCircle size={15} /> Marcar como resolvida
            </button>
            <button onClick={() => handleStatus('cancelada')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
              <XCircle size={15} /> Cancelar
            </button>
          </div>
        )}

        {error && !showResolve && <p className="text-red-500 text-sm">{error}</p>}

      </div>

      {/* Lightbox */}
      {imageZoom && assistencia.image_url && (
        <div onClick={() => setImageZoom(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 cursor-zoom-out">
          <img src={assistencia.image_url} alt="produto danificado"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
