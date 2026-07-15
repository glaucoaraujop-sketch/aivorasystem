'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Edit, Check, X, Percent, Tag, ShoppingBag, Building2, Plus, Star, Trash2, AlertTriangle } from 'lucide-react'
import { useCliente, useClientesMutations } from '@/hooks/useClientes'
import { clientEngagement } from '@/lib/engagement'
import { ClienteForm } from '@/components/forms/ClienteForm'
import { formatPhone } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAI } from '@/hooks/useAI'
import { AiCard } from '@/components/ai/AiCard'
import { useFornecedores, type Supplier } from '@/hooks/useFornecedores'
import {
  useClientSupplierTerms, useClientSupplierTermsMutations,
  type ClientSupplierTerm,
} from '@/hooks/useClientSupplierTerms'
import { useClientCnpjs, useClientCnpjsMutations } from '@/hooks/useClientCnpjs'
import { LojasSection } from '@/components/clientes/LojasSection'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  loja:   { label: 'Loja',   color: '#0075FF', bg: 'rgba(0,117,255,0.15)' },
  outros: { label: 'Outros', color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' },
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ac.color }} />
          <p className="font-semibold text-white text-sm truncate">{supplier.name}</p>
          {!editing && temDados && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-1"
              style={{ color: ac.color, background: ac.bg }}>
              {[
                term?.price_table ? `Tab. ${term.price_table}` : null,
                term?.discount_pct != null ? `-${term.discount_pct}%` : null,
              ].filter(Boolean).join(' · ')}
            </span>
          )}
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
        <button
          onClick={abrirEdicao}
          className="w-full text-xs py-2 rounded-lg border border-dashed transition-all"
          style={{ color: '#56577A', borderColor: 'rgba(255,255,255,0.08)' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.color = ac.color
            ;(e.currentTarget as HTMLElement).style.borderColor = ac.color
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#56577A'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
          }}
        >
          + Configurar condições
        </button>
      )}
    </div>
  )
}

// ─── Seção CNPJs / Razões Sociais ────────────────────────────────────────────
function CnpjsSection({ clientId, clientNome, clientRazao, clientCnpj }: { clientId: string; clientNome: string; clientRazao: string | null; clientCnpj: string | null }) {
  const { cnpjs, loading, refetch } = useClientCnpjs(clientId)
  const { criar, atualizar, remover, definirPrincipal } = useClientCnpjsMutations()
  const [adicionando, setAdicionando] = useState(false)
  const [novoForm, setNovoForm] = useState({ razao_social: '', cnpj: '', inscricao_estadual: '', num_lojas: '1', notes: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editLojas, setEditLojas] = useState('1')

  async function handleSalvarLojas(id: string) {
    try {
      await atualizar(id, { num_lojas: parseInt(editLojas) || 1 })
      setEditId(null)
      setErro(null)
      refetch()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar nº de lojas')
    }
  }

  function abrirAdicionar() {
    setNovoForm(p => ({
      ...p,
      razao_social: p.razao_social || clientRazao || clientNome || '',
      cnpj: p.cnpj || (clientCnpj ?? ''),
    }))
    setAdicionando(true)
  }

  async function handleAdicionar() {
    const razao = novoForm.razao_social.trim() || clientRazao?.trim() || clientNome?.trim() || ''
    if (!razao) { setErro('Razão Social é obrigatória'); return }
    setSalvando(true); setErro(null)
    try {
      await criar({
        client_id: clientId,
        razao_social: razao,
        cnpj: novoForm.cnpj.trim() || null,
        inscricao_estadual: novoForm.inscricao_estadual.trim() || null,
        num_lojas: novoForm.num_lojas ? parseInt(novoForm.num_lojas) : 1,
        notes: novoForm.notes.trim() || null,
        is_primary: cnpjs.length === 0,
      })
      setNovoForm({ razao_social: '', cnpj: '', inscricao_estadual: '', num_lojas: '1', notes: '' })
      setAdicionando(false)
      refetch()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  async function handleRemover(id: string) {
    if (!confirm('Remover este CNPJ?')) return
    await remover(id); refetch()
  }

  async function handlePrincipal(id: string) {
    await definirPrincipal(clientId, id); refetch()
  }

  if (loading) return (
    <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
      <div className="h-4 w-48 rounded-lg animate-pulse mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="glass-card rounded-2xl p-5 col-span-1 sm:col-span-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
            Razões Sociais / CNPJs
          </p>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ color: '#0075FF', background: 'rgba(0,117,255,0.12)' }}>
            {cnpjs.length} CNPJ{cnpjs.length !== 1 ? 's' : ''}
          </span>
          {cnpjs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ color: '#9F7AEA', background: 'rgba(159,122,234,0.12)' }}>
              {Math.max(...cnpjs.map(c => c.num_lojas ?? 1))} PDV
            </span>
          )}
        </div>
        <button
          onClick={abrirAdicionar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#fff' }}
        >
          <Plus size={12} /> Adicionar CNPJ / nº de lojas
        </button>
      </div>

      {erro && !adicionando && (
        <p className="text-xs mb-3" style={{ color: '#FC8181' }}>⚠ {erro}</p>
      )}

      {adicionando && (
        <div className="rounded-xl p-4 mb-4 space-y-3"
          style={{ background: 'rgba(0,117,255,0.06)', border: '1px solid rgba(0,117,255,0.2)' }}>
          <input
            value={novoForm.razao_social}
            onChange={e => setNovoForm(p => ({ ...p, razao_social: e.target.value }))}
            placeholder="Razão Social (usa a do cliente se vazio)"
            className="input-dark w-full px-3 py-2 rounded-lg text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={novoForm.cnpj}
              onChange={e => setNovoForm(p => ({ ...p, cnpj: e.target.value }))}
              placeholder="CNPJ"
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            />
            <input
              value={novoForm.inscricao_estadual}
              onChange={e => setNovoForm(p => ({ ...p, inscricao_estadual: e.target.value }))}
              placeholder="Insc. Estadual"
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium flex-shrink-0" style={{ color: '#A0AEC0' }}>Nº de Lojas (pontos de venda)</label>
            <input
              type="number" min="1"
              value={novoForm.num_lojas}
              onChange={e => setNovoForm(p => ({ ...p, num_lojas: e.target.value }))}
              className="input-dark w-20 px-2.5 py-1.5 rounded-lg text-sm text-center font-bold"
              style={{ color: '#0075FF' }}
            />
          </div>
          <input
            value={novoForm.notes}
            onChange={e => setNovoForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Observações (opcional)"
            className="input-dark w-full px-3 py-2 rounded-lg text-sm"
          />
          {erro && <p className="text-xs" style={{ color: '#FC8181' }}>⚠ {erro}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setAdicionando(false); setErro(null) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#A0AEC0' }}>
              Cancelar
            </button>
            <button onClick={handleAdicionar} disabled={salvando}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {cnpjs.length === 0 && !adicionando ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm" style={{ color: '#56577A' }}>
            Nenhum CNPJ / nº de lojas cadastrado para este cliente.
          </p>
          <button
            onClick={abrirAdicionar}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#fff' }}
          >
            <Plus size={13} /> Adicionar nº de lojas (PDV)
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {cnpjs.map(c => (
            <div key={c.id}
              className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
              style={{
                background: c.is_primary ? 'rgba(0,117,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: c.is_primary ? '1px solid rgba(0,117,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              <div className="flex items-start gap-2 min-w-0">
                <Building2 size={14} style={{ color: c.is_primary ? '#0075FF' : '#56577A', marginTop: 2, flexShrink: 0 }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{c.razao_social}</p>
                    {c.is_primary && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                        style={{ color: '#0075FF', background: 'rgba(0,117,255,0.12)' }}>
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {c.cnpj && <p className="text-xs font-mono" style={{ color: '#A0AEC0' }}>{c.cnpj}</p>}
                    {editId === c.id ? (
                      <span className="flex items-center gap-2">
                        <input
                          type="number" min="1" autoFocus
                          value={editLojas}
                          onChange={e => setEditLojas(e.target.value)}
                          className="input-dark w-16 px-2 py-1 rounded-md text-xs text-center font-bold"
                          style={{ color: '#9F7AEA' }}
                        />
                        <span className="text-xs" style={{ color: '#56577A' }}>lojas (PDV)</span>
                        <button type="button" onClick={() => handleSalvarLojas(c.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white"
                          style={{ background: '#01B574' }}>
                          <Check size={12} /> Salvar
                        </button>
                        <button type="button" onClick={() => { setEditId(null); setErro(null) }}
                          className="px-2 py-1 rounded-md text-xs font-medium"
                          style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)' }}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                          style={{ color: '#9F7AEA', background: 'rgba(159,122,234,0.12)' }}>
                          {c.num_lojas ?? 1} {(c.num_lojas ?? 1) === 1 ? 'loja' : 'lojas'} (PDV)
                        </span>
                        <button type="button" title="Editar nº de lojas"
                          onClick={() => { setEditId(c.id); setEditLojas(String(c.num_lojas ?? 1)) }}
                          style={{ color: '#56577A' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#0075FF')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#56577A')}>
                          <Edit size={12} />
                        </button>
                      </span>
                    )}
                  </div>
                  {c.inscricao_estadual && <p className="text-xs" style={{ color: '#56577A' }}>IE: {c.inscricao_estadual}</p>}
                  {c.notes && <p className="text-xs mt-1 italic" style={{ color: '#56577A' }}>{c.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!c.is_primary && (
                  <button onClick={() => handlePrincipal(c.id)}
                    className="p-1.5 rounded-lg transition-all" title="Definir como principal"
                    style={{ color: '#56577A' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F6AD55')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#56577A')}>
                    <Star size={13} />
                  </button>
                )}
                <button onClick={() => handleRemover(c.id)}
                  className="p-1.5 rounded-lg transition-all" title="Remover"
                  style={{ color: '#56577A' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#FC8181')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#56577A')}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
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
        Condições Comerciais por Fábrica
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
  const router = useRouter()
  const { cliente, loading } = useCliente(id)
  const { deletar } = useClientesMutations()
  const [editando, setEditando] = useState(false)
  const [deletando, setDeletando] = useState(false)

  const { text: aiSug, loading: aiSugLoading, error: aiSugError, generate: aiSugGenerate, reset: aiSugReset } = useAI()
  const [pedidosCliente, setPedidosCliente] = useState<Array<{ produtos: string[]; total: number; data: string }>>([])

  useEffect(() => {
    const sb = createClient()
    sb.from('orders')
      .select('total, created_at, order_items(products(name))')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!data) return
        setPedidosCliente(data.map((p: Record<string, unknown>) => ({
          produtos: ((p.order_items as Array<{ products: { name: string } | null }>) ?? [])
            .map(i => i.products?.name ?? '').filter(Boolean),
          total: (p.total as number) ?? 0,
          data: new Date(p.created_at as string).toLocaleDateString('pt-BR'),
        })))
      })
  }, [id])

  async function handleSugestoes() {
    await aiSugGenerate('/api/ai/sugestao-produtos', {
      cliente: {
        name: cliente?.name ?? '',
        company_name: cliente?.company_name,
        type: cliente?.type ?? '',
        city: cliente?.city,
        state: cliente?.state,
        last_order_at: (cliente as unknown as { last_order_at: string | null })?.last_order_at,
      },
      ultimosPedidos: pedidosCliente,
    })
  }

  async function handleDeletar() {
    if (!confirm(`Deletar o cliente "${cliente?.name}" permanentemente?\n\nEssa ação não pode ser desfeita.`)) return
    setDeletando(true)
    try {
      await deletar(id)
      router.push('/clientes')
    } catch {
      setDeletando(false)
    }
  }

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
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <button onClick={() => setEditando(!editando)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
            {editando ? 'Cancelar' : 'Editar'}
          </button>
          <button onClick={handleDeletar} disabled={deletando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'rgba(252,129,129,0.08)',
              border: '1px solid rgba(252,129,129,0.2)',
              color: '#FC8181',
            }}>
            <AlertTriangle size={15} />
            {deletando ? 'Deletando...' : 'Deletar'}
          </button>
        </div>
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

          {/* Razões Sociais / CNPJs */}
          <CnpjsSection clientId={id} clientNome={cliente.name} clientRazao={cliente.razao_social} clientCnpj={cliente.cpf_cnpj} />

          {/* Lojas / PDVs (filiais físicas) */}
          <LojasSection clientId={id} />

          {/* Comercialização por fábrica */}
          <ComercializacaoSection clientId={id} />

          {/* AIVA — Sugestões de produtos */}
          <div className="col-span-1 sm:col-span-3">
            <AiCard
              title="AIVA · Análise e sugestões para este cliente"
              text={aiSug}
              loading={aiSugLoading}
              error={aiSugError}
              onGenerate={handleSugestoes}
              onReset={aiSugReset}
              generateLabel="Analisar cliente"
              placeholder="A AIVA vai analisar o histórico e perfil desse cliente para sugerir produtos, estratégias de abordagem e oportunidades de venda."
            />
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
