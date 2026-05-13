'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Plus, Truck, DollarSign, Clock } from 'lucide-react'
import { usePedidos } from '@/hooks/usePedidos'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pendente:    { label: 'Pendente',    color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
  confirmado:  { label: 'Confirmado',  color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  em_producao: { label: 'Em Produção', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
  pronto:      { label: 'Pronto',      color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  entregue:    { label: 'Entregue',    color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  cancelado:   { label: 'Cancelado',   color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
}

const FILTROS: { value: OrderStatus | ''; label: string }[] = [
  { value: '',            label: 'Todos' },
  { value: 'pendente',    label: 'Pendente' },
  { value: 'confirmado',  label: 'Confirmado' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'pronto',      label: 'Pronto' },
  { value: 'entregue',    label: 'Entregue' },
]

export default function PedidosPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const { pedidos, loading } = usePedidos({ status })

  const emAberto = pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
  const totalAberto = emAberto.reduce((acc, p) => acc + p.total, 0)

  const metrics = [
    { label: 'Total',      value: pedidos.length,                                         icon: ShoppingCart, color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
    { label: 'Em Aberto',  value: emAberto.length,                                        icon: Clock,        color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
    { label: 'Prontos',    value: pedidos.filter(p => p.status === 'pronto').length,       icon: Truck,        color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
    { label: 'Faturado',   value: formatCurrency(totalAberto),                            icon: DollarSign,   color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  ]

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Pedidos</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/pedidos/novo"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
            boxShadow: '0 4px 20px rgba(0, 117, 255, 0.3)',
          }}
        >
          <Plus size={16} />
          Novo Pedido
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A0AEC0' }}>{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value as OrderStatus | '')}
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
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-4 rounded-lg w-1/4 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 rounded-lg w-1/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="h-6 rounded-lg w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ShoppingCart size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhum pedido encontrado</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {status ? 'Tente outro filtro' : 'Clique em "Novo Pedido" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pedidos.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <Link
                key={p.id}
                href={`/pedidos/${p.id}`}
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-mono text-xs" style={{ color: '#56577A' }}>{p.number}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                    {p.finalidade === 'mostruario' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ color: '#9F7AEA', background: 'rgba(159,122,234,0.15)' }}>
                        Mostruário
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {p.clients?.name}
                  </p>
                  {p.suppliers && (
                    <p className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#56577A' }}>
                      <Truck size={11} />
                      {p.suppliers.name}
                      {p.delivery_date && ` · Entrega: ${formatDate(p.delivery_date)}`}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-white">{formatCurrency(p.total)}</p>
                  <p className="text-xs" style={{ color: '#56577A' }}>{formatDate(p.created_at)}</p>
                  {p.commission_value && (
                    <p className="text-xs font-medium" style={{ color: '#01B574' }}>
                      comissão: {formatCurrency(p.commission_value)}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
