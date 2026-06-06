'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, ThumbsUp, ThumbsDown, MessageCircle, FileDown } from 'lucide-react'
import { useOrcamento, useOrcamentosMutations } from '@/hooks/useOrcamentos'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import type { QuoteStatus } from '@/types/database'
import { AiMensagem } from '@/components/ai/AiMensagem'
import { gerarPropostaPDF } from '@/lib/gerarProposta'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
  enviado:  { label: 'Enviado',  color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  aprovado: { label: 'Aprovado', color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  recusado: { label: 'Recusado', color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
  expirado: { label: 'Expirado', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
}

export default function OrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { orcamento, loading, refetch } = useOrcamento(id)
  const { atualizarStatus } = useOrcamentosMutations()
  const [updating, setUpdating] = useState(false)

  function handleDownloadPDF() {
    if (!orcamento) return
    gerarPropostaPDF({
      numero: orcamento.number,
      clienteNome: orcamento.clients?.name ?? '',
      clienteEmpresa: orcamento.clients?.company_name,
      clienteWhatsapp: orcamento.clients?.whatsapp,
      tabelaPreco: orcamento.price_tables?.name,
      validoAte: orcamento.valid_until,
      itens: (orcamento.quote_items ?? []).map(item => ({
        nome: item.products?.name ?? '',
        codigo: item.products?.code,
        quantidade: item.quantity,
        unidade: item.products?.unit,
        precoUnit: item.unit_price,
        desconto: item.discount_pct,
        total: item.total,
      })),
      subtotal: orcamento.subtotal,
      descontoPct: orcamento.discount_pct,
      total: orcamento.total,
      notas: orcamento.notes,
      criadoEm: orcamento.created_at,
    })
  }

  async function mudarStatus(status: QuoteStatus) {
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

  if (!orcamento) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <p className="text-white font-semibold">Orçamento não encontrado</p>
    </div>
  )

  const cfg = STATUS_CONFIG[orcamento.status]

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link
            href="/orcamentos"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-mono text-sm" style={{ color: '#56577A' }}>{orcamento.number}</p>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white">{orcamento.clients?.name}</h1>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-shrink-0">
          {orcamento.status === 'rascunho' && (
            <button onClick={() => mudarStatus('enviado')} disabled={updating}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 16px rgba(0,117,255,0.3)' }}>
              <Send size={14} /> Marcar enviado
            </button>
          )}
          {orcamento.status === 'enviado' && (
            <>
              <button onClick={() => mudarStatus('aprovado')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #01B574 0%, #00875A 100%)', boxShadow: '0 4px 16px rgba(1,181,116,0.3)' }}>
                <ThumbsUp size={14} /> Aprovado
              </button>
              <button onClick={() => mudarStatus('recusado')} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
                <ThumbsDown size={14} /> Recusado
              </button>
            </>
          )}
          <button onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ color: '#9F7AEA', background: 'rgba(159,122,234,0.12)', border: '1px solid rgba(159,122,234,0.2)' }}>
            <FileDown size={14} /> Proposta PDF
          </button>
          {orcamento.clients?.whatsapp && (
            <a href={`https://wa.me/55${orcamento.clients.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ color: '#01B574', background: 'rgba(1,181,116,0.12)', border: '1px solid rgba(1,181,116,0.2)' }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Cliente + Detalhes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="glass-card rounded-2xl p-5 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>Cliente</p>
          <p className="font-semibold text-white">{orcamento.clients?.name}</p>
          {orcamento.clients?.company_name && (
            <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{orcamento.clients.company_name}</p>
          )}
          {orcamento.clients?.whatsapp && (
            <p className="text-sm mt-1" style={{ color: '#56577A' }}>{formatPhone(orcamento.clients.whatsapp)}</p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>Detalhes</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: '#56577A' }}>Criado</span>
              <span className="font-medium text-white">{formatDate(orcamento.created_at)}</span>
            </div>
            {orcamento.valid_until && (
              <div className="flex justify-between">
                <span style={{ color: '#56577A' }}>Válido até</span>
                <span className="font-medium text-white">{formatDate(orcamento.valid_until)}</span>
              </div>
            )}
            {orcamento.price_tables && (
              <div className="flex justify-between">
                <span style={{ color: '#56577A' }}>Tabela</span>
                <span className="font-medium text-white">{orcamento.price_tables.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="glass-card rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
            Itens do Orçamento
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#56577A' }}>Produto</th>
                <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#56577A' }}>Qtd</th>
                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#56577A' }}>Unit.</th>
                <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#56577A' }}>Desc%</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#56577A' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamento.quote_items?.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-white">{item.products?.name}</p>
                    <p className="text-xs font-mono" style={{ color: '#56577A' }}>{item.products?.code}</p>
                  </td>
                  <td className="text-center px-3 py-3" style={{ color: '#A0AEC0' }}>
                    {item.quantity} {item.products?.unit}
                  </td>
                  <td className="text-right px-3 py-3" style={{ color: '#A0AEC0' }}>
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="text-center px-3 py-3" style={{ color: item.discount_pct > 0 ? '#FC8181' : '#56577A' }}>
                    {item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}
                  </td>
                  <td className="text-right px-5 py-3 font-bold text-white">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div className="px-5 py-4 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between text-sm" style={{ color: '#A0AEC0' }}>
            <span>Subtotal</span><span>{formatCurrency(orcamento.subtotal)}</span>
          </div>
          {orcamento.discount_pct > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#FC8181' }}>
              <span>Desconto ({orcamento.discount_pct}%)</span>
              <span>− {formatCurrency(orcamento.subtotal - orcamento.total)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: '#ffffff' }}>
            <span>Total</span>
            <span style={{ color: '#2CD9FF' }}>{formatCurrency(orcamento.total)}</span>
          </div>
        </div>
      </div>

      {orcamento.notes && (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>
            Observações
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#A0AEC0' }}>
            {orcamento.notes}
          </p>
        </div>
      )}

      {/* AIVA — Mensagem WhatsApp */}
      <AiMensagem
        clienteName={orcamento.clients?.name ?? ''}
        clienteWhatsapp={orcamento.clients?.whatsapp}
        tiposDisponiveis={['follow_up_orcamento', 'reengajamento']}
        contextoBase={`Orçamento ${orcamento.number ?? ''} — Total: R$ ${orcamento.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      />
    </div>
  )
}
