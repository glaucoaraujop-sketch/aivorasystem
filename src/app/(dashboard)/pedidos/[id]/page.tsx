'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Truck, MessageCircle, CheckCircle } from 'lucide-react'
import { usePedido, usePedidosMutations } from '@/hooks/usePedidos'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pendente:    { label: 'Pendente',     className: 'bg-gray-100 text-gray-600' },
  confirmado:  { label: 'Confirmado',  className: 'bg-blue-100 text-blue-700' },
  em_producao: { label: 'Em Produção', className: 'bg-yellow-100 text-yellow-700' },
  pronto:      { label: 'Pronto',      className: 'bg-purple-100 text-purple-700' },
  entregue:    { label: 'Entregue',    className: 'bg-green-100 text-green-700' },
  cancelado:   { label: 'Cancelado',   className: 'bg-red-100 text-red-600' },
}

const FLUXO: { status: OrderStatus; label: string }[] = [
  { status: 'pendente',    label: 'Pendente' },
  { status: 'confirmado',  label: 'Confirmado' },
  { status: 'em_producao', label: 'Em Produção' },
  { status: 'pronto',      label: 'Pronto' },
  { status: 'entregue',    label: 'Entregue' },
]

const ORDEM_STATUS = ['pendente','confirmado','em_producao','pronto','entregue']

export default function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { pedido, loading, refetch } = usePedido(id)
  const { atualizarStatus } = usePedidosMutations()
  const [updating, setUpdating] = useState(false)

  async function mudarStatus(status: OrderStatus) {
    setUpdating(true)
    try { await atualizarStatus(id, status); await refetch() }
    finally { setUpdating(false) }
  }

  if (loading) return <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
  if (!pedido) return <p className="text-gray-500">Pedido não encontrado.</p>

  const cfg = STATUS_CONFIG[pedido.status]
  const idxAtual = ORDEM_STATUS.indexOf(pedido.status)
  const proximoStatus = FLUXO[idxAtual + 1]

  return (
    <div className="max-w-3xl w-full">
      <div className="flex flex-wrap items-start gap-3 mb-8">
        <Link href="/pedidos" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="font-mono text-sm text-gray-400">{pedido.number}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{pedido.clients?.name}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {proximoStatus && pedido.status !== 'cancelado' && (
            <button onClick={() => mudarStatus(proximoStatus.status)} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <CheckCircle size={14} /> <span className="hidden sm:inline">Avançar para: </span>{proximoStatus.label}
            </button>
          )}
          {pedido.clients?.whatsapp && (
            <a href={`https://wa.me/55${pedido.clients.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Timeline de status */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 mb-4 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-[320px]">
          {FLUXO.map((f, i) => {
            const ativo = ORDEM_STATUS.indexOf(pedido.status) >= i
            const atual = pedido.status === f.status
            return (
              <div key={f.status} className="flex items-center flex-1 last:flex-none">
                <div className={`flex flex-col items-center ${i > 0 ? 'flex-1' : ''}`}>
                  {i > 0 && <div className={`h-0.5 w-full mb-2 ${ativo ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                  <div className={`w-3 h-3 rounded-full border-2 ${ativo ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'} ${atual ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`} />
                  <p className={`text-xs mt-1 text-center ${atual ? 'text-blue-600 font-semibold' : ativo ? 'text-gray-600' : 'text-gray-300'}`}>
                    {f.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 sm:col-span-1 md:col-span-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Cliente</p>
          <p className="font-semibold text-gray-900">{pedido.clients?.name}</p>
          {pedido.clients?.company_name && <p className="text-sm text-gray-500">{pedido.clients.company_name}</p>}
          {pedido.clients?.whatsapp && <p className="text-sm text-gray-500 mt-1">{formatPhone(pedido.clients.whatsapp)}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Entrega</p>
          {pedido.suppliers && (
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <Truck size={13} className="text-gray-400" /> {pedido.suppliers.name}
            </p>
          )}
          {pedido.delivery_date && (
            <p className="text-lg font-bold text-gray-900">{formatDate(pedido.delivery_date)}</p>
          )}
          {pedido.payment_terms && (
            <p className="text-xs text-gray-500 mt-2">{pedido.payment_terms}</p>
          )}
        </div>

        {pedido.finalidade && (
          <div className={`rounded-xl border p-4 md:p-5 sm:col-span-2 md:col-span-1 ${pedido.finalidade === 'mostruario' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
            <p className="text-xs uppercase tracking-wider font-medium mb-2 text-gray-400">Finalidade</p>
            <p className={`font-semibold text-sm flex items-center gap-2 ${pedido.finalidade === 'mostruario' ? 'text-purple-700' : 'text-blue-700'}`}>
              {pedido.finalidade === 'mostruario' ? '🏪 Mostruário' : '📦 Venda / Estoque'}
            </p>
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Itens do Pedido</p>
        </div>
        <div className="divide-y divide-gray-50">
          {pedido.order_items?.map(item => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.products?.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.products?.code}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.quantity} {item.products?.unit} × {formatCurrency(item.unit_price)}
                    {item.discount_pct > 0 && ` − ${item.discount_pct}%`}
                  </p>
                  {/* Variações selecionadas */}
                  {item.order_item_variations?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.order_item_variations.map(v => (
                        <span key={v.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                          {v.variation_type_name}: <strong>{v.option_name}</strong>
                          {v.price_add !== 0 && ` (+${formatCurrency(v.price_add)})`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="font-bold text-gray-900 text-right">{formatCurrency(item.total)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{formatCurrency(pedido.subtotal)}</span>
          </div>
          {pedido.discount_pct > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Desconto ({pedido.discount_pct}%)</span>
              <span>- {formatCurrency(pedido.subtotal - pedido.total)}</span>
            </div>
          )}
          {pedido.commission_value && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Comissão ({pedido.commission_pct}%)</span>
              <span>{formatCurrency(pedido.commission_value)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
            <span>Total</span>
            <span className="text-blue-600">{formatCurrency(pedido.total)}</span>
          </div>
        </div>
      </div>

      {pedido.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Observações</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.notes}</p>
        </div>
      )}
    </div>
  )
}
