'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Edit, Check, X, Percent, Tag, ShoppingBag } from 'lucide-react'
import { useCliente } from '@/hooks/useClientes'
import { clientEngagement } from '@/lib/engagement'
import { ClienteForm } from '@/components/forms/ClienteForm'
import { formatPhone } from '@/lib/utils'
import { useFornecedores, type Supplier } from '@/hooks/useFornecedores'
import {
  useClientSupplierTerms, useClientSupplierTermsMutations,
  type ClientSupplierTerm,
} from '@/hooks/useClientSupplierTerms'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  loja:         { label: 'Loja',         color: '#0075FF', bg: 'rgba(0,117,255,0.15)' },
  arquiteto:    { label: 'Arquiteto',    color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  decorador:    { label: 'Decorador',    color: '#ED64A6', bg: 'rgba(237,100,166,0.15)' },
  distribuidor: { label: 'Distribuidor', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)' },
  outros:       { label: 'Outros',       color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
}

const SUPPLIER_COLORS = [
  { color: '#0075FF', bg: 'rgba(0,117,255,0.1)',   border: 'rgba(0,117,255,0.2)'   },
  { color: '#01B574', bg: 'rgba(1,181,116,0.1)',   border: 'rgba(1,181,116,0.2)'   },
  { color: '#F6AD55', bg: 'rgba(246,173,85,0.1)',  border: 'rgba(246,173,85,0.2)'  },
  { color: '#9F7AEA', bg: 'rgba(159,122,234,0.1)', border: 'rgba(159,122,234,0.2)' },
]

const TABELAS_COMUNS = ['A', 'B', 'C', 'D']

// ─── Card de termos por fábrica ───────────────────────────────────────────────
function FabricaTermCard({
  supplier, term, clientId, colorIdx, onSave,
}: {
  supplier: Supplier
  term: ClientSupplierTerm | undefined
  clientId: string
  colorIdx: number
  onSave: () => void
}) {
  const { salvar } = useClientSupplierTermsMutations()
  const ac = SUPPLIER_COLORS[colorIdx % 4]

  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const [priceTable, setPriceTable]       = useState(term?.price_table ?? '')
  const [discountPct, setDiscountPct]     = useState(term?.discount_pct?.toString() ?? '')
  const [commercialization, setCommercialization] = useState(term?.commercialization ?? '')

  function abrirEdicao() {
    setPriceTable(term?.price_table ?? '')
    setDiscountPct(term?.discount_pct?.toString() ?? '')
    setCommercialization(term?.commercialization ?? '')
    setErro(null)
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setErro(null)
    try {
      await salvar(clientId, supplier.id, {
        price_table:       priceTable       || null,
        discount_pct:      discountPct ? parseFloat(discountPct) : null,
        commercialization: commercialization || null,
      })
      setEditing(false)
      onSave()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const temDados = term?.price_table || term?.discount_pct != null || term?.commercialization

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${ac.border}` }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ac.color }} />
          <p className="font-semibold text-white text-sm">{supplier.name}</p>
        </div>
        {!editing ? (
          <button onClick={abrirEdicao}
            className="p-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1"
            style={{ color: '#56577A', background: 'rgba(255,255,255,0.04)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = ac.color)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
            <Edit size={11} /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(false)}
              className="p-1.5 rounded-lg transition-all" style={{ color: '#56577A' }}>
              <X size={13} />
            </button>
            <button onClick={handleSave} disabled={saving}
              className="p-1.5 rounded-lg transition-all disabled:opacity-50"
              style={{ color: '#01B574' }}>
              <Check size={13} />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {/* Tabela de preço */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#56577A' }}>Tabela de preço</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TABELAS_COMUNS.map(t => (
                <button key={t} type="button"
                  onClick={() => setPriceTable(priceTable === t ? '' : t)}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                  style={priceTable === t
                    ? { background: ac.color, color: '#ffffff' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {t}
                </button>
              ))}
              <input
                value={TABELAS_COMUNS.includes(priceTable) ? '' : priceTable}
                onChange={e => setPriceTable(e.target.value)}
                placeholder="Outra…"
                className="input-dark flex-1 min-w-16 px-2.5 py-1 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Desconto */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#56577A' }}>Desconto (%)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" max="100" step="0.5"
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                placeholder="0"
                className="input-dark w-24 px-2.5 py-1.5 rounded-lg text-sm text-right"
              />
              <span className="text-sm font-semibold" style={{ color: '#56577A' }}>%</span>
            </div>
          </div>

          {/* Negociação */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#56577A' }}>Negociação / Observações</label>
            <textarea
              value={commercialization}
              onChange={e => setCommercialization(e.target.value)}
              rows={2}
              placeholder="Condições especiais, prazo, bonificações..."
              className="input-dark w-full px-2.5 py-2 rounded-lg text-xs resize-none"
            />
          </div>

          {erro && <p className="text-xs" style={{ color: '#FC8181' }}>⚠ {erro}</p>}
        </div>
      ) : temDados ? (
        <div className="space-y-2">
          {term?.price_table && (
            <div className="flex items-center gap-2">
              <Tag size={11} style={{ color: '#56577A' }} />
              <span className="text-xs font-semibold" style={{ color: '#56577A' }}>Tabela</span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-semibold"
                style={{ color: ac.color, background: ac.bg }}>
                {term.price_table}
              </span>
            </div>
          )}
          {term?.discount_pct != null && (
            <div className="flex items-center gap-2">
              <Percent size={11} style={{ color: '#56577A' }} />
              <span className="text-xs font-semibold" style={{ color: '#56577A' }}>Desconto</span>
              <span className="text-sm font-semibold" style={{ color: '#01B574' }}>
                {term.discount_pct}%
              </span>
            </div>
          )}
          {term?.commercialization && (
            <p className="text-xs leading-relaxed pt-1"
              style={{ color: '#A0AEC0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {term.commercialization}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs" style={{ color: '#56577A' }}>Sem dados comerciais</p>
      )}
    </div>
  )
}

// ─── Seção Comercialização ────────────────────────────────────────────────────
function ComercializacaoSection({ clientId }: { clientId: string }) {
  const { fornecedores, loading: loadingSup } = useFornecedores()
  const { terms, loading: loadingTerms, refetch } = useClientSupplierTerms(clientId)

  const ativos = fornecedores.filter(f => f.active)
  const termsMap = new Map(terms.map(t => [t.supplier_id, t]))

  if (loadingSup || loadingTerms) return (
    <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
      <div className="h-4 w-40 rounded-lg mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl h-28 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
      <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
        Comercialização por Fábrica
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ativos.map((supplier, idx) => (
          <FabricaTermCard
            key={supplier.id}
            supplier={supplier}
            term={termsMap.get(supplier.id)}
            clientId={clientId}
            colorIdx={idx}
            onSave={refetch}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
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
          <Link href="/clientes"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white leading-tight">{cliente.name}</h1>
            {cliente.company_name && (
              <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>{cliente.company_name}</p>
            )}
          </div>
        </div>
        <button onClick={() => setEditando(!editando)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all sm:flex-shrink-0"
          style={editando ? {
            background: 'rgba(252,129,129,0.12)',
            border: '1px solid rgba(252,129,129,0.25)',
            color: '#FC8181',
          } : {
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#A0AEC0',
          }}>
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
              {(() => {
                const eng = clientEngagement(
                  cliente.active,
                  (cliente as unknown as { last_order_at: string | null }).last_order_at ?? null,
                  cliente.created_at,
                )
                return (
                  <div>
                    <p className="text-xs mb-2" style={{ color: '#56577A' }}>Status</p>
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit"
                        style={{ color: eng.color, background: eng.bg }}>
                        {eng.label}
                      </span>
                      {eng.days !== null && cliente.active && (
                        <p className="flex items-center gap-1 text-xs" style={{ color: '#56577A' }}>
                          <ShoppingBag size={10} />
                          {eng.days === 0
                            ? 'Pedido hoje'
                            : `${eng.days}d sem pedido`}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
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

          {/* Comercialização por fábrica */}
          <ComercializacaoSection clientId={id} />

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
