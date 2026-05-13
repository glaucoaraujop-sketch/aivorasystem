'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wrench, Plus, AlertCircle, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useAssistencias } from '@/hooks/useAssistencias'
import type { AssistenciaStatus } from '@/hooks/useAssistencias'

const STATUS_CONFIG: Record<AssistenciaStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  aberta:       { label: 'Aberta',       color: '#F6AD55', bg: 'rgba(246,173,85,0.15)',   icon: AlertCircle },
  em_andamento: { label: 'Em Andamento', color: '#0075FF', bg: 'rgba(0,117,255,0.15)',    icon: Clock       },
  resolvida:    { label: 'Resolvida',    color: '#01B574', bg: 'rgba(1,181,116,0.15)',    icon: CheckCircle },
  cancelada:    { label: 'Cancelada',    color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)', icon: XCircle     },
}

const FILTROS: { value: AssistenciaStatus | ''; label: string }[] = [
  { value: '',             label: 'Todas'        },
  { value: 'aberta',       label: 'Abertas'      },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'resolvida',    label: 'Resolvidas'   },
  { value: 'cancelada',    label: 'Canceladas'   },
]

export default function AssistenciaPage() {
  const [status, setStatus] = useState<AssistenciaStatus | ''>('aberta')
  const { assistencias, loading } = useAssistencias({ status })

  const abertas = assistencias.filter(a => a.status === 'aberta').length

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Assistência Técnica</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {assistencias.length} solicitaç{assistencias.length !== 1 ? 'ões' : 'ão'}
          </p>
        </div>
        <Link
          href="/assistencia/nova"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 sm:flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
            boxShadow: '0 4px 20px rgba(0,117,255,0.3)',
          }}
        >
          <Plus size={16} /> Nova Solicitação
        </Link>
      </div>

      {/* Alerta abertas */}
      {abertas > 0 && (
        <div className="rounded-2xl px-5 py-4 mb-6"
          style={{ background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#F6AD55' }}>
            {abertas} solicitaç{abertas > 1 ? 'ões' : 'ão'} aguardando atendimento
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(246,173,85,0.7)' }}>
            Acesse cada uma para atualizar o status
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button key={f.value} onClick={() => setStatus(f.value as AssistenciaStatus | '')}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={status === f.value ? {
                background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 12px rgba(0,117,255,0.25)',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: '#A0AEC0',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 rounded-lg w-1/3 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : assistencias.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Wrench size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhuma solicitação encontrada</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            Clique em &quot;Nova Solicitação&quot; para registrar
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {assistencias.map(a => {
            const cfg = STATUS_CONFIG[a.status]
            const StatusIcon = cfg.icon
            return (
              <Link key={a.id} href={`/assistencia/${a.id}`}
                className="flex items-center gap-4 glass-card rounded-2xl p-4 transition-all group"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}>

                {/* Imagem ou ícone */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {a.image_url ? (
                    <img src={a.image_url} alt="produto" className="w-full h-full object-cover" />
                  ) : (
                    <Wrench size={20} style={{ color: '#56577A' }} />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                      {a.product_name ?? a.products?.name ?? 'Produto não vinculado'}
                    </p>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      <StatusIcon size={10} /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#56577A' }}>
                    {a.clients?.name && (
                      <span>{a.clients.name}{a.clients.company_name ? ` · ${a.clients.company_name}` : ''}</span>
                    )}
                    {a.suppliers?.name && <span>· {a.suppliers.name}</span>}
                    <span className="font-mono">NF: {a.invoice_number}</span>
                  </div>
                  {a.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#56577A' }}>{a.description}</p>
                  )}
                </div>

                {/* Data + seta */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs" style={{ color: '#56577A' }}>
                    {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <ChevronRight size={16} className="mt-1 ml-auto" style={{ color: '#56577A' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
