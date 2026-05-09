'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Search, MapPin, MessageCircle, Building2, UserCircle } from 'lucide-react'
import { useClientes } from '@/hooks/useClientes'
import { formatPhone } from '@/lib/utils'
import type { ClientType } from '@/types/database'

const TIPO_CONFIG: Record<string, { label: string; pill: string }> = {
  loja:         { label: 'Loja',         pill: 'bg-blue-100 text-blue-700' },
  arquiteto:    { label: 'Arquiteto',    pill: 'bg-purple-100 text-purple-700' },
  decorador:    { label: 'Decorador',    pill: 'bg-pink-100 text-pink-700' },
  distribuidor: { label: 'Distribuidor', pill: 'bg-orange-100 text-orange-700' },
  outros:       { label: 'Outros',       pill: 'bg-gray-100 text-gray-600' },
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-green-600',
  'from-orange-500 to-amber-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-teal-600',
]

function getGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

const TIPO_FILTERS: { value: ClientType | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'loja', label: 'Loja' },
  { value: 'arquiteto', label: 'Arquiteto' },
  { value: 'decorador', label: 'Decorador' },
  { value: 'distribuidor', label: 'Distribuidor' },
  { value: 'outros', label: 'Outros' },
]

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState<ClientType | ''>('')

  const { clientes, loading } = useClientes({ search, type: tipo || undefined })

  const porTipo = (t: string) => clientes.filter(c => c.type === t).length

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie sua base de clientes</p>
        </div>
        <Link href="/clientes/novo"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all hover:shadow-md hover:shadow-blue-200">
          <Plus size={16} />
          Novo Cliente
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: clientes.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Lojas', value: porTipo('loja'), icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Arquitetos', value: porTipo('arquiteto'), icon: UserCircle, color: 'text-pink-600', bg: 'bg-pink-50' },
          { label: 'Distribuidores', value: porTipo('distribuidor'), icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <p className={`text-3xl font-black ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Busca + Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, empresa ou WhatsApp..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {TIPO_FILTERS.map(f => (
            <button key={f.value} onClick={() => setTipo(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                tipo === f.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded-lg w-1/3 mb-2" />
                  <div className="h-3 bg-slate-50 rounded-lg w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">Nenhum cliente encontrado</p>
          <p className="text-slate-400 text-sm mt-1">
            {search || tipo ? 'Tente outros filtros' : 'Clique em "Novo Cliente" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(c => {
            const cfg = TIPO_CONFIG[c.type]
            return (
              <Link key={c.id} href={`/clientes/${c.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all group">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getGradient(c.name)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-white font-bold text-base">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </p>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.pill}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {c.company_name && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">{c.company_name}</p>
                  )}
                </div>

                {/* Contato */}
                <div className="hidden sm:flex items-center gap-5 text-sm text-slate-400 flex-shrink-0">
                  {c.whatsapp && (
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-emerald-500" />
                      {formatPhone(c.whatsapp)}
                    </span>
                  )}
                  {c.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-300" />
                      {c.city}{c.state ? ` / ${c.state}` : ''}
                    </span>
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
