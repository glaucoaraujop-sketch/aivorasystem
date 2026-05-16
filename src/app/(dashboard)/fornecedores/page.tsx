'use client'

import Link from 'next/link'
import { Truck, Clock, Phone, Mail, User } from 'lucide-react'
import { useFornecedores, calcularEntrega } from '@/hooks/useFornecedores'
import { formatDate, formatPhone } from '@/lib/utils'

function prazoConfig(days: number): { color: string; bg: string } {
  if (days <= 35) return { color: '#01B574', bg: 'rgba(1,181,116,0.15)'  }
  if (days <= 45) return { color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' }
  return             { color: '#FC8181', bg: 'rgba(252,129,129,0.15)'    }
}

export default function FornecedoresPage() {
  const { fornecedores, loading } = useFornecedores()

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Fornecedores</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>Fábricas parceiras e prazos de produção</p>
        </div>
      </div>

      {/* Banner info */}
      <div
        className="rounded-2xl px-5 py-4 mb-8 text-sm"
        style={{
          background: 'rgba(0,117,255,0.08)',
          border: '1px solid rgba(0,117,255,0.2)',
          color: '#0075FF',
        }}
      >
        Os prazos abaixo são usados para calcular automaticamente a previsão de entrega ao criar um pedido.
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="h-5 rounded-lg w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-8 rounded-lg w-1/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fornecedores.map(f => {
            const previsao = calcularEntrega(f.lead_time_days)
            const prazo = prazoConfig(f.lead_time_days)
            return (
              <Link
                key={f.id}
                href={`/fornecedores/${f.id}`}
                className="glass-card rounded-2xl p-6 transition-all group"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,117,255,0.12)' }}
                    >
                      <Truck size={18} style={{ color: '#0075FF' }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {f.name}
                      </h2>
                      {f.contact_name && (
                        <p className="text-sm flex items-center gap-1" style={{ color: '#A0AEC0' }}>
                          <User size={12} /> {f.contact_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{ color: prazo.color, background: prazo.bg }}
                  >
                    <Clock size={13} />
                    {f.lead_time_days} dias
                  </span>
                </div>

                {/* Previsão */}
                <div
                  className="rounded-xl px-4 py-3 mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs mb-0.5" style={{ color: '#56577A' }}>Se pedir hoje, entrega em:</p>
                  <p className="font-semibold text-white">{formatDate(previsao)}</p>
                </div>

                {/* Contato */}
                {(f.phone || f.email || f.whatsapp) && (
                  <div className="space-y-1.5 text-sm" style={{ color: '#A0AEC0' }}>
                    {f.whatsapp && (
                      <p className="flex items-center gap-2">
                        <Phone size={13} style={{ color: '#01B574' }} />
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
                  <span
                    className="mt-3 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ color: '#FC8181', background: 'rgba(252,129,129,0.15)' }}
                  >
                    inativo
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
