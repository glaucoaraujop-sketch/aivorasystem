'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Truck, Clock, Phone, Mail, User, Plus, Trash2, X } from 'lucide-react'
import { useFornecedores, useFornecedoresMutations, calcularEntrega } from '@/hooks/useFornecedores'
import { formatDate, formatPhone } from '@/lib/utils'

function prazoConfig(days: number): { color: string; bg: string } {
  if (days <= 35) return { color: '#01B574', bg: 'rgba(1,181,116,0.15)'  }
  if (days <= 45) return { color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' }
  return             { color: '#FC8181', bg: 'rgba(252,129,129,0.15)'    }
}

export default function FornecedoresPage() {
  const { fornecedores, loading, refetch } = useFornecedores()
  const { criar, remover } = useFornecedoresMutations()

  const [criarOpen, setCriarOpen] = useState(false)
  const [salvando, setSalvando]   = useState(false)
  const [erro, setErro]           = useState('')
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', lead_time_days: '', contact_name: '', phone: '', email: '' })

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const dias = Number(form.lead_time_days)
    if (!form.name.trim()) { setErro('Informe o nome da fábrica.'); return }
    if (!Number.isFinite(dias) || dias <= 0) { setErro('Informe o prazo de entrega (dias).'); return }
    setSalvando(true)
    try {
      await criar({
        name: form.name.trim(),
        lead_time_days: Math.floor(dias),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      })
      setForm({ name: '', lead_time_days: '', contact_name: '', phone: '', email: '' })
      setCriarOpen(false)
      await refetch()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  async function handleRemover(e: React.MouseEvent, id: string, nome: string) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm(`Remover o fornecedor "${nome}"? Esta ação é permanente.`)) return
    setRemovendo(id)
    try { await remover(id); await refetch() }
    catch (err) { alert(err instanceof Error ? err.message : 'Erro ao remover') }
    finally { setRemovendo(null) }
  }

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">FORNECEDORES</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>Fábricas parceiras e prazos de produção</p>
        </div>
        <button
          onClick={() => { setErro(''); setCriarOpen(true) }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 16px rgba(0,117,255,0.3)' }}
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Banner info */}
      <div className="rounded-2xl px-5 py-4 mb-8 text-sm"
        style={{ background: 'rgba(0,117,255,0.08)', border: '1px solid rgba(0,117,255,0.2)', color: '#0075FF' }}>
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
                className="glass-card rounded-2xl p-6 transition-all group relative"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                {/* Remover */}
                <button
                  onClick={e => handleRemover(e, f.id, f.name)}
                  disabled={removendo === f.id}
                  title="Remover fornecedor"
                  className="absolute top-3 right-3 z-10 p-2 rounded-lg transition-all disabled:opacity-40"
                  style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}
                >
                  <Trash2 size={14} />
                </button>

                <div className="flex items-start justify-between mb-5 pr-8">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,117,255,0.12)' }}>
                      <Truck size={18} style={{ color: '#0075FF' }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">{f.name}</h2>
                      {f.contact_name && (
                        <p className="text-sm flex items-center gap-1" style={{ color: '#A0AEC0' }}>
                          <User size={12} /> {f.contact_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{ color: prazo.color, background: prazo.bg }}>
                    <Clock size={13} /> {f.lead_time_days} dias
                  </span>
                </div>

                <div className="rounded-xl px-4 py-3 mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs mb-0.5" style={{ color: '#56577A' }}>Se pedir hoje, entrega em:</p>
                  <p className="font-semibold text-white">{formatDate(previsao)}</p>
                </div>

                {(f.phone || f.email || f.whatsapp) && (
                  <div className="space-y-1.5 text-sm" style={{ color: '#A0AEC0' }}>
                    {f.whatsapp && (
                      <p className="flex items-center gap-2"><Phone size={13} style={{ color: '#01B574' }} /> {formatPhone(f.whatsapp)}</p>
                    )}
                    {f.phone && !f.whatsapp && (
                      <p className="flex items-center gap-2"><Phone size={13} /> {formatPhone(f.phone)}</p>
                    )}
                    {f.email && (
                      <p className="flex items-center gap-2"><Mail size={13} /> {f.email}</p>
                    )}
                  </div>
                )}

                {!f.active && (
                  <span className="mt-3 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ color: '#FC8181', background: 'rgba(252,129,129,0.15)' }}>inativo</span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal: adicionar fornecedor */}
      {criarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => !salvando && setCriarOpen(false)}>
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handleCriar}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'linear-gradient(127deg, rgba(6,11,40,0.98) 19%, rgba(10,14,35,0.95) 77%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Novo fornecedor</h2>
              <button type="button" onClick={() => setCriarOpen(false)} className="p-1.5 rounded-lg" style={{ color: '#A0AEC0' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <Campo label="Fábrica *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Ex.: Nova Fábrica LTDA" />
              <Campo label="Prazo de entrega (dias) *" value={form.lead_time_days} onChange={v => setForm({ ...form, lead_time_days: v.replace(/\D/g, '') })} placeholder="Ex.: 45" inputMode="numeric" />
              <Campo label="Contato (nome)" value={form.contact_name} onChange={v => setForm({ ...form, contact_name: v })} placeholder="Opcional" />
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Telefone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="Opcional" />
                <Campo label="E-mail" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="Opcional" />
              </div>
            </div>

            {erro && <p className="text-xs mt-3" style={{ color: '#FC8181' }}>{erro}</p>}

            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setCriarOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
                {salvando ? 'Salvando…' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
  inputMode?: 'numeric' | 'text'
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: '#A0AEC0' }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      />
    </div>
  )
}
