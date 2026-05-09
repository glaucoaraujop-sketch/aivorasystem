'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientesMutations } from '@/hooks/useClientes'
import { createClient } from '@/lib/supabase/client'
import type { Database, ClientType } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

const TIPOS: { value: ClientType; label: string }[] = [
  { value: 'loja',         label: 'Loja' },
  { value: 'arquiteto',    label: 'Arquiteto' },
  { value: 'decorador',    label: 'Decorador' },
  { value: 'distribuidor', label: 'Distribuidor' },
  { value: 'outros',       label: 'Outros' },
]

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface Props { cliente?: Client }

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-1 sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
const selectCls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"

export function ClienteForm({ cliente }: Props) {
  const router = useRouter()
  const { criar, atualizar } = useClientesMutations()
  const supabase = createClient()

  const [priceTables, setPriceTables] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:                 cliente?.name ?? '',
    company_name:         cliente?.company_name ?? '',
    razao_social:         cliente?.razao_social ?? '',
    inscricao_estadual:   cliente?.inscricao_estadual ?? '',
    type:                 (cliente?.type ?? 'loja') as ClientType,
    cpf_cnpj:             cliente?.cpf_cnpj ?? '',
    price_table_id:       cliente?.price_table_id ?? '',
    num_lojas:            String(cliente?.num_lojas ?? ''),
    area_restrita:        cliente?.area_restrita ?? false,
    address:              cliente?.address ?? '',
    cep:                  cliente?.cep ?? '',
    endereco_entrega:     cliente?.endereco_entrega ?? '',
    cep_entrega:          cliente?.cep_entrega ?? '',
    city:                 cliente?.city ?? '',
    state:                cliente?.state ?? '',
    region:               cliente?.region ?? '',
    email_compras:        cliente?.email_compras ?? '',
    telefone_compras:     cliente?.telefone_compras ?? '',
    email_assistencia:    cliente?.email_assistencia ?? '',
    telefone_assistencia: cliente?.telefone_assistencia ?? '',
    email_financeiro:     cliente?.email_financeiro ?? '',
    telefone_financeiro:  cliente?.telefone_financeiro ?? '',
    email_deposito:       cliente?.email_deposito ?? '',
    telefone_deposito:    cliente?.telefone_deposito ?? '',
    email_agendamento:    cliente?.email_agendamento ?? '',
    telefone_agendamento: cliente?.telefone_agendamento ?? '',
    email_comunicado:     cliente?.email_comunicado ?? '',
    whatsapp:             cliente?.whatsapp ?? '',
    phone:                cliente?.phone ?? '',
    email:                cliente?.email ?? '',
    notes:                cliente?.notes ?? '',
  })

  useEffect(() => {
    supabase.from('price_tables').select('id, name').eq('active', true).then(({ data }) => setPriceTables(data ?? []))
  }, [])

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const n = (v: string) => v.trim() || null
      const payload = {
        name:                 form.name,
        company_name:         n(form.company_name),
        razao_social:         n(form.razao_social),
        inscricao_estadual:   n(form.inscricao_estadual),
        type:                 form.type,
        cpf_cnpj:             n(form.cpf_cnpj),
        price_table_id:       form.price_table_id || null,
        num_lojas:            form.num_lojas ? parseInt(form.num_lojas) : null,
        area_restrita:        form.area_restrita,
        address:              n(form.address),
        cep:                  n(form.cep),
        endereco_entrega:     n(form.endereco_entrega),
        cep_entrega:          n(form.cep_entrega),
        city:                 n(form.city),
        state:                n(form.state),
        region:               n(form.region),
        email_compras:        n(form.email_compras),
        telefone_compras:     n(form.telefone_compras),
        email_assistencia:    n(form.email_assistencia),
        telefone_assistencia: n(form.telefone_assistencia),
        email_financeiro:     n(form.email_financeiro),
        telefone_financeiro:  n(form.telefone_financeiro),
        email_deposito:       n(form.email_deposito),
        telefone_deposito:    n(form.telefone_deposito),
        email_agendamento:    n(form.email_agendamento),
        telefone_agendamento: n(form.telefone_agendamento),
        email_comunicado:     n(form.email_comunicado),
        whatsapp:             n(form.whatsapp),
        phone:                n(form.phone),
        email:                n(form.email),
        notes:                n(form.notes),
      }
      if (cliente) await atualizar(cliente.id, payload)
      else await criar(payload)
      router.push('/clientes')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl w-full">

      {/* Identificação */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-900 text-base">Identificação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome Fantasia *" span2>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Razão Social">
            <input value={form.razao_social} onChange={e => set('razao_social', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Nome do Responsável">
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)} className={inputCls} />
          </Field>
          <Field label="CNPJ">
            <input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder="00.000.000/0000-00" className={inputCls} />
          </Field>
          <Field label="Inscrição Estadual">
            <input value={form.inscricao_estadual} onChange={e => set('inscricao_estadual', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tipo *">
            <select value={form.type} onChange={e => set('type', e.target.value)} className={selectCls}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Tabela de Preço">
            <select value={form.price_table_id} onChange={e => set('price_table_id', e.target.value)} className={selectCls}>
              <option value="">Selecionar...</option>
              {priceTables.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Nº de Lojas">
            <input type="number" min="0" value={form.num_lojas} onChange={e => set('num_lojas', e.target.value)} className={inputCls} />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <input type="checkbox" id="area_restrita" checked={form.area_restrita}
              onChange={e => set('area_restrita', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="area_restrita" className="text-sm font-medium text-slate-700">Área Restrita</label>
          </div>
        </div>
      </section>

      {/* Endereços */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-900 text-base">Endereços</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Estado">
            <select value={form.state} onChange={e => set('state', e.target.value)} className={selectCls}>
              <option value="">UF</option>
              {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
          <Field label="Cidade">
            <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Região">
            <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="ex: Norte, Zona Sul" className={inputCls} />
          </Field>
          <Field label="CEP (Faturamento)">
            <input value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" className={inputCls} />
          </Field>
          <Field label="Endereço de Faturamento" span2>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" className={inputCls} />
          </Field>
          <Field label="CEP (Entrega)">
            <input value={form.cep_entrega} onChange={e => set('cep_entrega', e.target.value)} placeholder="00000-000" className={inputCls} />
          </Field>
          <Field label="Endereço de Entrega" span2>
            <input value={form.endereco_entrega} onChange={e => set('endereco_entrega', e.target.value)} placeholder="Rua, número, bairro" className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Contato Geral */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-900 text-base">Contato Geral</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="WhatsApp">
            <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" className={inputCls} />
          </Field>
          <Field label="Telefone">
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 0000-0000" className={inputCls} />
          </Field>
          <Field label="E-mail Geral" span2>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Contatos por Setor */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-bold text-slate-900 text-base">Contatos por Setor</h2>
        {[
          { label: 'Compras',             email: 'email_compras',        tel: 'telefone_compras' },
          { label: 'Assistência Técnica', email: 'email_assistencia',    tel: 'telefone_assistencia' },
          { label: 'Financeiro',          email: 'email_financeiro',     tel: 'telefone_financeiro' },
          { label: 'Depósito / Entrega',  email: 'email_deposito',       tel: 'telefone_deposito' },
          { label: 'Agendamento Entrega', email: 'email_agendamento',    tel: 'telefone_agendamento' },
        ].map(({ label, email, tel }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email"
                value={(form as Record<string, string>)[email]}
                onChange={e => set(email, e.target.value)}
                placeholder="e-mail"
                className={inputCls}
              />
              <input
                value={(form as Record<string, string>)[tel]}
                onChange={e => set(tel, e.target.value)}
                placeholder="telefone"
                className={inputCls}
              />
            </div>
          </div>
        ))}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Comunicados e Tabelas</p>
          <input type="email"
            value={form.email_comunicado}
            onChange={e => set('email_comunicado', e.target.value)}
            placeholder="e-mail para envio de comunicados e tabelas de preço"
            className={inputCls}
          />
        </div>
      </section>

      {/* Observações */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <Field label="Observações">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} className={`${inputCls} resize-none`} />
        </Field>
      </section>

      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => router.push('/clientes')}
          className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-200 transition-all">
          {saving ? 'Salvando...' : cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>
      </div>
    </form>
  )
}
