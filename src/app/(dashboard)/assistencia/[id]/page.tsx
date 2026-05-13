'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, AlertCircle, Clock, CheckCircle,
  XCircle, MessageCircle, FileText, ZoomIn,
} from 'lucide-react'
import { useAssistencia, useAssistenciasMutations } from '@/hooks/useAssistencias'
import type { AssistenciaStatus } from '@/hooks/useAssistencias'

const STATUS_CONFIG: Record<AssistenciaStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  aberta:       { label: 'Aberta',       color: '#F6AD55', bg: 'rgba(246,173,85,0.15)',   icon: AlertCircle },
  em_andamento: { label: 'Em Andamento', color: '#0075FF', bg: 'rgba(0,117,255,0.15)',    icon: Clock       },
  resolvida:    { label: 'Resolvida',    color: '#01B574', bg: 'rgba(1,181,116,0.15)',    icon: CheckCircle },
  cancelada:    { label: 'Cancelada',    color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)', icon: XCircle     },
}

export default function AssistenciaDetalhe() {
  const params = useParams()
  const id     = params.id as string
  const router = useRouter()
  const { assistencia, loading, refetch } = useAssistencia(id)
  const { atualizarStatus } = useAssistenciasMutations()

  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [showResolve, setShowResolve] = useState(false)
  const [resolution, setResolution]   = useState('')
  const [imageZoom, setImageZoom]     = useState(false)

  async function handleStatus(status: AssistenciaStatus) {
    if (status === 'resolvida') { setShowResolve(true); return }
    if (!confirm(`Alterar status para "${STATUS_CONFIG[status].label}"?`)) return
    setSaving(true); setError('')
    try { await atualizarStatus(id, status); await refetch() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao atualizar') }
    finally { setSaving(false) }
  }

  async function handleResolve() {
    setSaving(true); setError('')
    try {
      await atualizarStatus(id, 'resolvida', resolution || undefined)
      await refetch(); setShowResolve(false)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao resolver') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="max-w-2xl w-full space-y-4 animate-pulse">
      <div className="h-8 rounded-xl w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  )

  if (!assistencia) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <p className="text-white font-semibold">Solicitação não encontrada</p>
    </div>
  )

  const cfg = STATUS_CONFIG[assistencia.status]
  const StatusIcon = cfg.icon
  const pendente = assistencia.status === 'aberta' || assistencia.status === 'em_andamento'

  return (
    <div className="max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/assistencia')}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-white">Assistência Técnica</h1>
          <p className="text-sm mt-0.5 truncate" style={{ color: '#A0AEC0' }}>
            {assistencia.product_name ?? assistencia.products?.name ?? 'Produto não vinculado'}
          </p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0"
          style={{ color: cfg.color, background: cfg.bg }}>
          <StatusIcon size={13} /> {cfg.label}
        </span>
      </div>

      <div className="space-y-4">
        {/* Dados principais */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
            Informações da Solicitação
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#56577A' }}>
                <FileText size={11} /> Nota Fiscal
              </p>
              <p className="font-mono font-semibold text-white">{assistencia.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#56577A' }}>Aberta em</p>
              <p className="font-medium text-white">
                {new Date(assistencia.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {assistencia.suppliers?.name && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#56577A' }}>Fábrica / Fornecedor</p>
                <p className="font-medium text-white">{assistencia.suppliers.name}</p>
              </div>
            )}
            {assistencia.products && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#56577A' }}>Produto</p>
                <p className="font-medium text-white">
                  {assistencia.products.name}
                  {assistencia.products.code && (
                    <span className="font-mono text-xs ml-1" style={{ color: '#56577A' }}>({assistencia.products.code})</span>
                  )}
                </p>
              </div>
            )}
            {assistencia.resolved_at && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#56577A' }}>Resolvida em</p>
                <p className="font-medium" style={{ color: '#01B574' }}>
                  {new Date(assistencia.resolved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cliente */}
        {assistencia.clients && (
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>Cliente</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{assistencia.clients.name}</p>
                {assistencia.clients.company_name && (
                  <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{assistencia.clients.company_name}</p>
                )}
              </div>
              {assistencia.clients.whatsapp && (
                <a href={`https://wa.me/55${assistencia.clients.whatsapp.replace(/\D/g, '')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all hover:opacity-80"
                  style={{ color: '#01B574', background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.2)' }}>
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* Foto do dano */}
        {assistencia.image_url && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
                Foto do Produto Danificado
              </p>
              <button onClick={() => setImageZoom(true)}
                className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                style={{ color: '#0075FF' }}>
                <ZoomIn size={13} /> Ampliar
              </button>
            </div>
            <img src={assistencia.image_url} alt="produto danificado"
              onClick={() => setImageZoom(true)}
              className="w-full max-h-72 object-contain rounded-xl cursor-zoom-in"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
        )}

        {/* Descrição e notas */}
        {(assistencia.description || assistencia.notes) && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            {assistencia.description && (
              <div>
                <p className="text-xs mb-2" style={{ color: '#56577A' }}>Descrição do defeito</p>
                <p className="text-sm leading-relaxed" style={{ color: '#A0AEC0' }}>{assistencia.description}</p>
              </div>
            )}
            {assistencia.notes && (
              <div>
                <p className="text-xs mb-2" style={{ color: '#56577A' }}>Observações internas</p>
                <p className="text-sm leading-relaxed" style={{ color: '#A0AEC0' }}>{assistencia.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Resolução */}
        {assistencia.status === 'resolvida' && assistencia.resolution && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(1,181,116,0.08)', border: '1px solid rgba(1,181,116,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#01B574' }}>
              Como foi resolvido
            </p>
            <p className="text-sm leading-relaxed text-white">{assistencia.resolution}</p>
          </div>
        )}

        {/* Painel: registrar resolução */}
        {showResolve && (
          <div className="glass-card rounded-2xl p-5 space-y-4"
            style={{ border: '1px solid rgba(1,181,116,0.3)' }}>
            <p className="font-semibold text-white">Registrar Resolução</p>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>
                Como foi resolvido? (opcional)
              </label>
              <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3}
                placeholder="Descreva a solução: troca do produto, reparo, crédito, etc."
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
            </div>
            {error && (
              <p className="text-sm px-3 py-2 rounded-xl"
                style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}>{error}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowResolve(false); setError('') }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={handleResolve} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #01B574 0%, #00875A 100%)', boxShadow: '0 4px 16px rgba(1,181,116,0.3)' }}>
                {saving ? 'Salvando…' : 'Confirmar resolução'}
              </button>
            </div>
          </div>
        )}

        {/* Ações */}
        {pendente && !showResolve && (
          <div className="flex gap-3 flex-wrap">
            {assistencia.status === 'aberta' && (
              <button onClick={() => handleStatus('em_andamento')} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 16px rgba(0,117,255,0.3)' }}>
                <Clock size={15} /> Iniciar atendimento
              </button>
            )}
            <button onClick={() => handleStatus('resolvida')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #01B574 0%, #00875A 100%)', boxShadow: '0 4px 16px rgba(1,181,116,0.3)' }}>
              <CheckCircle size={15} /> Marcar como resolvida
            </button>
            <button onClick={() => handleStatus('cancelada')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ color: '#FC8181', background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <XCircle size={15} /> Cancelar
            </button>
          </div>
        )}

        {error && !showResolve && (
          <p className="text-sm px-3 py-2 rounded-xl"
            style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}>{error}</p>
        )}
      </div>

      {/* Lightbox */}
      {imageZoom && assistencia.image_url && (
        <div onClick={() => setImageZoom(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-8 cursor-zoom-out"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <img src={assistencia.image_url} alt="produto danificado"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
