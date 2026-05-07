'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { QuoteStatus } from '@/types/database'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho',  className: 'bg-gray-100 text-gray-600' },
  enviado:  { label: 'Enviado',   className: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado',  className: 'bg-green-100 text-green-700' },
  recusado: { label: 'Recusado',  className: 'bg-red-100 text-red-600' },
  expirado: { label: 'Expirado',  className: 'bg-orange-100 text-orange-600' },
}

const FILTROS: { value: QuoteStatus | ''; label: string }[] = [
  { value: '',         label: 'Todos' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado',  label: 'Enviados' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'recusado', label: 'Recusados' },
]

export default function OrcamentosPage() {
  const [status, setStatus] = useState<QuoteStatus | ''>('')
  const { orcamentos, loading } = useOrcamentos({ status })

  const totalAprovado = orcamentos
    .filter(o => o.status === 'aprovado')
    .reduce((acc, o) => acc + o.total, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/orcamentos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Novo Orçamento
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {FILTROS.filter(f => f.value).map(f => {
          const count = orcamentos.filter(o => o.status === f.value).length
          const cfg = STATUS_CONFIG[f.value as QuoteStatus]
          return (
            <button key={f.value} onClick={() => setStatus(status === f.value ? '' : f.value as QuoteStatus)}
              className={`bg-white rounded-xl border p-4 text-left transition-all ${status === f.value ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200 hover:border-gray-300'}`}>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${cfg.className}`}>{cfg.label}</span>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </button>
          )
        })}
      </div>

      {totalAprovado > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
          <p className="text-sm text-green-700 font-medium">Total aprovado</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalAprovado)}</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum orçamento encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Novo Orçamento" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orcamentos.map(o => {
            const cfg = STATUS_CONFIG[o.status]
            return (
              <Link key={o.id} href={`/orcamentos/${o.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-xs text-gray-400">{o.number}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                  </div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {o.clients?.name ?? '—'}
                  </p>
                  {o.clients?.company_name && <p className="text-sm text-gray-400">{o.clients.company_name}</p>}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(o.total)}</p>
                  <p className="text-xs text-gray-400">
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
