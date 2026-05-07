'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wrench, Plus, AlertCircle, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useAssistencias } from '@/hooks/useAssistencias'
import type { AssistenciaStatus } from '@/hooks/useAssistencias'

const STATUS_CONFIG: Record<AssistenciaStatus, { label: string; badge: string; icon: React.ElementType }> = {
  aberta:       { label: 'Aberta',        badge: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  em_andamento: { label: 'Em Andamento',  badge: 'bg-blue-100 text-blue-700',     icon: Clock },
  resolvida:    { label: 'Resolvida',     badge: 'bg-green-100 text-green-700',   icon: CheckCircle },
  cancelada:    { label: 'Cancelada',     badge: 'bg-gray-100 text-gray-500',     icon: XCircle },
}

const FILTROS: { value: AssistenciaStatus | ''; label: string }[] = [
  { value: '',            label: 'Todas' },
  { value: 'aberta',      label: 'Abertas' },
  { value: 'em_andamento',label: 'Em Andamento' },
  { value: 'resolvida',   label: 'Resolvidas' },
  { value: 'cancelada',   label: 'Canceladas' },
]

export default function AssistenciaPage() {
  const [status, setStatus] = useState<AssistenciaStatus | ''>('aberta')
  const { assistencias, loading } = useAssistencias({ status })

  const abertas = assistencias.filter(a => a.status === 'aberta').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistência Técnica</h1>
          <p className="text-gray-500 text-sm mt-0.5">{assistencias.length} solicitaç{assistencias.length !== 1 ? 'ões' : 'ão'}</p>
        </div>
        <Link href="/assistencia/nova"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Nova Solicitação
        </Link>
      </div>

      {/* Alerta abertas */}
      {abertas > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-6">
          <p className="text-sm font-semibold text-orange-700">
            {abertas} solicitaç{abertas > 1 ? 'ões' : 'ão'} aguardando atendimento
          </p>
          <p className="text-xs text-orange-500 mt-0.5">Acesse cada uma para atualizar o status</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.value} onClick={() => setStatus(f.value as AssistenciaStatus | '')}
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
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : assistencias.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Wrench size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma solicitação encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Nova Solicitação" para registrar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assistencias.map(a => {
            const cfg = STATUS_CONFIG[a.status]
            const StatusIcon = cfg.icon
            return (
              <Link key={a.id} href={`/assistencia/${a.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-blue-300 transition-all group">

                {/* Imagem ou ícone */}
                <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  {a.image_url ? (
                    <img src={a.image_url} alt="produto" className="w-full h-full object-cover" />
                  ) : (
                    <Wrench size={20} className="text-gray-300" />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {a.product_name ?? a.products?.name ?? 'Produto não vinculado'}
                    </p>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.badge}`}>
                      <StatusIcon size={10} /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {a.clients?.name && <span>{a.clients.name}{a.clients.company_name ? ` · ${a.clients.company_name}` : ''}</span>}
                    {a.suppliers?.name && <span>· {a.suppliers.name}</span>}
                    <span className="font-mono">NF: {a.invoice_number}</span>
                  </div>
                  {a.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{a.description}</p>
                  )}
                </div>

                {/* Data + seta */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <ChevronRight size={16} className="text-gray-300 mt-1 ml-auto" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
