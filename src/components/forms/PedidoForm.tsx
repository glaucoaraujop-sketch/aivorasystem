'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, Package, Truck } from 'lucide-react'
import { usePedidosMutations, type ItemPedido } from '@/hooks/usePedidos'
import { useFornecedores, calcularEntrega } from '@/hooks/useFornecedores'
import { useTabelasPreco } from '@/hooks/useProdutos'
import { useVariacoes, calcularPrecoComVariacoes, type VariationOption } from '@/hooks/useVariacoes'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ClienteOption { id: string; name: string; company_name: string | null; price_table_id: string | null }
interface ProdutoOption  { id: string; name: string; code: string; unit: string; supplier_id: string | null; prices: { price_table_id: string; price: number }[] }

const glass = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const dropdownStyle = { background: 'rgba(6,11,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }

function VariacaoSelector({
  productId, tabelaId, precoBase, onChange,
}: {
  productId: string; tabelaId: string; precoBase: number
  onChange: (selecoes: Record<string, VariationOption | null>, precoFinal: number) => void
}) {
  const { variationTypes, loading } = useVariacoes(productId)
  const [selecoes, setSelecoes] = useState<Record<string, VariationOption | null>>({})

  useEffect(() => {
    onChange(selecoes, calcularPrecoComVariacoes(precoBase, selecoes))
  }, [selecoes, precoBase])

  if (loading) return <p className="text-xs mt-1" style={{ color: '#56577A' }}>Carregando variações...</p>
  if (variationTypes.length === 0) return null

  return (
    <div className="mt-3 space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {variationTypes.map(tipo => (
        <div key={tipo.id} className="flex items-center gap-2">
          <span className="text-xs w-20 flex-shrink-0 font-medium" style={{ color: '#56577A' }}>{tipo.name}</span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {tipo.options.map(opt => {
              const sel = selecoes[tipo.id]?.id === opt.id
              return (
                <button key={opt.id} type="button"
                  onClick={() => setSelecoes(prev => ({ ...prev, [tipo.id]: sel ? null : opt }))}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={sel
                    ? { background: 'rgba(0,117,255,0.2)', color: '#0075FF', border: '1px solid rgba(0,117,255,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {opt.name}
                  {opt.price_add !== 0 && (
                    <span className="ml-1 opacity-75">
                      {opt.price_add > 0 ? '+' : ''}{formatCurrency(opt.price_add)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PedidoForm() {
  const router = useRouter()
  const { criar } = usePedidosMutations()
  const { fornecedores } = useFornecedores()
  const tabelas = useTabelasPreco()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [finalidade, setFinalidade] = useState<'mostruario' | 'venda' | ''>('')

  const [clienteId, setClienteId]       = useState('')
  const [clienteSel, setClienteSel]     = useState<ClienteOption | null>(null)
  const [clienteBusca, setClienteBusca] = useState('')
  const [clientes, setClientes]         = useState<ClienteOption[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [tabelaId, setTabelaId]         = useState('')
  const [desconto, setDesconto]         = useState('0')
  const [comissaoPct, setComissaoPct]   = useState('')
  const [pagamento, setPagamento]       = useState('')
  const [notas, setNotas]               = useState('')

  const [produtoBusca, setProdutoBusca] = useState('')
  const [produtos, setProdutos]         = useState<ProdutoOption[]>([])
  const [mostrarBusca, setMostrarBusca] = useState(false)
  const [itens, setItens]               = useState<ItemPedido[]>([])

  const fornecedorSel = fornecedores.find(f => f.id === fornecedorId)
  const previsaoEntrega = fornecedorSel ? calcularEntrega(fornecedorSel.lead_time_days) : null

  useEffect(() => {
    if (clienteBusca.length < 2) { setClientes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name, price_table_id')
      .or(`name.ilike.%${clienteBusca}%,company_name.ilike.%${clienteBusca}%`)
      .eq('active', true).limit(6)
      .then(({ data }: { data: ClienteOption[] }) => setClientes(data ?? []))
  }, [clienteBusca])

  function selecionarCliente(c: ClienteOption) {
    setClienteSel(c); setClienteId(c.id)
    setClienteBusca(''); setClientes([])
    if (c.price_table_id) setTabelaId(c.price_table_id)
  }

  useEffect(() => {
    if (produtoBusca.length < 2) { setProdutos([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('products') as any)
      .select('id, name, code, unit, supplier_id, product_prices(price_table_id, price)')
      .or(`name.ilike.%${produtoBusca}%,code.ilike.%${produtoBusca}%`)
      .eq('active', true).limit(8)
      .then(({ data }: { data: ProdutoOption[] }) => setProdutos(data ?? []))
  }, [produtoBusca])

  function adicionarItem(p: ProdutoOption) {
    const preco = p.prices?.find(pr => pr.price_table_id === tabelaId)?.price ?? p.prices?.[0]?.price ?? 0
    if (p.supplier_id && !fornecedorId) setFornecedorId(p.supplier_id)
    setItens(prev => {
      if (prev.find(i => i.product_id === p.id)) {
        return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product_id: p.id, name: p.name, code: p.code, unit: p.unit, quantity: 1, unit_price: preco, unit_price_final: preco, discount_pct: 0, notes: '', variacoes: {} }]
    })
    setProdutoBusca(''); setProdutos([]); setMostrarBusca(false)
  }

  function removerItem(idx: number) { setItens(prev => prev.filter((_, i) => i !== idx)) }

  function atualizarItem(idx: number, field: keyof ItemPedido, value: unknown) {
    setItens(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n })
  }

  function onVariacaoChange(idx: number, selecoes: Record<string, VariationOption | null>, precoFinal: number) {
    setItens(prev => { const n = [...prev]; n[idx] = { ...n[idx], variacoes: selecoes, unit_price_final: precoFinal }; return n })
  }

  const { subtotal, total, comissaoValor } = useMemo(() => {
    const subtotal = itens.reduce((acc, item) => acc + item.unit_price_final * item.quantity * (1 - item.discount_pct / 100), 0)
    const total = subtotal * (1 - parseFloat(desconto || '0') / 100)
    const comissaoValor = comissaoPct ? total * (parseFloat(comissaoPct) / 100) : 0
    return { subtotal, total, comissaoValor }
  }, [itens, desconto, comissaoPct])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId)         { setError('Selecione um cliente'); return }
    if (!fornecedorId)      { setError('Selecione um fornecedor'); return }
    if (!finalidade)        { setError('Selecione a finalidade do pedido'); return }
    if (itens.length === 0) { setError('Adicione pelo menos um produto'); return }
    setSaving(true); setError('')
    try {
      await criar({
        client_id:        clienteId,
        supplier_id:      fornecedorId,
        finalidade:       finalidade as 'mostruario' | 'venda',
        discount_pct:     parseFloat(desconto || '0'),
        subtotal, total,
        commission_pct:   comissaoPct ? parseFloat(comissaoPct) : undefined,
        commission_value: comissaoValor || undefined,
        payment_terms:    pagamento || undefined,
        delivery_date:    previsaoEntrega?.toISOString().split('T')[0],
        notes:            notas || undefined,
      }, itens)
      router.push('/pedidos')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl w-full">

      {/* Cliente */}
      <section className="rounded-2xl p-5 space-y-3" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Cliente</p>
        {clienteSel ? (
          <div className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'rgba(0,117,255,0.1)', border: '1px solid rgba(0,117,255,0.25)' }}>
            <div>
              <p className="font-semibold text-white">{clienteSel.name}</p>
              {clienteSel.company_name && <p className="text-sm mt-0.5" style={{ color: '#0075FF' }}>{clienteSel.company_name}</p>}
            </div>
            <button type="button" onClick={() => { setClienteSel(null); setClienteId('') }}
              className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: '#0075FF' }}>
              Trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
            <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)}
              placeholder="Buscar cliente..." className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
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
      </section>

      {/* Finalidade */}
      <section className="rounded-2xl p-5 space-y-3" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Finalidade do Pedido</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'venda', emoji: '📦', label: 'Venda / Estoque', desc: 'Produtos destinados à venda ou reposição de estoque do cliente', activeColor: '#0075FF', activeBg: 'rgba(0,117,255,0.12)', activeBorder: 'rgba(0,117,255,0.4)' },
            { value: 'mostruario', emoji: '🏪', label: 'Mostruário', desc: 'Produtos para exposição e demonstração na loja do cliente', activeColor: '#9F7AEA', activeBg: 'rgba(159,122,234,0.12)', activeBorder: 'rgba(159,122,234,0.4)' },
          ] as const).map(opt => {
            const sel = finalidade === opt.value
            return (
              <button key={opt.value} type="button" onClick={() => setFinalidade(opt.value)}
                className="flex items-start gap-3 p-4 rounded-xl text-left transition-all"
                style={sel
                  ? { background: opt.activeBg, border: `2px solid ${opt.activeBorder}` }
                  : { background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl mt-0.5">{opt.emoji}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: sel ? opt.activeColor : '#ffffff' }}>{opt.label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#56577A' }}>{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Fornecedor + Entrega */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Fornecedor e Entrega</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Fornecedor *</label>
            <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">Selecionar...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.name} — {f.lead_time_days} dias</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl px-4 py-3 flex flex-col justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {previsaoEntrega ? (
              <>
                <p className="text-xs mb-0.5 flex items-center gap-1" style={{ color: '#56577A' }}>
                  <Truck size={11} /> Previsão de entrega
                </p>
                <p className="text-lg font-bold text-white">{formatDate(previsaoEntrega)}</p>
                <p className="text-xs" style={{ color: '#56577A' }}>{fornecedorSel?.lead_time_days} dias após confirmação</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: '#56577A' }}>Selecione o fornecedor para ver a previsão</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Tabela de Preço</label>
            <select value={tabelaId} onChange={e => setTabelaId(e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">Padrão</option>
              {tabelas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Desconto geral (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={desconto}
              onChange={e => setDesconto(e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Minha comissão (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={comissaoPct}
              onChange={e => setComissaoPct(e.target.value)} placeholder="ex: 5"
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Produtos</p>
          <button type="button" onClick={() => setMostrarBusca(!mostrarBusca)}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#0075FF' }}>
            <Plus size={15} /> Adicionar produto
          </button>
        </div>

        {mostrarBusca && (
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
            <input autoFocus value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)}
              placeholder="Buscar produto por nome ou código..."
              className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
            {produtos.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={dropdownStyle}>
                {produtos.map(p => (
                  <button key={p.id} type="button" onClick={() => adicionarItem(p)}
                    className="w-full text-left px-4 py-3 transition-colors flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,117,255,0.1)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-xs font-mono" style={{ color: '#A0AEC0' }}>{p.code}</p>
                    </div>
                    {p.prices?.length > 0 && (
                      <p className="text-sm font-semibold" style={{ color: '#2CD9FF' }}>
                        {formatCurrency(p.prices.find(pr => pr.price_table_id === tabelaId)?.price ?? p.prices[0]?.price ?? 0)}
                      </p>
                    )}
                  </button>
                ))}
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
          <div className="space-y-3">
            {itens.map((item, idx) => (
              <div key={item.product_id} className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Mobile layout */}
                <div className="flex items-start justify-between gap-2 mb-3 sm:hidden">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs font-mono" style={{ color: '#56577A' }}>{item.code} · {item.unit}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>Base: {formatCurrency(item.unit_price)}</p>
                  </div>
                  <button type="button" onClick={() => removerItem(idx)}
                    className="p-1 transition-colors flex-shrink-0"
                    style={{ color: '#56577A' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex gap-2 sm:hidden">
                  {[
                    { label: 'Qtd', field: 'quantity' as const, type: 'number', step: '0.001', min: '0.001' },
                    { label: 'Desc%', field: 'discount_pct' as const, type: 'number', step: '0.5', min: '0', max: '100' },
                  ].map(f => (
                    <div key={f.field} className="flex-1">
                      <label className="text-xs block mb-1" style={{ color: '#56577A' }}>{f.label}</label>
                      <input type={f.type} step={f.step} min={f.min} max={f.max}
                        value={f.field === 'quantity' ? item.quantity : item.discount_pct}
                        onChange={e => atualizarItem(idx, f.field, parseFloat(e.target.value) || 0)}
                        className="input-dark w-full text-center px-2 py-1.5 rounded-lg text-sm" />
                    </div>
                  ))}
                  <div className="flex-1 text-right">
                    <label className="text-xs block mb-1" style={{ color: '#56577A' }}>Total</label>
                    <p className="text-sm font-bold" style={{ color: '#2CD9FF' }}>
                      {formatCurrency(item.unit_price_final * item.quantity * (1 - item.discount_pct / 100))}
                    </p>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-4">
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-xs font-mono" style={{ color: '#56577A' }}>{item.code} · {item.unit}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>Base: {formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs block mb-1" style={{ color: '#56577A' }}>Quantidade</label>
                    <input type="number" min="0.001" step="0.001" value={item.quantity}
                      onChange={e => atualizarItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="input-dark w-full text-center px-2 py-1.5 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs block mb-1" style={{ color: '#56577A' }}>Desc%</label>
                    <input type="number" min="0" max="100" step="0.5" value={item.discount_pct}
                      onChange={e => atualizarItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                      className="input-dark w-full text-center px-2 py-1.5 rounded-lg text-sm" />
                  </div>
                  <div className="col-span-3 text-right">
                    <label className="text-xs block mb-1" style={{ color: '#56577A' }}>Total do item</label>
                    <p className="text-base font-bold" style={{ color: '#2CD9FF' }}>
                      {formatCurrency(item.unit_price_final * item.quantity * (1 - item.discount_pct / 100))}
                    </p>
                    {item.unit_price_final !== item.unit_price && (
                      <p className="text-xs" style={{ color: '#56577A' }}>
                        {formatCurrency(item.unit_price_final)}/{item.unit} c/ variações
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 text-right pt-5">
                    <button type="button" onClick={() => removerItem(idx)} className="p-1 transition-colors"
                      style={{ color: '#56577A' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#56577A')}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <VariacaoSelector
                  productId={item.product_id} tabelaId={tabelaId} precoBase={item.unit_price}
                  onChange={(sel, precoFinal) => onVariacaoChange(idx, sel, precoFinal)}
                />
              </div>
            ))}
          </div>
        )}

        {itens.length > 0 && (
          <div className="space-y-2 pt-4 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between" style={{ color: '#A0AEC0' }}>
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {parseFloat(desconto || '0') > 0 && (
              <div className="flex justify-between" style={{ color: '#FC8181' }}>
                <span>Desconto ({desconto}%)</span>
                <span>- {formatCurrency(subtotal - total)}</span>
              </div>
            )}
            {comissaoValor > 0 && (
              <div className="flex justify-between" style={{ color: '#01B574' }}>
                <span>Sua comissão ({comissaoPct}%)</span>
                <span>{formatCurrency(comissaoValor)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#2CD9FF' }}>
              <span className="text-white">Total do Pedido</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Condições */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Condições</p>
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Condição de pagamento</label>
          <input value={pagamento} onChange={e => setPagamento(e.target.value)}
            placeholder="ex: 30/60/90 dias, à vista com 5% de desconto..."
            className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Observações</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
        </div>
      </section>

      {error && (
        <p className="text-sm px-4 py-3 rounded-xl"
          style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => router.push('/pedidos')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
          {saving ? 'Salvando…' : 'Criar pedido'}
        </button>
      </div>
    </form>
  )
}
