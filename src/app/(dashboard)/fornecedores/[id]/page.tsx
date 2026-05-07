'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Save } from 'lucide-react'
import { useFornecedor, useFornecedoresMutations, calcularEntrega } from '@/hooks/useFornecedores'
import { formatDate, formatPhone } from '@/lib/utils'

const PRAZO_COLOR: (days: number) => string = (days) => {
  if (days <= 35) return 'bg-green-100 text-green-700'
  if (days <= 45) return 'bg-yellow-100 text-yellow-700'
  return 'bg-orange-100 text-orange-700'
}

export default function FornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { fornecedor, loading } = useFornecedor(id)
  const { atualizar } = useFornecedoresMutations()

  const [editando, setEditando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:           '',
    lead_time_days: 0,
    contact_name:   '',
    phone:          '',
    whatsapp:       '',
    email:          '',
    notes:          '',
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
    setSaving(true)
    setError('')
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
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
  if (!fornecedor) return <p className="text-gray-500">Fornecedor não encontrado.</p>

  const previsao = calcularEntrega(editando ? Number(form.lead_time_days) : fornecedor.lead_time_days)

  return (
    <div className="max-w-xl w-full">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/fornecedores" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{fornecedor.name}</h1>
        {!editando ? (
          <button onClick={iniciarEdicao}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditando(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Prazo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-4">Prazo de Produção + Entrega</p>

          {editando ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo em dias *</label>
                <input type="number" min="1" max="365"
                  value={form.lead_time_days}
                  onChange={e => setForm(p => ({ ...p, lead_time_days: parseInt(e.target.value) || 0 }))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-xl font-bold ${PRAZO_COLOR(fornecedor.lead_time_days)}`}>
                <Clock size={20} />
                {fornecedor.lead_time_days} dias
              </span>
            </div>
          )}

          <div className="mt-4 bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Se pedir hoje, entrega em:</p>
            <p className="font-bold text-gray-900 text-lg">{formatDate(previsao)}</p>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-4">Contato</p>

          {editando ? (
            <div className="space-y-3">
              {[
                { label: 'Nome do contato', field: 'contact_name', placeholder: 'ex: João Silva' },
                { label: 'WhatsApp',        field: 'whatsapp',     placeholder: '(00) 00000-0000' },
                { label: 'Telefone',        field: 'phone',        placeholder: '(00) 0000-0000' },
                { label: 'E-mail',          field: 'email',        placeholder: 'contato@empresa.com' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input value={form[field as keyof typeof form]} placeholder={placeholder}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-700">
              {fornecedor.contact_name && <p><span className="text-gray-400">Contato: </span>{fornecedor.contact_name}</p>}
              {fornecedor.whatsapp && <p><span className="text-gray-400">WhatsApp: </span>{formatPhone(fornecedor.whatsapp)}</p>}
              {fornecedor.phone && <p><span className="text-gray-400">Telefone: </span>{formatPhone(fornecedor.phone)}</p>}
              {fornecedor.email && <p><span className="text-gray-400">E-mail: </span>{fornecedor.email}</p>}
              {!fornecedor.contact_name && !fornecedor.whatsapp && !fornecedor.phone && !fornecedor.email && (
                <p className="text-gray-400">Nenhum contato cadastrado. Clique em Editar para adicionar.</p>
              )}
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Observações</p>
          {editando ? (
            <textarea value={form.notes} rows={3}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Condições comerciais, restrições, observações gerais..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          ) : (
            <p className="text-sm text-gray-700">{fornecedor.notes ?? <span className="text-gray-400">—</span>}</p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  )
}
