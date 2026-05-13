'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Save, Phone, Mail, User, Edit, X } from 'lucide-react'
import { useFornecedor, useFornecedoresMutations, calcularEntrega } from '@/hooks/useFornecedores'
import { formatDate, formatPhone } from '@/lib/utils'

function prazoColor(days: number): { color: string; bg: string } {
  if (days <= 35) return { color: '#01B574', bg: 'rgba(1,181,116,0.15)'   }
  if (days <= 45) return { color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  }
  return             { color: '#FC8181', bg: 'rgba(252,129,129,0.15)'    }
}

export default function FornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { fornecedor, loading } = useFornecedor(id)
  const { atualizar } = useFornecedoresMutations()

  const [editando, setEditando] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    name: '', lead_time_days: 0, contact_name: '',
    phone: '', whatsapp: '', email: '', notes: '',
  })

  function iniciarEdicao() {
    if (!fornecedor) return
    setForm({
      name:           fornecedor.name,
      lead_time_days: fornecedor.lead_time_days,
      contact_name:   fornecedor.contact_name ?? '',
      phone:          fornecedor.phone ?? '',
      whatsapp:       fornecedor.whatsapp ?? '',
      email:          fornecedor.email ?? '',
      notes:          fornecedor.notes ?? '',
    })
    setEditando(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      await atualizar(id, {
        ...form,
        lead_time_days: Number(form.lead_time_days),
        contact_name: form.contact_name || null,
        phone:        form.phone || null,
        whatsapp:     form.whatsapp || null,
        email:        form.email || null,
        notes:        form.notes || null,
      })
      setEditando(false)
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="max-w-xl w-full space-y-4 animate-pulse">
      <div className="h-8 rounded-xl w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )

  if (!fornecedor) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <p className="text-white font-semibold">Fornecedor não encontrado</p>
    </div>
  )

  const prazo    = prazoColor(editando ? Number(form.lead_time_days) : fornecedor.lead_time_days)
  const previsao = calcularEntrega(editando ? Number(form.lead_time_days) : fornecedor.lead_time_days)

  return (
    <div className="max-w-xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link
            href="/fornecedores"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-black text-white">{fornecedor.name}</h1>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          {!editando ? (
            <button onClick={iniciarEdicao}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#A0AEC0' }}>
              <Edit size={15} /> Editar
            </button>
          ) : (
            <>
              <button onClick={() => setEditando(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <X size={15} />
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 16px rgba(0,117,255,0.3)' }}>
                <Save size={14} />
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Prazo */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
            Prazo de Produção + Entrega
          </p>
          {editando ? (
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#A0AEC0' }}>Prazo em dias *</label>
              <input type="number" min="1" max="365"
                value={form.lead_time_days}
                onChange={e => setForm(p => ({ ...p, lead_time_days: parseInt(e.target.value) || 0 }))}
                className="input-dark w-32 px-3 py-2.5 rounded-xl text-sm" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 px-4 py-2 rounded-full text-xl font-black"
                style={{ color: prazo.color, background: prazo.bg }}>
                <Clock size={20} />
                {fornecedor.lead_time_days} dias
              </span>
            </div>
          )}
          <div className="mt-4 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-0.5" style={{ color: '#56577A' }}>Se pedir hoje, entrega em:</p>
            <p className="font-black text-white text-lg">{formatDate(previsao)}</p>
          </div>
        </div>

        {/* Contato */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>Contato</p>
          {editando ? (
            <div className="space-y-3">
              {[
                { label: 'Nome do contato', field: 'contact_name', placeholder: 'ex: João Silva' },
                { label: 'WhatsApp',        field: 'whatsapp',     placeholder: '(00) 00000-0000' },
                { label: 'Telefone',        field: 'phone',        placeholder: '(00) 0000-0000'  },
                { label: 'E-mail',          field: 'email',        placeholder: 'contato@empresa.com' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#A0AEC0' }}>{label}</label>
                  <input value={form[field as keyof typeof form]} placeholder={placeholder}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {fornecedor.contact_name && (
                <p className="flex items-center gap-2" style={{ color: '#A0AEC0' }}>
                  <User size={14} style={{ color: '#56577A' }} /> {fornecedor.contact_name}
                </p>
              )}
              {fornecedor.whatsapp && (
                <p className="flex items-center gap-2" style={{ color: '#01B574' }}>
                  <Phone size={14} /> {formatPhone(fornecedor.whatsapp)}
                </p>
              )}
              {fornecedor.phone && (
                <p className="flex items-center gap-2" style={{ color: '#A0AEC0' }}>
                  <Phone size={14} style={{ color: '#56577A' }} /> {formatPhone(fornecedor.phone)}
                </p>
              )}
              {fornecedor.email && (
                <p className="flex items-center gap-2" style={{ color: '#0075FF' }}>
                  <Mail size={14} /> {fornecedor.email}
                </p>
              )}
              {!fornecedor.contact_name && !fornecedor.whatsapp && !fornecedor.phone && !fornecedor.email && (
                <p style={{ color: '#56577A' }}>Nenhum contato cadastrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>Observações</p>
          {editando ? (
            <textarea value={form.notes} rows={3}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Condições comerciais, restrições, observações gerais..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: fornecedor.notes ? '#A0AEC0' : '#56577A' }}>
              {fornecedor.notes ?? '—'}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl"
            style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
