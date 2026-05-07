'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, Phone, MapPin, MessageCircle } from 'lucide-react'
import { useClientes } from '@/hooks/useClientes'
import { formatPhone } from '@/lib/utils'
import type { ClientType } from '@/types/database'

const TIPO_BADGE: Record<string, string> = {
  loja:        'bg-blue-100 text-blue-700',
  arquiteto:   'bg-purple-100 text-purple-700',
  decorador:   'bg-pink-100 text-pink-700',
  distribuidor:'bg-orange-100 text-orange-700',
  outros:      'bg-gray-100 text-gray-600',
}

const TIPO_LABEL: Record<string, string> = {
  loja: 'Loja', arquiteto: 'Arquiteto', decorador: 'Decorador', distribuidor: 'Distribuidor', outros: 'Outros',
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState<ClientType | ''>('')

  const { clientes, loading } = useClientes({ search, type: tipo || undefined })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/clientes/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Novo Cliente
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou WhatsApp..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select value={tipo} onChange={e => setTipo(e.target.value as ClientType | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todos os tipos</option>
          <option value="loja">Loja</option>
          <option value="arquiteto">Arquiteto</option>
          <option value="decorador">Decorador</option>
          <option value="distribuidor">Distribuidor</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || tipo ? 'Tente outros filtros' : 'Clique em "Novo Cliente" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(c => (
            <Link key={c.id} href={`/clientes/${c.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {c.name}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${TIPO_BADGE[c.type]}`}>
                    {TIPO_LABEL[c.type]}
                  </span>
                </div>
                {c.company_name && (
                  <p className="text-sm text-gray-500 truncate">{c.company_name}</p>
                )}
              </div>

              {/* Contato */}
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 flex-shrink-0">
                {c.whatsapp && (
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-green-500" />
                    {formatPhone(c.whatsapp)}
                  </span>
                )}
                {c.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {c.city}{c.state ? ` / ${c.state}` : ''}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
