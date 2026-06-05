'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClientesMutations } from '@/hooks/useClientes'
import { maskCpfCnpj, maskPhone, maskCep } from '@/lib/masks'
import type { Database, ClientType } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

const TIPOS: { value: ClientType; label: string }[] = [
  { value: 'loja',   label: 'Loja' },
  { value: 'outros', label: 'Outros' },
]

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface Props { cliente?: Client }

const cardStyle = {
  background: 'linear-gradient(127.09deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-6 space-y-4" style={cardStyle}>
      <h2 className="font-bold text-white text-base">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-1 sm:col-span-2' : ''}>
      <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>{label}</label>
      {children}
    </div>
  )
}

export function ClienteForm({ cliente }: Props) {
  const router = useRouter()
  const { criar, atualizar } = useClientesMutations()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cepLoading, setCepLoading] = useState<'fat' | 'ent' | null>(null)

  const [form, setForm] = useState({
    priority:             String(cliente?.priority ?? ''),
    name:                 cliente?.name ?? '',
    company_name:         cliente?.company_name ?? '',
    razao_social:         cliente?.razao_social ?? '',
    inscricao_estadual:   cliente?.inscricao_estadual ?? '',
    type:                 (cliente?.type ?? 'loja') as ClientType,
    cpf_cnpj:             cliente?.cpf_cnpj ?? '',
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

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function buscarCep(cep: string, tipo: 'fat' | 'ent') {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(tipo)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) return
      if (tipo === 'fat') {
        setForm(prev => ({
          ...prev,
          address: [data.logradouro, data.bairro].filter(Boolean).join(', '),
          city:    data.localidade ?? prev.city,
          state:   data.uf         ?? prev.state,
        }))
      } else {
        setForm(prev => ({
          ...prev,
          endereco_entrega: [data.logradouro, data.bairro].filter(Boolean).join(', '),
        }))
      }
    } catch { /* falha silenciosa — usuário pode preencher manualmente */ }
    finally { setCepLoading(null) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const n = (v: string) => v.trim() || null
      const payload = {
        priority:             form.priority ? parseInt(form.priority) : null,
        name:                 form.name,
        company_name:         n(form.company_name),
        razao_social:         n(form.razao_social),
        inscricao_estadual:   n(form.inscricao_estadual),
        type:                 form.type,
        cpf_cnpj:             n(form.cpf_cnpj),
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
      <Section title="Identificação">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome Fantasia *" span2>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" required />
          </Field>
          <Field label="Razão Social">
            <input value={form.razao_social} onChange={e => set('razao_social', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Nome do Responsável">
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="CPF / CNPJ">
            <input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', maskCpfCnpj(e.target.value))} placeholder="000.000.000-00 ou 00.000.000/0000-00" className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Inscrição Estadual">
            <input value={form.inscricao_estadual} onChange={e => set('inscricao_estadual', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Tipo *">
            <select value={form.type} onChange={e => set('type', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Prioridade de visita">
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">Sem prioridade definida</option>
              <option value="1">P1 VIP — Visita mais frequente</option>
              <option value="2">P2 Ouro — Cadência regular</option>
              <option value="3">P3 Prata — Em desenvolvimento</option>
              <option value="4">P4 Bronze — Baixa frequência</option>
            </select>
          </Field>

        </div>
      </Section>

      {/* Endereços */}
      <Section title="Endereços">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Estado">
            <select value={form.state} onChange={e => set('state', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">UF</option>
              {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </Field>
          <Field label="Cidade">
            <input value={form.city} onChange={e => set('city', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Região">
            <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="ex: Norte, Zona Sul" className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="CEP (Faturamento)">
            <div className="relative">
              <input
                value={form.cep}
                onChange={e => { const v = maskCep(e.target.value); set('cep', v); buscarCep(v, 'fat') }}
                placeholder="00000-000"
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm"
              />
              {cepLoading === 'fat' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#0075FF' }}>
                  buscando...
                </span>
              )}
            </div>
          </Field>
          <Field label="Endereço de Faturamento" span2>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="CEP (Entrega)">
            <div className="relative">
              <input
                value={form.cep_entrega}
                onChange={e => { const v = maskCep(e.target.value); set('cep_entrega', v); buscarCep(v, 'ent') }}
                placeholder="00000-000"
                className="input-dark w-full px-3 py-2.5 rounded-xl text-sm"
              />
              {cepLoading === 'ent' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#0075FF' }}>
                  buscando...
                </span>
              )}
            </div>
          </Field>
          <Field label="Endereço de Entrega" span2>
            <input value={form.endereco_entrega} onChange={e => set('endereco_entrega', e.target.value)} placeholder="Rua, número, bairro" className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <div className="col-span-1 sm:col-span-2 flex items-center gap-3 pt-1">
            <input type="checkbox" id="area_restrita" checked={form.area_restrita}
              onChange={e => set('area_restrita', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-transparent accent-blue-500" />
            <label htmlFor="area_restrita" className="text-sm font-medium" style={{ color: '#A0AEC0' }}>Área Restrita</label>
          </div>
        </div>
      </Section>

      {/* Contato Geral */}
      <Section title="Contato Geral">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="WhatsApp">
            <input value={form.whatsapp} onChange={e => set('whatsapp', maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Telefone">
            <input value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="E-mail Geral" span2>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
        </div>
      </Section>

      {/* Contatos por Setor */}
      <Section title="Contatos por Setor">
        <div className="space-y-5">
          {[
            { label: 'Compras',             email: 'email_compras',        tel: 'telefone_compras' },
            { label: 'Assistência Técnica', email: 'email_assistencia',    tel: 'telefone_assistencia' },
            { label: 'Financeiro',          email: 'email_financeiro',     tel: 'telefone_financeiro' },
            { label: 'Depósito / Entrega',  email: 'email_deposito',       tel: 'telefone_deposito' },
            { label: 'Agendamento Entrega', email: 'email_agendamento',    tel: 'telefone_agendamento' },
          ].map(({ label, email, tel }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#56577A' }}>{label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="email"
                  value={(form as unknown as Record<string, string>)[email]}
                  onChange={e => set(email, e.target.value)}
                  placeholder="e-mail"
                  className="input-dark w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <input
                  value={(form as unknown as Record<string, string>)[tel]}
                  onChange={e => set(tel, maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="input-dark w-full px-3 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#56577A' }}>Comunicados e Tabelas</p>
            <input type="email"
              value={form.email_comunicado}
              onChange={e => set('email_comunicado', e.target.value)}
              placeholder="e-mail para envio de comunicados e tabelas de preço"
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>
        </div>
      </Section>

      {/* Observações */}
      <section className="rounded-2xl p-6" style={cardStyle}>
        <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Observações</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={3} className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
      </section>

      {error && (
        <p className="text-sm rounded-xl p-3" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => router.push('/clientes')}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#A0AEC0',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
            boxShadow: '0 4px 20px rgba(0,117,255,0.3)',
          }}>
          {saving ? 'Salvando...' : cliente ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>
      </div>
    </form>
  )
}
