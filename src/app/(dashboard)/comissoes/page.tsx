'use client'

import { useState } from 'react'
import { DollarSign, CheckCircle, Clock, TrendingUp, ThumbsUp } from 'lucide-react'
import { useComissoes, useComissoesMutations } from '@/hooks/useComissoes'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CommissionStatus } from '@/types/database'

const STATUS_CONFIG: Record<CommissionStatus, { label: string; badgeClass: string }> = {
  prevista:  { label: 'Prevista',  badgeClass: 'bg-gray-100 text-gray-600' },
  aprovada:  { label: 'Aprovada',  badgeClass: 'bg-blue-100 text-blue-700' },
  paga:      { label: 'Paga',      badgeClass: 'bg-green-100 text-green-700' },
  cancelada: { label: 'Cancelada', badgeClass: 'bg-red-100 text-red-500' },
}

const FILTROS: { value: CommissionStatus | ''; label: string }[] = [
  { value: '',          label: 'Todas' },
  { value: 'prevista',  label: 'Previstas' },
  { value: 'aprovada',  label: 'Aprovadas' },
  { value: 'paga',      label: 'Pagas' },
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comissões</h1>
        <p className="text-gray-500 text-sm mt-0.5">Acompanhe suas comissões por pedido</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock size={16} className="text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 font-medium">A Receber</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.prevista + summary.aprovada)}</p>
          <p className="text-xs text-gray-400 mt-1">{comissoes.filter(c => ['prevista','aprovada'].includes(c.status)).length} comissões</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ThumbsUp size={16} className="text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Aprovadas</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.aprovada)}</p>
          <p className="text-xs text-gray-400 mt-1">{comissoes.filter(c => c.status === 'aprovada').length} comissões</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle size={16} className="text-green-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Já Recebi</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.paga)}</p>
          <p className="text-xs text-gray-400 mt-1">{comissoes.filter(c => c.status === 'paga').length} comissões</p>
        </div>
      </div>

      {/* Alerta de vencidas */}
      {vencidas.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-orange-700">
              {vencidas.length} comissão{vencidas.length > 1 ? 'ões' : ''} com prazo vencido
            </p>
            <p className="text-xs text-orange-500">Verifique com o cliente o pagamento</p>
          </div>
          <p className="text-lg font-bold text-orange-700">
            {formatCurrency(vencidas.reduce((a, c) => a + c.value, 0))}
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {FILTROS.map(f => (
          <button key={f.value} onClick={() => setStatus(f.value as CommissionStatus | '')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === f.value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : comissoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma comissão encontrada</p>
          <p className="text-gray-400 text-sm mt-1">As comissões são criadas automaticamente ao gerar um pedido com percentual de comissão</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comissoes.map(c => {
            const cfg = STATUS_CONFIG[c.status]
            const vencida = c.status === 'prevista' && c.due_date && c.due_date < hoje

            return (
              <div key={c.id}
                className={`bg-white rounded-xl border p-4 transition-all ${vencida ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Info pedido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-xs text-gray-400">{c.orders?.number ?? '—'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                      {vencida && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                          Vencida
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{c.orders?.clients?.name ?? '—'}</p>
                    {c.orders?.clients?.company_name && (
                      <p className="text-sm text-gray-400">{c.orders.clients.company_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {c.orders?.suppliers && <span>{c.orders.suppliers.name}</span>}
                      {c.due_date && (
                        <span className={vencida ? 'text-orange-500 font-medium' : ''}>
                          Prazo: {formatDate(c.due_date)}
                        </span>
                      )}
                      {c.paid_at && <span className="text-green-600">Pago em {formatDate(c.paid_at)}</span>}
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right mr-4 flex-shrink-0">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(c.value)}</p>
                    <p className="text-xs text-gray-400">{c.pct}% do pedido</p>
                    {c.orders?.total && (
                      <p className="text-xs text-gray-400">{formatCurrency(c.orders.total)}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {c.status === 'prevista' && (
                      <button
                        onClick={() => mudarStatus(c.id, 'aprovada')}
                        disabled={atualizando === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        <ThumbsUp size={12} /> Aprovar
                      </button>
                    )}
                    {c.status === 'aprovada' && (
                      <button
                        onClick={() => mudarStatus(c.id, 'paga')}
                        disabled={atualizando === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                        <CheckCircle size={12} /> Marcar paga
                      </button>
                    )}
                    {['prevista','aprovada'].includes(c.status) && (
                      <button
                        onClick={() => mudarStatus(c.id, 'cancelada')}
                        disabled={atualizando === c.id}
                        className="px-3 py-1.5 text-gray-400 rounded-lg text-xs hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors">
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
