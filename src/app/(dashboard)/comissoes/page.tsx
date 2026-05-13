'use client'

import { useState } from 'react'
import { DollarSign, CheckCircle, Clock, ThumbsUp } from 'lucide-react'
import { useComissoes, useComissoesMutations } from '@/hooks/useComissoes'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CommissionStatus } from '@/types/database'

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bg: string }> = {
  prevista:  { label: 'Prevista',  color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
  aprovada:  { label: 'Aprovada',  color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  paga:      { label: 'Paga',      color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  cancelada: { label: 'Cancelada', color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
}

const FILTROS: { value: CommissionStatus | ''; label: string }[] = [
  { value: '',         label: 'Todas'     },
  { value: 'prevista', label: 'Previstas' },
  { value: 'aprovada', label: 'Aprovadas' },
  { value: 'paga',     label: 'Pagas'     },
]

export default function ComissoesPage() {
  const [status, setStatus] = useState<CommissionStatus | ''>('')
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const { comissoes, loading, summary, refetch } = useComissoes({ status })
  const { atualizarStatus } = useComissoesMutations()

  async function mudarStatus(id: string, novoStatus: CommissionStatus) {
    setAtualizando(id)
    try { await atualizarStatus(id, novoStatus); refetch() }
    finally { setAtualizando(null) }
  }

  const hoje = new Date().toISOString().split('T')[0]
  const vencidas = comissoes.filter(c =>
    c.status === 'prevista' && c.due_date && c.due_date < hoje
  )

  const summaryCards = [
    {
      label: 'A Receber',
      value: summary.prevista + summary.aprovada,
      count: comissoes.filter(c => ['prevista', 'aprovada'].includes(c.status)).length,
      icon: Clock,
      color: '#A0AEC0',
      bg: 'rgba(160,174,192,0.15)',
    },
    {
      label: 'Aprovadas',
      value: summary.aprovada,
      count: comissoes.filter(c => c.status === 'aprovada').length,
      icon: ThumbsUp,
      color: '#0075FF',
      bg: 'rgba(0,117,255,0.15)',
    },
    {
      label: 'Já Recebi',
      value: summary.paga,
      count: comissoes.filter(c => c.status === 'paga').length,
      icon: CheckCircle,
      color: '#01B574',
      bg: 'rgba(1,181,116,0.15)',
    },
  ]

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Comissões</h1>
        <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>Acompanhe suas comissões por pedido</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {summaryCards.map(({ label, value, count, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#A0AEC0' }}>{label}</p>
            </div>
            <p className="text-2xl font-black text-white">{loading ? '—' : formatCurrency(value)}</p>
            <p className="text-xs mt-1" style={{ color: '#56577A' }}>{count} comissões</p>
          </div>
        ))}
      </div>

      {/* Alerta de vencidas */}
      {vencidas.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between"
          style={{
            background: 'rgba(246,173,85,0.1)',
            border: '1px solid rgba(246,173,85,0.25)',
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F6AD55' }}>
              {vencidas.length} comissão{vencidas.length > 1 ? 'ões' : ''} com prazo vencido
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(246,173,85,0.7)' }}>
              Verifique com o cliente o pagamento
            </p>
          </div>
          <p className="text-lg font-black" style={{ color: '#F6AD55' }}>
            {formatCurrency(vencidas.reduce((a, c) => a + c.value, 0))}
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value as CommissionStatus | '')}
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="h-4 rounded-lg w-1/3 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded-lg w-1/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : comissoes.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <DollarSign size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhuma comissão encontrada</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            As comissões são criadas automaticamente ao gerar um pedido com percentual de comissão
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {comissoes.map(c => {
            const cfg = STATUS_CONFIG[c.status]
            const vencida = c.status === 'prevista' && c.due_date && c.due_date < hoje

            return (
              <div
                key={c.id}
                className="glass-card rounded-2xl p-4 transition-all"
                style={vencida ? { border: '1px solid rgba(246,173,85,0.25)' } : undefined}
              >
                <div className="flex flex-wrap items-center gap-4">
                  {/* Info pedido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-mono text-xs" style={{ color: '#56577A' }}>{c.orders?.number ?? '—'}</p>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                      {vencida && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: '#F6AD55', background: 'rgba(246,173,85,0.15)' }}>
                          Vencida
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-white">{c.orders?.clients?.name ?? '—'}</p>
                    {c.orders?.clients?.company_name && (
                      <p className="text-sm" style={{ color: '#A0AEC0' }}>{c.orders.clients.company_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#56577A' }}>
                      {c.orders?.suppliers && <span>{c.orders.suppliers.name}</span>}
                      {c.due_date && (
                        <span style={vencida ? { color: '#F6AD55' } : undefined}>
                          Prazo: {formatDate(c.due_date)}
                        </span>
                      )}
                      {c.paid_at && (
                        <span style={{ color: '#01B574' }}>Pago em {formatDate(c.paid_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right mr-4 flex-shrink-0">
                    <p className="text-xl font-black text-white">{formatCurrency(c.value)}</p>
                    <p className="text-xs" style={{ color: '#56577A' }}>{c.pct}% do pedido</p>
                    {c.orders?.total && (
                      <p className="text-xs" style={{ color: '#56577A' }}>{formatCurrency(c.orders.total)}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {c.status === 'prevista' && (
                      <button
                        onClick={() => mudarStatus(c.id, 'aprovada')}
                        disabled={atualizando === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-50 transition-all hover:opacity-90"
                        style={{
                          background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                          boxShadow: '0 2px 8px rgba(0,117,255,0.3)',
                        }}
                      >
                        <ThumbsUp size={12} /> Aprovar
                      </button>
                    )}
                    {c.status === 'aprovada' && (
                      <button
                        onClick={() => mudarStatus(c.id, 'paga')}
                        disabled={atualizando === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-50 transition-all hover:opacity-90"
                        style={{
                          background: 'linear-gradient(135deg, #01B574 0%, #00875A 100%)',
                          boxShadow: '0 2px 8px rgba(1,181,116,0.3)',
                        }}
                      >
                        <CheckCircle size={12} /> Marcar paga
                      </button>
                    )}
                    {['prevista', 'aprovada'].includes(c.status) && (
                      <button
                        onClick={() => mudarStatus(c.id, 'cancelada')}
                        disabled={atualizando === c.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50 transition-all"
                        style={{ color: '#56577A' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color = '#FC8181'
                          ;(e.currentTarget as HTMLElement).style.background = 'rgba(252,129,129,0.1)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color = '#56577A'
                          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
