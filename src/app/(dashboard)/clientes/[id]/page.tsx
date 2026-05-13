'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Edit } from 'lucide-react'
import { useCliente } from '@/hooks/useClientes'
import { ClienteForm } from '@/components/forms/ClienteForm'
import { formatPhone } from '@/lib/utils'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  loja:         { label: 'Loja',         color: '#0075FF', bg: 'rgba(0,117,255,0.15)' },
  arquiteto:    { label: 'Arquiteto',    color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  decorador:    { label: 'Decorador',    color: '#ED64A6', bg: 'rgba(237,100,166,0.15)' },
  distribuidor: { label: 'Distribuidor', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' },
  outros:       { label: 'Outros',       color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
}

export default function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { cliente, loading } = useCliente(id)
  const [editando, setEditando] = useState(false)

  if (loading) return (
    <div className="max-w-2xl w-full space-y-4 animate-pulse">
      <div className="h-8 rounded-xl w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )

  if (!cliente) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <p className="text-white font-semibold">Cliente não encontrado</p>
    </div>
  )

  const tipo = TIPO_CONFIG[cliente.type] ?? TIPO_CONFIG.outros

  return (
    <div className="max-w-2xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link
            href="/clientes"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">{cliente.name}</h1>
            {cliente.company_name && (
              <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{cliente.company_name}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditando(!editando)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all sm:flex-shrink-0"
          style={editando ? {
            background: 'rgba(252,129,129,0.12)',
            border: '1px solid rgba(252,129,129,0.25)',
            color: '#FC8181',
          } : {
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#A0AEC0',
          }}
        >
          <Edit size={15} />
          {editando ? 'Cancelar edição' : 'Editar'}
        </button>
      </div>

      {editando ? (
        <ClienteForm cliente={cliente} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Informações */}
          <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
              Informações
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs mb-2" style={{ color: '#56577A' }}>Tipo</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ color: tipo.color, background: tipo.bg }}>
                  {tipo.label}
                </span>
              </div>
              {cliente.cpf_cnpj && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#56577A' }}>CPF / CNPJ</p>
                  <p className="font-medium text-white">{cliente.cpf_cnpj}</p>
                </div>
              )}
              <div>
                <p className="text-xs mb-2" style={{ color: '#56577A' }}>Status</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={cliente.active
                    ? { color: '#01B574', background: 'rgba(1,181,116,0.15)' }
                    : { color: '#A0AEC0', background: 'rgba(160,174,192,0.12)' }}>
                  {cliente.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
              Contato
            </p>
            <div className="space-y-3 text-sm">
              {cliente.whatsapp && (
                <a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                  style={{ color: '#01B574' }}>
                  <MessageCircle size={15} />
                  {formatPhone(cliente.whatsapp)}
                </a>
              )}
              {cliente.phone && (
                <p className="flex items-center gap-2.5" style={{ color: '#A0AEC0' }}>
                  <Phone size={15} style={{ color: '#56577A' }} />
                  {formatPhone(cliente.phone)}
                </p>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`}
                  className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                  style={{ color: '#0075FF' }}>
                  <Mail size={15} />
                  {cliente.email}
                </a>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
              Localização
            </p>
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={15} style={{ color: '#56577A', marginTop: 2, flexShrink: 0 }} />
              <div>
                {cliente.city && (
                  <p className="font-medium text-white">
                    {cliente.city}{cliente.state ? ` / ${cliente.state}` : ''}
                  </p>
                )}
                {cliente.address && <p className="mt-0.5" style={{ color: '#A0AEC0' }}>{cliente.address}</p>}
                {cliente.region && <p style={{ color: '#56577A' }}>Região: {cliente.region}</p>}
                {!cliente.city && !cliente.address && <p style={{ color: '#56577A' }}>Não informado</p>}
              </div>
            </div>
          </div>

          {/* Notas */}
          {cliente.notes && (
            <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>
                Observações
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#A0AEC0' }}>
                {cliente.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
