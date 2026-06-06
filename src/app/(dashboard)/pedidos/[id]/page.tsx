'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Truck, MessageCircle, CheckCircle } from 'lucide-react'
import { usePedido, usePedidosMutations } from '@/hooks/usePedidos'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'
import { AiMensagem } from '@/components/ai/AiMensagem'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pendente:    { label: 'Pendente',     color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
  confirmado:  { label: 'Confirmado',  color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  em_producao: { label: 'Em Produção', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
  pronto:      { label: 'Pronto',      color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  entregue:    { label: 'Entregue',    color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  cancelado:   { label: 'Cancelado',   color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
}

const FLUXO: { status: OrderStatus; label: string }[] = [
  { status: 'pendente',    label: 'Pendente' },
  { status: 'confirmado',  label: 'Confirmado' },
  { status: 'em_producao', label: 'Em Produção' },
  { status: 'pronto',      label: 'Pronto' },
  { status: 'entregue',    label: 'Entregue' },
]

const ORDEM_STATUS = ['pendente', 'confirmado', 'em_producao', 'pronto', 'entregue']

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

  if (loading) return (
    <div className="max-w-3xl w-full space-y-4 animate-pulse">
      <div className="h-8 rounded-xl w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-40 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )

  if (!pedido) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <p className="text-white font-semibold">Pedido não encontrado</p>
    </div>
  )

  const cfg = STATUS_CONFIG[pedido.status]
  const idxAtual = ORDEM_STATUS.indexOf(pedido.status)
  const proximoStatus = FLUXO[idxAtual + 1]

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link
            href="/pedidos"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-mono text-sm" style={{ color: '#56577A' }}>{pedido.number}</p>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white">{pedido.clients?.name}</h1>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-shrink-0">
          {proximoStatus && pedido.status !== 'cancelado' && (
            <button onClick={() => mudarStatus(proximoStatus.status)} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 16px rgba(0,117,255,0.3)' }}>
              <CheckCircle size={14} />
              <span className="hidden sm:inline">Avançar: </span>{proximoStatus.label}
            </button>
          )}
          {pedido.clients?.whatsapp && (
            <a href={`https://wa.me/55${pedido.clients.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ color: '#01B574', background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.2)' }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-2xl p-5 mb-4 overflow-x-auto">
        <div className="flex items-start gap-0 min-w-[320px]">
          {FLUXO.map((f, i) => {
            const ativo = ORDEM_STATUS.indexOf(pedido.status) >= i
            const atual = pedido.status === f.status
            const cor = STATUS_CONFIG[f.status].color
            return (
              <div key={f.status} className="flex items-center flex-1 last:flex-none">
                <div className={`flex flex-col items-center ${i > 0 ? 'flex-1' : ''}`}>
                  {i > 0 && (
                    <div className="h-0.5 w-full mb-3 rounded-full"
                      style={{ background: ativo ? cor : 'rgba(255,255,255,0.08)' }} />
                  )}
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={ativo
                      ? { background: cor, borderColor: cor, boxShadow: atual ? `0 0 8px ${cor}80` : undefined }
                      : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)' }}
                  />
                  <p className="text-xs mt-1.5 text-center"
                    style={{ color: atual ? cor : ativo ? '#A0AEC0' : '#56577A', fontWeight: atual ? 700 : 400 }}>
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
        <div className="glass-card rounded-2xl p-5 sm:col-span-1 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>Cliente</p>
          <p className="font-semibold text-white">{pedido.clients?.name}</p>
          {pedido.clients?.company_name && (
            <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{pedido.clients.company_name}</p>
          )}
          {pedido.clients?.whatsapp && (
            <p className="text-sm mt-1" style={{ color: '#56577A' }}>{formatPhone(pedido.clients.whatsapp)}</p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>Entrega</p>
          {pedido.suppliers && (
            <p className="text-sm font-medium flex items-center gap-1.5 mb-2" style={{ color: '#A0AEC0' }}>
              <Truck size={13} style={{ color: '#56577A' }} /> {pedido.suppliers.name}
            </p>
          )}
          {pedido.delivery_date && (
            <p className="text-lg font-semibold text-white">{formatDate(pedido.delivery_date)}</p>
          )}
          {pedido.payment_terms && (
            <p className="text-xs mt-2" style={{ color: '#56577A' }}>{pedido.payment_terms}</p>
          )}
        </div>

        {pedido.finalidade && (
          <div className="glass-card rounded-2xl p-5 sm:col-span-2 md:col-span-1"
            style={pedido.finalidade === 'mostruario'
              ? { border: '1px solid rgba(159,122,234,0.25)' }
              : { border: '1px solid rgba(0,117,255,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A0AEC0' }}>Finalidade</p>
            <p className="font-semibold text-sm"
              style={{ color: pedido.finalidade === 'mostruario' ? '#9F7AEA' : '#0075FF' }}>
              {pedido.finalidade === 'mostruario' ? 'Mostruário' : 'Venda / Estoque'}
            </p>
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="glass-card rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
            Itens do Pedido
          </p>
        </div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {pedido.order_items?.map((item, i) => (
            <div key={item.id} className="px-5 py-4"
              style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : undefined}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{item.products?.name}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: '#56577A' }}>{item.products?.code}</p>
                  <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
                    {item.quantity} {item.products?.unit} × {formatCurrency(item.unit_price)}
                    {item.discount_pct > 0 && (
                      <span style={{ color: '#FC8181' }}> − {item.discount_pct}%</span>
                    )}
                  </p>
                  {item.order_item_variations?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.order_item_variations.map(v => (
                        <span key={v.id} className="px-2 py-0.5 rounded-full text-xs"
                          style={{ color: '#2CD9FF', background: 'rgba(44,217,255,0.1)', border: '1px solid rgba(44,217,255,0.2)' }}>
                          {v.variation_type_name}: <strong>{v.option_name}</strong>
                          {v.price_add !== 0 && ` (+${formatCurrency(v.price_add)})`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="font-bold text-white flex-shrink-0">{formatCurrency(item.total)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className="px-5 py-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex justify-between text-sm" style={{ color: '#A0AEC0' }}>
            <span>Subtotal</span><span>{formatCurrency(pedido.subtotal)}</span>
          </div>
          {pedido.discount_pct > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#FC8181' }}>
              <span>Desconto ({pedido.discount_pct}%)</span>
              <span>− {formatCurrency(pedido.subtotal - pedido.total)}</span>
            </div>
          )}
          {pedido.commission_value && (
            <div className="flex justify-between text-sm" style={{ color: '#01B574' }}>
              <span>Comissão ({pedido.commission_pct}%)</span>
              <span>{formatCurrency(pedido.commission_value)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
            <span>Total</span>
            <span style={{ color: '#2CD9FF' }}>{formatCurrency(pedido.total)}</span>
          </div>
        </div>
      </div>

      {pedido.notes && (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>
            Observações
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#A0AEC0' }}>
            {pedido.notes}
          </p>
        </div>
      )}

      {/* AIVA — Mensagem WhatsApp */}
      <AiMensagem
        clienteName={pedido.clients?.name ?? ''}
        clienteWhatsapp={pedido.clients?.whatsapp}
        tiposDisponiveis={['atualizacao_pedido', 'follow_up_visita']}
        contextoBase={`Pedido ${pedido.number ?? ''} — Status: ${STATUS_CONFIG[pedido.status].label} — Total: R$ ${pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      />
    </div>
  )
}
