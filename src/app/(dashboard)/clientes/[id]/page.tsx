'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Edit } from 'lucide-react'
import { useCliente } from '@/hooks/useClientes'
import { ClienteForm } from '@/components/forms/ClienteForm'
import { formatPhone } from '@/lib/utils'
import { useState } from 'react'

const TIPO_LABEL: Record<string, string> = {
  loja: 'Loja', arquiteto: 'Arquiteto', decorador: 'Decorador', distribuidor: 'Distribuidor', outros: 'Outros',
}

export default function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { cliente, loading } = useCliente(id)
  const [editando, setEditando] = useState(false)

  if (loading) return <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
  if (!cliente) return <p className="text-gray-500">Cliente não encontrado.</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/clientes" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{cliente.name}</h1>
          {cliente.company_name && <p className="text-gray-500 text-sm">{cliente.company_name}</p>}
        </div>
        <button onClick={() => setEditando(!editando)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Edit size={15} />
          {editando ? 'Cancelar edição' : 'Editar'}
        </button>
      </div>

      {editando ? (
        <ClienteForm cliente={cliente} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {/* Tipo */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 col-span-1 sm:col-span-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Informações</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Tipo</p>
                <p className="font-medium text-gray-900">{TIPO_LABEL[cliente.type]}</p>
              </div>
              {cliente.cpf_cnpj && (
                <div>
                  <p className="text-gray-500 mb-0.5">CPF / CNPJ</p>
                  <p className="font-medium text-gray-900">{cliente.cpf_cnpj}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 mb-0.5">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cliente.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {cliente.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 col-span-1 sm:col-span-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Contato</p>
            <div className="space-y-2 text-sm">
              {cliente.whatsapp && (
                <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors">
                  <MessageCircle size={15} className="text-green-500" />
                  {formatPhone(cliente.whatsapp)}
                </a>
              )}
              {cliente.phone && (
                <p className="flex items-center gap-2 text-gray-700">
                  <Phone size={15} className="text-gray-400" />
                  {formatPhone(cliente.phone)}
                </p>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <Mail size={15} className="text-gray-400" />
                  {cliente.email}
                </a>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Localização</p>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                {cliente.city && <p className="font-medium">{cliente.city}{cliente.state ? ` / ${cliente.state}` : ''}</p>}
                {cliente.address && <p className="text-gray-500 mt-0.5">{cliente.address}</p>}
                {cliente.region && <p className="text-gray-500">Região: {cliente.region}</p>}
                {!cliente.city && !cliente.address && <p className="text-gray-400">Não informado</p>}
              </div>
            </div>
          </div>

          {/* Notas */}
          {cliente.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 col-span-1 sm:col-span-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Observações</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{cliente.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
