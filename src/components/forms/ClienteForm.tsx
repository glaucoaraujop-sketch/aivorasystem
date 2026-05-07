'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientesMutations } from '@/hooks/useClientes'
import { createClient } from '@/lib/supabase/client'
import type { Database, ClientType } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

const TIPOS: { value: ClientType; label: string }[] = [
  { value: 'loja',        label: 'Loja' },
  { value: 'arquiteto',   label: 'Arquiteto' },
  { value: 'decorador',   label: 'Decorador' },
  { value: 'distribuidor',label: 'Distribuidor' },
  { value: 'outros',      label: 'Outros' },
]

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface Props {
  cliente?: Client
}

export function ClienteForm({ cliente }: Props) {
  const router = useRouter()
  const { criar, atualizar } = useClientesMutations()
  const supabase = createClient()

  const [priceTables, setPriceTables] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:           cliente?.name ?? '',
    company_name:   cliente?.company_name ?? '',
    type:           (cliente?.type ?? 'loja') as ClientType,
    email:          cliente?.email ?? '',
    phone:          cliente?.phone ?? '',
    whatsapp:       cliente?.whatsapp ?? '',
    cpf_cnpj:       cliente?.cpf_cnpj ?? '',
    price_table_id: cliente?.price_table_id ?? '',
    region:         cliente?.region ?? '',
    city:           cliente?.city ?? '',
    state:          cliente?.state ?? '',
    address:        cliente?.address ?? '',
    notes:          cliente?.notes ?? '',
  })

  useEffect(() => {
    supabase.from('price_tables').select('id, name').eq('active', true).then(({ data }) => setPriceTables(data ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        price_table_id: form.price_table_id || null,
        email:    form.email || null,
        phone:    form.phone || null,
        whatsapp: form.whatsapp || null,
        cpf_cnpj: form.cpf_cnpj || null,
        region:   form.region || null,
        city:     form.city || null,
        state:    form.state || null,
        address:  form.address || null,
        notes:    form.notes || null,
        company_name: form.company_name || null,
      }

      if (cliente) await atualizar(cliente.id, payload)
      else await criar(payload)

      router.push('/clientes')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl w-full">
      {/* Identificação */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Identificação</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF / CNPJ</label>
            <input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tabela de Preço</label>
            <select value={form.price_table_id} onChange={e => set('price_table_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecionar...</option>
              {priceTables.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Contato</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="(00) 0000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </section>

      {/* Localização */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Localização</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select value={form.state} onChange={e => set('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">UF</option>
              {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input value={form.city} onChange={e => set('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
            <input value={form.region} onChange={e => set('region', e.target.value)}
              placeholder="ex: Norte, Zona Sul"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="col-span-1 sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push('/clientes')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>
      </div>
    </form>
  )
}
