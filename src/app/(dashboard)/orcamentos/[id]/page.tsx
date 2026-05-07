'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
import { useOrcamento, useOrcamentosMutations } from '@/hooks/useOrcamentos'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import type { QuoteStatus } from '@/types/database'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho',  className: 'bg-gray-100 text-gray-600' },
  enviado:  { label: 'Enviado',   className: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado',  className: 'bg-green-100 text-green-700' },
  recusado: { label: 'Recusado',  className: 'bg-red-100 text-red-600' },
  expirado: { label: 'Expirado',  className: 'bg-orange-100 text-orange-600' },
}

export default function OrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { orcamento, loading, refetch } = useOrcamento(id)
  const { atualizarStatus } = useOrcamentosMutations()
  const [updating, setUpdating] = useState(false)

  async function mudarStatus(status: QuoteStatus) {
    setUpdating(true)
    try { await atualizarStatus(id, status); await refetch() }
    finally { setUpdating(false) }
  }

  if (loading) return <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
  if (!orcamento) return <p className="text-gray-500">Orçamento não encontrado.</p>

  const cfg = STATUS_CONFIG[orcamento.status]

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-8">
        <Link href="/orcamentos" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-mono text-sm text-gray-400">{orcamento.number}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{orcamento.clients?.name}</h1>
        </div>

        {/* Ações de status */}
        <div className="flex gap-2 flex-wrap">
          {orcamento.status === 'rascunho' && (
            <button onClick={() => mudarStatus('enviado')} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Send size={14} /> Marcar enviado
            </button>
          )}
          {orcamento.status === 'enviado' && (
            <>
              <button onClick={() => mudarStatus('aprovado')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                <ThumbsUp size={14} /> Aprovado
              </button>
              <button onClick={() => mudarStatus('recusado')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 transition-colors">
                <ThumbsDown size={14} /> Recusado
              </button>
            </>
          )}
          {orcamento.clients?.whatsapp && (
            <a href={`https://wa.me/55${orcamento.clients.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Info cliente + cabeçalho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 sm:col-span-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Cliente</p>
          <p className="font-semibold text-gray-900">{orcamento.clients?.name}</p>
          {orcamento.clients?.company_name && <p className="text-sm text-gray-500">{orcamento.clients.company_name}</p>}
          {orcamento.clients?.whatsapp && (
            <p className="text-sm text-gray-500 mt-1">{formatPhone(orcamento.clients.whatsapp)}</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Detalhes</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Criado</span>
              <span className="font-medium text-gray-900">{formatDate(orcamento.created_at)}</span>
            </div>
            {orcamento.valid_until && (
              <div className="flex justify-between">
                <span className="text-gray-500">Válido até</span>
                <span className="font-medium text-gray-900">{formatDate(orcamento.valid_until)}</span>
              </div>
            )}
            {orcamento.price_tables && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tabela</span>
                <span className="font-medium text-gray-900">{orcamento.price_tables.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Itens do Orçamento</p>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Produto</th>
              <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Qtd</th>
              <th className="text-right px-3 py-3 text-xs text-gray-400 font-medium">Unit.</th>
              <th className="text-center px-3 py-3 text-xs text-gray-400 font-medium">Desc%</th>
              <th className="text-right px-5 py-3 text-xs text-gray-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {orcamento.quote_items?.map(item => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{item.products?.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{item.products?.code}</p>
                </td>
                <td className="text-center px-3 py-3 text-gray-700">{item.quantity} {item.products?.unit}</td>
                <td className="text-right px-3 py-3 text-gray-700">{formatCurrency(item.unit_price)}</td>
                <td className="text-center px-3 py-3 text-gray-500">{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
                <td className="text-right px-5 py-3 font-semibold text-gray-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Totais */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(orcamento.subtotal)}</span>
          </div>
          {orcamento.discount_pct > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Desconto ({orcamento.discount_pct}%)</span>
              <span>- {formatCurrency(orcamento.subtotal - orcamento.total)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
            <span>Total</span>
            <span className="text-blue-600">{formatCurrency(orcamento.total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {orcamento.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Observações</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{orcamento.notes}</p>
        </div>
      )}
    </div>
  )
}
