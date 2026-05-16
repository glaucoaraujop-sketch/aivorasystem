'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Save, Phone, Mail, User, Edit, X, Wrench, DollarSign, Truck, Award } from 'lucide-react'
import { useFornecedor, useFornecedoresMutations, calcularEntrega, type Supplier } from '@/hooks/useFornecedores'
import { formatDate, formatPhone } from '@/lib/utils'
import { maskPhone } from '@/lib/masks'

function prazoColor(days: number): { color: string; bg: string } {
  if (days <= 35) return { color: '#01B574', bg: 'rgba(1,181,116,0.15)'   }
  if (days <= 45) return { color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  }
  return             { color: '#FC8181', bg: 'rgba(252,129,129,0.15)'    }
}

const SETORES = [
  {
    key: 'assistencia',
    label: 'Assistência Técnica',
    icon: Wrench,
    color: '#0075FF',
    bg: 'rgba(0,117,255,0.1)',
    border: 'rgba(0,117,255,0.25)',
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    color: '#01B574',
    bg: 'rgba(1,181,116,0.1)',
    border: 'rgba(1,181,116,0.25)',
  },
  {
    key: 'logistica',
    label: 'Logística',
    icon: Truck,
    color: '#F6AD55',
    bg: 'rgba(246,173,85,0.1)',
    border: 'rgba(246,173,85,0.25)',
  },
  {
    key: 'supervisor',
    label: 'Supervisor de Vendas',
    icon: Award,
    color: '#9F7AEA',
    bg: 'rgba(159,122,234,0.1)',
    border: 'rgba(159,122,234,0.25)',
  },
] as const

type SetorKey = typeof SETORES[number]['key']

type FormState = {
  name: string
  lead_time_days: number
  notes: string
} & Record<`${SetorKey}_nome` | `${SetorKey}_whatsapp` | `${SetorKey}_email`, string>

function buildForm(f: Supplier): FormState {
  return {
    name:           f.name,
    lead_time_days: f.lead_time_days,
    notes:          f.notes ?? '',
    assistencia_nome:     f.assistencia_nome     ?? '',
    assistencia_whatsapp: f.assistencia_whatsapp ?? '',
    assistencia_email:    f.assistencia_email    ?? '',
    financeiro_nome:      f.financeiro_nome      ?? '',
    financeiro_whatsapp:  f.financeiro_whatsapp  ?? '',
    financeiro_email:     f.financeiro_email     ?? '',
    logistica_nome:       f.logistica_nome       ?? '',
    logistica_whatsapp:   f.logistica_whatsapp   ?? '',
    logistica_email:      f.logistica_email      ?? '',
    supervisor_nome:      f.supervisor_nome      ?? '',
    supervisor_whatsapp:  f.supervisor_whatsapp  ?? '',
    supervisor_email:     f.supervisor_email     ?? '',
  }
}

export default function FornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { fornecedor, loading } = useFornecedor(id)
  const { atualizar } = useFornecedoresMutations()

  const [editando, setEditando] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState<FormState>({
    name: '', lead_time_days: 0, notes: '',
    assistencia_nome: '', assistencia_whatsapp: '', assistencia_email: '',
    financeiro_nome:  '', financeiro_whatsapp:  '', financeiro_email:  '',
    logistica_nome:   '', logistica_whatsapp:   '', logistica_email:   '',
    supervisor_nome:  '', supervisor_whatsapp:  '', supervisor_email:  '',
  })

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(p => ({ ...p, [field]: value }))
  }

  function iniciarEdicao() {
    if (!fornecedor) return
    setForm(buildForm(fornecedor))
    setEditando(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      await atualizar(id, {
        name:           form.name,
        lead_time_days: Number(form.lead_time_days),
        notes:          form.notes || null,
        assistencia_nome:     form.assistencia_nome     || null,
        assistencia_whatsapp: form.assistencia_whatsapp || null,
        assistencia_email:    form.assistencia_email    || null,
        financeiro_nome:      form.financeiro_nome      || null,
        financeiro_whatsapp:  form.financeiro_whatsapp  || null,
        financeiro_email:     form.financeiro_email     || null,
        logistica_nome:       form.logistica_nome       || null,
        logistica_whatsapp:   form.logistica_whatsapp   || null,
        logistica_email:      form.logistica_email      || null,
        supervisor_nome:      form.supervisor_nome      || null,
        supervisor_whatsapp:  form.supervisor_whatsapp  || null,
        supervisor_email:     form.supervisor_email     || null,
      })
      setEditando(false)
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="max-w-2xl w-full space-y-4 animate-pulse">
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
    <div className="max-w-2xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link href="/fornecedores"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}>
            <ArrowLeft size={18} />
          </Link>
          {editando ? (
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="input-dark text-2xl font-bold px-3 py-1.5 rounded-xl w-full" />
          ) : (
            <h1 className="text-2xl font-semibold text-white">{fornecedor.name}</h1>
          )}
        </div>
        <div className="flex gap-2 sm:flex-shrink-0">
          {!editando ? (
            <button onClick={iniciarEdicao}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
                onChange={e => set('lead_time_days', parseInt(e.target.value) || 0)}
                className="input-dark w-32 px-3 py-2.5 rounded-xl text-sm" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 px-4 py-2 rounded-full text-xl font-semibold"
                style={{ color: prazo.color, background: prazo.bg }}>
                <Clock size={20} />
                {fornecedor.lead_time_days} dias
              </span>
            </div>
          )}
          <div className="mt-4 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-0.5" style={{ color: '#56577A' }}>Se pedir hoje, entrega em:</p>
            <p className="font-semibold text-white text-lg">{formatDate(previsao)}</p>
          </div>
        </div>

        {/* Contatos Setoriais */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
            Contatos por Setor
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SETORES.map(setor => {
              const Icon = setor.icon
              const nome     = editando ? form[`${setor.key}_nome`]     : fornecedor[`${setor.key}_nome`]
              const whatsapp = editando ? form[`${setor.key}_whatsapp`] : fornecedor[`${setor.key}_whatsapp`]
              const email    = editando ? form[`${setor.key}_email`]    : fornecedor[`${setor.key}_email`]
              const temDados = !editando && (nome || whatsapp || email)

              return (
                <div key={setor.key} className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${setor.border}` }}>

                  {/* Header do setor */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: setor.bg }}>
                      <Icon size={13} style={{ color: setor.color }} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: setor.color }}>
                      {setor.label}
                    </p>
                  </div>

                  {editando ? (
                    <div className="space-y-2">
                      {[
                        { field: `${setor.key}_nome`     as keyof FormState, label: 'Nome',      placeholder: 'Nome do contato' },
                        { field: `${setor.key}_whatsapp` as keyof FormState, label: 'WhatsApp',  placeholder: '(00) 00000-0000' },
                        { field: `${setor.key}_email`    as keyof FormState, label: 'E-mail',    placeholder: 'email@empresa.com' },
                      ].map(({ field, label, placeholder }) => (
                        <div key={field}>
                          <label className="block text-xs mb-1" style={{ color: '#56577A' }}>{label}</label>
                          <input
                            value={form[field] as string}
                            placeholder={placeholder}
                            onChange={e => {
                              const val = field.toString().includes('whatsapp')
                                ? maskPhone(e.target.value)
                                : e.target.value
                              set(field, val as FormState[typeof field])
                            }}
                            className="input-dark w-full px-2.5 py-2 rounded-lg text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  ) : temDados ? (
                    <div className="space-y-1.5 text-xs">
                      {nome && (
                        <p className="flex items-center gap-1.5" style={{ color: '#A0AEC0' }}>
                          <User size={11} style={{ color: '#56577A' }} /> {nome}
                        </p>
                      )}
                      {whatsapp && (
                        <a href={`https://wa.me/55${whatsapp.replace(/\D/g, '')}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                          style={{ color: '#01B574' }}>
                          <Phone size={11} /> {formatPhone(whatsapp)}
                        </a>
                      )}
                      {email && (
                        <a href={`mailto:${email}`}
                          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                          style={{ color: '#0075FF' }}>
                          <Mail size={11} /> {email}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: '#56577A' }}>Não cadastrado</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Observações */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A0AEC0' }}>Observações</p>
          {editando ? (
            <textarea value={form.notes} rows={3}
              onChange={e => set('notes', e.target.value)}
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
