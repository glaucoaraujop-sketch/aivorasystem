'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, Package, Tag, Percent, Info } from 'lucide-react'
import { useOrcamentosMutations } from '@/hooks/useOrcamentos'
import { useTabelasPreco } from '@/hooks/useProdutos'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface ItemForm {
  product_id: string; name: string; code: string; unit: string
  quantity: number; unit_price: number; discount_pct: number; notes: string
}
interface ClienteOption  { id: string; name: string; company_name: string | null }
interface FornecedorOpt  { id: string; name: string }
interface ProdutoOption  { id: string; name: string; code: string; unit: string; prices: { price_table_id: string; price: number }[] }
interface TermInfo       { price_table: string | null; discount_pct: number | null; commercialization: string | null }

const glass        = { background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)', backdropFilter: 'blur(120px)', border: '1px solid rgba(255,255,255,0.08)' }
const dropdownStyle = { background: 'rgba(6,11,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }

export function OrcamentoForm() {
  const router  = useRouter()
  const { criar } = useOrcamentosMutations()
  const tabelas   = useTabelasPreco()
  const supabase  = createClient()

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // Cliente
  const [clienteId,    setClienteId]    = useState('')
  const [clienteSel,   setClienteSel]   = useState<ClienteOption | null>(null)
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientes,     setClientes]     = useState<ClienteOption[]>([])

  // Fábrica
  const [fornecedorId,    setFornecedorId]    = useState('')
  const [fornecedorSel,   setFornecedorSel]   = useState<FornecedorOpt | null>(null)
  const [fornecedorBusca, setFornecedorBusca] = useState('')
  const [fornecedores,    setFornecedores]     = useState<FornecedorOpt[]>([])

  // Termos comerciais auto-carregados ao selecionar cliente+fábrica
  const [termInfo, setTermInfo]   = useState<TermInfo | null>(null)
  const [tabelaId, setTabelaId]   = useState('')   // UUID resolvido do price_tables
  const [defaultDesconto, setDefaultDesconto] = useState(0) // desconto padrão do cliente nessa fábrica

  // Outros campos do cabeçalho
  const [ordemCompra, setOrdemCompra] = useState('')
  const [validoAte,   setValidoAte]   = useState('')
  const [notas,       setNotas]       = useState('')

  // Produtos / itens
  const [produtos,         setProdutos]         = useState<ProdutoOption[]>([])
  const [produtoBusca,     setProdutoBusca]     = useState('')
  const [mostrarProdutos,  setMostrarProdutos]  = useState(false)
  const [itens,            setItens]            = useState<ItemForm[]>([])

  // ── Busca de clientes ──────────────────────────────────────────────────────
  useEffect(() => {
    if (clienteBusca.length < 2) { setClientes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name')
      .or(`name.ilike.%${clienteBusca}%,company_name.ilike.%${clienteBusca}%`)
      .eq('active', true).limit(6)
      .then(({ data }: { data: ClienteOption[] }) => setClientes(data ?? []))
  }, [clienteBusca])

  function selecionarCliente(c: ClienteOption) {
    setClienteSel(c); setClienteId(c.id)
    setClienteBusca(''); setClientes([])
    setTermInfo(null); setTabelaId(''); setDefaultDesconto(0)
  }

  // ── Busca de fábricas ──────────────────────────────────────────────────────
  useEffect(() => {
    if (fornecedorBusca.length < 1) { setFornecedores([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('suppliers') as any)
      .select('id, name')
      .ilike('name', `%${fornecedorBusca}%`)
      .eq('active', true).limit(6)
      .then(({ data }: { data: FornecedorOpt[] }) => setFornecedores(data ?? []))
  }, [fornecedorBusca])

  function selecionarFornecedor(f: FornecedorOpt) {
    setFornecedorSel(f); setFornecedorId(f.id)
    setFornecedorBusca(''); setFornecedores([])
    setTermInfo(null)
  }

  // ── Carrega termos comerciais quando cliente + fábrica selecionados ────────
  useEffect(() => {
    if (!clienteId || !fornecedorId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('client_supplier_terms') as any)
      .select('price_table, discount_pct, commercialization')
      .eq('client_id', clienteId)
      .eq('supplier_id', fornecedorId)
      .maybeSingle()
      .then(({ data }: { data: TermInfo | null }) => {
        setTermInfo(data)
        if (data?.discount_pct != null) setDefaultDesconto(data.discount_pct)
        // Resolve price_table (texto "A", "B"...) para UUID em price_tables
        if (data?.price_table) {
          const match = tabelas.find(t => t.name.toUpperCase() === data.price_table!.toUpperCase())
          setTabelaId(match?.id ?? '')
        }
      })
  }, [clienteId, fornecedorId])

  // ── Busca de produtos (filtrada pela fábrica selecionada) ──────────────────
  useEffect(() => {
    if (produtoBusca.length < 2) { setProdutos([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('products') as any)
      .select('id, name, code, unit, product_prices(price_table_id, price)')
      .or(`name.ilike.%${produtoBusca}%,code.ilike.%${produtoBusca}%`)
      .eq('active', true).limit(8)
    if (fornecedorId) q = q.eq('supplier_id', fornecedorId)
    q.then(({ data }: { data: ProdutoOption[] }) => setProdutos(data ?? []))
  }, [produtoBusca, fornecedorId])

  function adicionarItem(p: ProdutoOption) {
    const preco = p.prices?.find(pr => pr.price_table_id === tabelaId)?.price
                ?? p.prices?.[0]?.price ?? 0
    setItens(prev => {
      const idx = prev.findIndex(i => i.product_id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx].quantity += 1; return n }
      return [...prev, {
        product_id: p.id, name: p.name, code: p.code, unit: p.unit,
        quantity: 1, unit_price: preco,
        discount_pct: defaultDesconto,  // aplica desconto do cliente automaticamente
        notes: '',
      }]
    })
    setProdutoBusca(''); setProdutos([]); setMostrarProdutos(false)
  }

  function removerItem(idx: number) { setItens(prev => prev.filter((_, i) => i !== idx)) }

  function atualizarItem(idx: number, field: keyof ItemForm, value: string | number) {
    setItens(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n })
  }

  const total = useMemo(() =>
    itens.reduce((acc, item) => acc + item.unit_price * item.quantity * (1 - item.discount_pct / 100), 0),
  [itens])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId)         { setError('Selecione um cliente'); return }
    if (!fornecedorId)      { setError('Selecione a fábrica'); return }
    if (itens.length === 0) { setError('Adicione pelo menos um produto'); return }
    setSaving(true); setError('')
    try {
      await criar(
        {
          client_id:      clienteId,
          supplier_id:    fornecedorId,
          price_table_id: tabelaId || undefined,
          purchase_order: ordemCompra || undefined,
          discount_pct:   defaultDesconto,
          valid_until:    validoAte    || undefined,
          notes:          notas        || undefined,
          subtotal: total,
          total,
        },
        itens.map(i => ({
          product_id:   i.product_id,
          quantity:     i.quantity,
          unit_price:   i.unit_price,
          discount_pct: i.discount_pct,
          total:        i.unit_price * i.quantity * (1 - i.discount_pct / 100),
          notes:        i.notes || undefined,
        }))
      )
      router.push('/orcamentos')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl w-full">

      {/* ── Cliente + Fábrica ── */}
      <section className="rounded-2xl p-5 space-y-5" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
          Cliente e Fábrica
        </p>

        {/* Cliente */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Cliente *</label>
          {clienteSel ? (
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'rgba(0,117,255,0.1)', border: '1px solid rgba(0,117,255,0.25)' }}>
              <div>
                <p className="font-semibold text-white">{clienteSel.name}</p>
                {clienteSel.company_name && (
                  <p className="text-sm mt-0.5" style={{ color: '#0075FF' }}>{clienteSel.company_name}</p>
                )}
              </div>
              <button type="button"
                onClick={() => { setClienteSel(null); setClienteId(''); setTermInfo(null); setFornecedorSel(null); setFornecedorId('') }}
                className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: '#0075FF' }}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
              <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)}
                placeholder="Buscar cliente por nome ou empresa..."
                className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
              {clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={dropdownStyle}>
                  {clientes.map(c => (
                    <button key={c.id} type="button" onClick={() => selecionarCliente(c)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,117,255,0.1)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      {c.company_name && <p className="text-xs" style={{ color: '#A0AEC0' }}>{c.company_name}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fábrica */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Fábrica *</label>
          {fornecedorSel ? (
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'rgba(159,122,234,0.1)', border: '1px solid rgba(159,122,234,0.25)' }}>
              <p className="font-semibold text-white">{fornecedorSel.name}</p>
              <button type="button"
                onClick={() => { setFornecedorSel(null); setFornecedorId(''); setTermInfo(null); setTabelaId(''); setDefaultDesconto(0) }}
                className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: '#9F7AEA' }}>
                Trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
              <input value={fornecedorBusca} onChange={e => setFornecedorBusca(e.target.value)}
                placeholder="Buscar fábrica..."
                className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
              {fornecedores.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={dropdownStyle}>
                  {fornecedores.map(f => (
                    <button key={f.id} type="button" onClick={() => selecionarFornecedor(f)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(159,122,234,0.1)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                      <p className="text-sm font-semibold text-white">{f.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Banner de termos comerciais (auto-carregado) */}
        {clienteId && fornecedorId && (
          <div className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
            style={termInfo
              ? { background: 'rgba(1,181,116,0.08)', border: '1px solid rgba(1,181,116,0.2)' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Info size={13} style={{ color: termInfo ? '#01B574' : '#56577A', flexShrink: 0 }} />
            {termInfo ? (
              <div className="flex flex-wrap gap-3 text-xs">
                {termInfo.price_table && (
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#01B574' }}>
                    <Tag size={11} /> Tabela {termInfo.price_table}
                  </span>
                )}
                {termInfo.discount_pct != null && (
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#01B574' }}>
                    <Percent size={11} /> {termInfo.discount_pct}% de desconto
                  </span>
                )}
                {termInfo.commercialization && (
                  <span style={{ color: '#A0AEC0' }}>· {termInfo.commercialization}</span>
                )}
                {!termInfo.price_table && termInfo.discount_pct == null && (
                  <span style={{ color: '#56577A' }}>Sem termos cadastrados para este cliente nesta fábrica</span>
                )}
              </div>
            ) : (
              <span className="text-xs" style={{ color: '#56577A' }}>
                Termos comerciais não cadastrados para este cliente nesta fábrica
              </span>
            )}
          </div>
        )}

        {/* Ordem de compra + Data de validade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Ordem de compra</label>
            <input value={ordemCompra} onChange={e => setOrdemCompra(e.target.value)}
              placeholder="ex: OC-2025-001"
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Válido até</label>
            <input type="date" value={validoAte} onChange={e => setValidoAte(e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
      </section>

      {/* ── Produtos ── */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Produtos</p>
            {!fornecedorId && (
              <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>Selecione a fábrica para filtrar produtos</p>
            )}
          </div>
          <button type="button" onClick={() => setMostrarProdutos(!mostrarProdutos)}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#0075FF' }}>
            <Plus size={15} /> Adicionar produto
          </button>
        </div>

        {mostrarProdutos && (
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
            <input autoFocus value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)}
              placeholder={fornecedorId ? `Buscar produto da ${fornecedorSel?.name ?? 'fábrica'}...` : 'Buscar produto...'}
              className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
            {produtos.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={dropdownStyle}>
                {produtos.map(p => {
                  const preco = p.prices?.find(pr => pr.price_table_id === tabelaId)?.price
                              ?? p.prices?.[0]?.price ?? 0
                  return (
                    <button key={p.id} type="button" onClick={() => adicionarItem(p)}
                      className="w-full text-left px-4 py-3 transition-colors flex items-center justify-between"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,117,255,0.1)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                      <div>
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs font-mono" style={{ color: '#A0AEC0' }}>{p.code}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold" style={{ color: '#2CD9FF' }}>{formatCurrency(preco)}</p>
                        {defaultDesconto > 0 && (
                          <p className="text-xs" style={{ color: '#01B574' }}>−{defaultDesconto}%</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10" style={{ color: '#56577A' }}>
            <Package size={28} className="mb-2" />
            <p className="text-sm">Nenhum produto adicionado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#56577A' }}>
              <span className="col-span-4">Produto</span>
              <span className="col-span-2 text-center">Qtd</span>
              <span className="col-span-2 text-right">R$ unit.</span>
              <span className="col-span-1 text-center">Desc%</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1" />
            </div>

            {itens.map((item, idx) => {
              const itemTotal = item.unit_price * item.quantity * (1 - item.discount_pct / 100)
              return (
                <div key={item.product_id}
                  className="rounded-xl px-3 py-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center sm:px-2 sm:py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

                  <div className="col-span-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <p className="text-xs font-mono" style={{ color: '#56577A' }}>{item.code} · {item.unit}</p>
                    </div>
                    <button type="button" onClick={() => removerItem(idx)}
                      className="sm:hidden p-1 flex-shrink-0" style={{ color: '#56577A' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex gap-2 sm:contents">
                    <div className="flex-1 sm:col-span-2">
                      <label className="sm:hidden text-xs block mb-1" style={{ color: '#56577A' }}>Qtd</label>
                      <input type="number" min="0.001" step="0.001" value={item.quantity}
                        onChange={e => atualizarItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="input-dark w-full text-center px-2 py-1.5 rounded-lg text-sm" />
                    </div>
                    <div className="flex-1 sm:col-span-2">
                      <label className="sm:hidden text-xs block mb-1" style={{ color: '#56577A' }}>R$ unit.</label>
                      <input type="number" min="0" step="0.01" value={item.unit_price}
                        onChange={e => atualizarItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="input-dark w-full text-right px-2 py-1.5 rounded-lg text-sm" />
                    </div>
                    <div className="w-16 sm:col-span-1">
                      <label className="sm:hidden text-xs block mb-1" style={{ color: '#56577A' }}>Desc%</label>
                      <input type="number" min="0" max="100" step="0.5" value={item.discount_pct}
                        onChange={e => atualizarItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                        className="input-dark w-full text-center px-2 py-1.5 rounded-lg text-sm" />
                    </div>
                    <div className="flex-1 sm:col-span-2 text-right self-end">
                      <p className="text-sm font-semibold" style={{ color: '#2CD9FF' }}>{formatCurrency(itemTotal)}</p>
                    </div>
                  </div>

                  <div className="hidden sm:block col-span-1 text-right">
                    <button type="button" onClick={() => removerItem(idx)} className="p-1"
                      style={{ color: '#56577A' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {itens.length > 0 && (
          <div className="pt-4 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between font-black text-base"
              style={{ color: '#2CD9FF' }}>
              <span className="text-white">Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {defaultDesconto > 0 && (
              <p className="text-xs mt-1 text-right" style={{ color: '#01B574' }}>
                Desconto de {defaultDesconto}% aplicado por item
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Observações ── */}
      <section className="rounded-2xl p-5" style={glass}>
        <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Observações</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
          placeholder="Condições de pagamento, prazo de entrega, observações..."
          className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
      </section>

      {error && (
        <p className="text-sm px-4 py-3 rounded-xl"
          style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => router.push('/orcamentos')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
          {saving ? 'Salvando…' : 'Criar orçamento'}
        </button>
      </div>
    </form>
  )
}
