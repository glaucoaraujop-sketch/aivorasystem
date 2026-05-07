'use client'

import Link from 'next/link'
import { Truck, Clock, Phone, Mail, User } from 'lucide-react'
import { useFornecedores, calcularEntrega } from '@/hooks/useFornecedores'
import { formatDate, formatPhone } from '@/lib/utils'

const PRAZO_COLOR: (days: number) => string = (days) => {
  if (days <= 35) return 'bg-green-100 text-green-700'
  if (days <= 45) return 'bg-yellow-100 text-yellow-700'
  return 'bg-orange-100 text-orange-700'
}

export default function FornecedoresPage() {
  const { fornecedores, loading } = useFornecedores()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fábricas parceiras e prazos de produção</p>
        </div>
      </div>

      {/* Banner info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-sm text-blue-700">
        Os prazos abaixo são usados para calcular automaticamente a previsão de entrega ao criar um pedido.
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fornecedores.map(f => {
            const previsao = calcularEntrega(f.lead_time_days)
            return (
              <Link key={f.id} href={`/fornecedores/${f.id}`}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group">

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Truck size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {f.name}
                      </h2>
                      {f.contact_name && (
                        <p className="text-sm text-gray-400 flex items-center gap-1">
                          <User size={12} /> {f.contact_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${PRAZO_COLOR(f.lead_time_days)}`}>
                    <Clock size={14} />
                    {f.lead_time_days} dias
                  </span>
                </div>

                {/* Previsão se pedido hoje */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-gray-400 mb-0.5">Se pedir hoje, entrega em:</p>
                  <p className="font-semibold text-gray-900">{formatDate(previsao)}</p>
                </div>

                {/* Contato */}
                {(f.phone || f.email || f.whatsapp) && (
                  <div className="space-y-1.5 text-sm text-gray-500">
                    {f.whatsapp && (
                      <p className="flex items-center gap-2">
                        <Phone size={13} className="text-green-500" />
                        {formatPhone(f.whatsapp)}
                      </p>
                    )}
                    {f.phone && !f.whatsapp && (
                      <p className="flex items-center gap-2">
                        <Phone size={13} /> {formatPhone(f.phone)}
                      </p>
                    )}
                    {f.email && (
                      <p className="flex items-center gap-2">
                        <Mail size={13} /> {f.email}
                      </p>
                    )}
                  </div>
                )}

                {!f.active && (
                  <span className="mt-3 inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">inativo</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
