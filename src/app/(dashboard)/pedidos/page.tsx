'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Plus, Truck } from 'lucide-react'
import { usePedidos } from '@/hooks/usePedidos'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pendente:    { label: 'Pendente',     className: 'bg-gray-100 text-gray-600' },
  confirmado:  { label: 'Confirmado',  className: 'bg-blue-100 text-blue-700' },
  em_producao: { label: 'Em Produção', className: 'bg-yellow-100 text-yellow-700' },
  pronto:      { label: 'Pronto',      className: 'bg-purple-100 text-purple-700' },
  entregue:    { label: 'Entregue',    className: 'bg-green-100 text-green-700' },
  cancelado:   { label: 'Cancelado',   className: 'bg-red-100 text-red-600' },
}

const FILTROS: { value: OrderStatus | ''; label: string }[] = [
  { value: '',           label: 'Todos' },
  { value: 'pendente',   label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_producao',label: 'Em Produção' },
  { value: 'pronto',     label: 'Pronto' },
  { value: 'entregue',   label: 'Entregue' },
]

export default function PedidosPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const { pedidos, loading } = usePedidos({ status })

  const emAberto = pedidos.filter(p => !['entregue','cancelado'].includes(p.status))
  const totalAberto = emAberto.reduce((acc, p) => acc + p.total, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/pedidos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Novo Pedido
        </Link>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.value} onClick={() => setStatus(status === f.value ? '' : f.value as OrderStatus)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === f.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {totalAberto > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
          <p className="text-sm text-blue-700 font-medium">{emAberto.length} pedido{emAberto.length !== 1 ? 's' : ''} em aberto</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalAberto)}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pedidos.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <Link key={p.id} href={`/pedidos/${p.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-xs text-gray-400">{p.number}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                    {p.finalidade === 'mostruario' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">🏪 Mostruário</span>
                    )}
                    {p.finalidade === 'venda' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">📦 Venda</span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{p.clients?.name}</p>
                  {p.suppliers && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Truck size={11} /> {p.suppliers.name}
                      {p.delivery_date && ` · Entrega: ${formatDate(p.delivery_date)}`}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(p.total)}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                  {p.commission_value && (
                    <p className="text-xs text-green-600 font-medium">comissão: {formatCurrency(p.commission_value)}</p>
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
