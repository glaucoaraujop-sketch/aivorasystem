'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { QuoteStatus } from '@/types/database'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
  enviado:  { label: 'Enviado',  color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  aprovado: { label: 'Aprovado', color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  recusado: { label: 'Recusado', color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
  expirado: { label: 'Expirado', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
}

const FILTROS: { value: QuoteStatus | ''; label: string }[] = [
  { value: '',         label: 'Todos'     },
  { value: 'rascunho', label: 'Rascunho'  },
  { value: 'enviado',  label: 'Enviados'  },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'recusado', label: 'Recusados' },
]

export default function OrcamentosPage() {
  const [status, setStatus] = useState<QuoteStatus | ''>('')
  const { orcamentos, loading } = useOrcamentos({ status })

  const totalAprovado = orcamentos
    .filter(o => o.status === 'aprovado')
    .reduce((acc, o) => acc + o.total, 0)

  const summaryCards = FILTROS.filter(f => f.value).map(f => ({
    ...f,
    count: orcamentos.filter(o => o.status === f.value).length,
    cfg: STATUS_CONFIG[f.value as QuoteStatus],
  }))

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Orçamentos</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/orcamentos/novo"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 sm:flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
            boxShadow: '0 4px 20px rgba(0, 117, 255, 0.3)',
          }}
        >
          <Plus size={16} />
          Novo Orçamento
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ value, label, count, cfg }) => (
          <button
            key={value}
            onClick={() => setStatus(status === value ? '' : value as QuoteStatus)}
            className="glass-card rounded-2xl p-5 text-left transition-all hover:opacity-80"
            style={status === value ? { border: '1px solid rgba(0,117,255,0.4)' } : undefined}
          >
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3"
              style={{ color: cfg.color, background: cfg.bg }}
            >
              {label}
            </span>
            <p className="text-3xl font-bold text-white">{loading ? '—' : count}</p>
          </button>
        ))}
      </div>

      {/* Banner total aprovado */}
      {totalAprovado > 0 && (
        <div
          className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between"
          style={{
            background: 'rgba(1,181,116,0.1)',
            border: '1px solid rgba(1,181,116,0.25)',
          }}
        >
          <p className="text-sm font-medium" style={{ color: '#01B574' }}>Total aprovado</p>
          <p className="text-xl font-semibold" style={{ color: '#01B574' }}>{formatCurrency(totalAprovado)}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value as QuoteStatus | '')}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={status === f.value ? {
                background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 12px rgba(0,117,255,0.25)',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: '#A0AEC0',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 rounded-lg w-1/4 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded-lg w-1/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <FileText size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhum orçamento encontrado</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {status ? 'Tente outro filtro' : 'Clique em "Novo Orçamento" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {orcamentos.map(o => {
            const cfg = STATUS_CONFIG[o.status]
            return (
              <Link
                key={o.id}
                href={`/orcamentos/${o.id}`}
                className="flex items-center gap-4 glass-card rounded-2xl p-4 transition-all group"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-xs" style={{ color: '#56577A' }}>{o.number}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {o.clients?.name ?? '—'}
                  </p>
                  {o.clients?.company_name && (
                    <p className="text-sm truncate mt-0.5" style={{ color: '#A0AEC0' }}>{o.clients.company_name}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-semibold text-white">{formatCurrency(o.total)}</p>
                  <p className="text-xs" style={{ color: '#56577A' }}>
                    {o.quote_items?.length ?? 0} {o.quote_items?.length === 1 ? 'item' : 'itens'} · {formatDate(o.created_at)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
