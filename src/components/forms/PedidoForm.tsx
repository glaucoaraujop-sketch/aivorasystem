'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, Package, ChevronDown, Truck } from 'lucide-react'
import { usePedidosMutations, type ItemPedido } from '@/hooks/usePedidos'
import { useFornecedores, calcularEntrega } from '@/hooks/useFornecedores'
import { useTabelasPreco } from '@/hooks/useProdutos'
import { useVariacoes, calcularPrecoComVariacoes, type VariationOption } from '@/hooks/useVariacoes'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'

interface ClienteOption { id: string; name: string; company_name: string | null; price_table_id: string | null }
interface ProdutoOption  { id: string; name: string; code: string; unit: string; supplier_id: string | null; prices: { price_table_id: string; price: number }[] }

// Sub-componente: seletor de variações de um item
function VariacaoSelector({
  productId, tabelaId, precoBase,
  onChange,
}: {
  productId: string
  tabelaId: string
  precoBase: number
  onChange: (selecoes: Record<string, VariationOption | null>, precoFinal: number) => void
}) {
  const { variationTypes, loading } = useVariacoes(productId)
  const [selecoes, setSelecoes] = useState<Record<string, VariationOption | null>>({})

  useEffect(() => {
    const precoFinal = calcularPrecoComVariacoes(precoBase, selecoes)
    onChange(selecoes, precoFinal)
  }, [selecoes, precoBase])

  if (loading) return <p className="text-xs text-gray-400 mt-1">Carregando variações...</p>
  if (variationTypes.length === 0) return null

  return (
    <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
      {variationTypes.map(tipo => (
        <div key={tipo.id} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20 flex-shrink-0 font-medium">{tipo.name}</span>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {tipo.options.map(opt => {
              const selecionado = selecoes[tipo.id]?.id === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelecoes(prev => ({
                    ...prev,
                    [tipo.id]: selecionado ? null : opt
                  }))}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                    selecionado
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
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

  // Finalidade
  const [finalidade, setFinalidade] = useState<'mostruario' | 'venda' | ''>('')

  // Cabeçalho
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

  // Produtos
  const [produtoBusca, setProdutoBusca]     = useState('')
  const [produtos, setProdutos]             = useState<ProdutoOption[]>([])
  const [mostrarBusca, setMostrarBusca]     = useState(false)
  const [itens, setItens]                   = useState<ItemPedido[]>([])

  // Previsão de entrega
  const fornecedorSel = fornecedores.find(f => f.id === fornecedorId)
  const previsaoEntrega = fornecedorSel ? calcularEntrega(fornecedorSel.lead_time_days) : null

  // Busca clientes
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

  // Ao selecionar fornecedor, sugere o mesmo no filtro de produto
  function selecionarFornecedor(id: string) {
    setFornecedorId(id)
  }

  // Busca produtos
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
    const preco = p.prices?.find(pr => pr.price_table_id === tabelaId)?.price
      ?? p.prices?.[0]?.price ?? 0

    // Se produto tem fornecedor e ainda não foi selecionado, sugerir
    if (p.supplier_id && !fornecedorId) setFornecedorId(p.supplier_id)

    setItens(prev => {
      if (prev.find(i => i.product_id === p.id)) {
        return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        product_id: p.id, name: p.name, code: p.code, unit: p.unit,
        quantity: 1, unit_price: preco, unit_price_final: preco,
        discount_pct: 0, notes: '', variacoes: {},
      }]
    })
    setProdutoBusca(''); setProdutos([]); setMostrarBusca(false)
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function atualizarItem(idx: number, field: keyof ItemPedido, value: unknown) {
    setItens(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n })
  }

  function onVariacaoChange(idx: number, selecoes: Record<string, VariationOption | null>, precoFinal: number) {
    setItens(prev => {
      const n = [...prev]
      n[idx] = { ...n[idx], variacoes: selecoes, unit_price_final: precoFinal }
      return n
    })
  }

  // Totais
  const { subtotal, total, comissaoValor } = useMemo(() => {
    const subtotal = itens.reduce((acc, item) => acc + item.unit_price_final * item.quantity * (1 - item.discount_pct / 100), 0)
    const total = subtotal * (1 - parseFloat(desconto || '0') / 100)
    const comissaoValor = comissaoPct ? total * (parseFloat(comissaoPct) / 100) : 0
    return { subtotal, total, comissaoValor }
  }, [itens, desconto, comissaoPct])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId)      { setError('Selecione um cliente'); return }
    if (!fornecedorId)   { setError('Selecione um fornecedor'); return }
    if (itens.length === 0) { setError('Adicione pelo menos um produto'); return }

    if (!finalidade)      { setError('Selecione a finalidade do pedido'); return }
    setSaving(true); setError('')
    try {
      await criar({
        client_id:       clienteId,
        supplier_id:     fornecedorId,
        finalidade:      finalidade as 'mostruario' | 'venda',
        discount_pct:    parseFloat(desconto || '0'),
        subtotal,
        total,
        commission_pct:  comissaoPct ? parseFloat(comissaoPct) : undefined,
        commission_value: comissaoValor || undefined,
        payment_terms:   pagamento || undefined,
        delivery_date:   previsaoEntrega?.toISOString().split('T')[0],
        notes:           notas || undefined,
      }, itens)
      router.push('/pedidos')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl w-full">

      {/* Cliente */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Cliente</h2>
        {clienteSel ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div>
              <p className="font-medium text-blue-900">{clienteSel.name}</p>
              {clienteSel.company_name && <p className="text-sm text-blue-600">{clienteSel.company_name}</p>}
            </div>
            <button type="button" onClick={() => { setClienteSel(null); setClienteId('') }}
              className="text-sm text-blue-500 hover:text-blue-700">Trocar</button>
          </div>
        ) : (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)}
              placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {clientes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {clientes.map(c => (
                  <button key={c.id} type="button" onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    {c.company_name && <p className="text-xs text-gray-500">{c.company_name}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Finalidade */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Finalidade do Pedido</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFinalidade('venda')}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              finalidade === 'venda'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl mt-0.5">📦</span>
            <div>
              <p className={`font-semibold text-sm ${finalidade === 'venda' ? 'text-blue-700' : 'text-gray-900'}`}>
                Venda / Estoque
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Produtos destinados à venda ou reposição de estoque do cliente
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFinalidade('mostruario')}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              finalidade === 'mostruario'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl mt-0.5">🏪</span>
            <div>
              <p className={`font-semibold text-sm ${finalidade === 'mostruario' ? 'text-purple-700' : 'text-gray-900'}`}>
                Mostruário
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Produtos para exposição e demonstração na loja do cliente
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Fornecedor + Prazo */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Fornecedor e Entrega</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
            <select value={fornecedorId} onChange={e => selecionarFornecedor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Selecionar...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.name} — {f.lead_time_days} dias</option>
              ))}
            </select>
          </div>

          {/* Previsão automática */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 flex flex-col justify-center">
            {previsaoEntrega ? (
              <>
                <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Truck size={11} /> Previsão de entrega</p>
                <p className="text-lg font-bold text-gray-900">{formatDate(previsaoEntrega)}</p>
                <p className="text-xs text-gray-400">{fornecedorSel?.lead_time_days} dias após confirmação</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Selecione o fornecedor para ver a previsão</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tabela de Preço</label>
            <select value={tabelaId} onChange={e => setTabelaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Padrão</option>
              {tabelas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desconto geral (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={desconto}
              onChange={e => setDesconto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minha comissão (%)</label>
            <input type="number" min="0" max="100" step="0.5" value={comissaoPct}
              onChange={e => setComissaoPct(e.target.value)} placeholder="ex: 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </section>

      {/* Produtos com variações */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Produtos</h2>
          <button type="button" onClick={() => setMostrarBusca(!mostrarBusca)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus size={15} /> Adicionar produto
          </button>
        </div>

        {mostrarBusca && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)}
              placeholder="Buscar produto por nome ou código..."
              className="w-full pl-9 pr-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {produtos.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {produtos.map(p => (
                  <button key={p.id} type="button" onClick={() => adicionarItem(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                    </div>
                    {p.prices?.length > 0 && (
                      <p className="text-sm font-semibold text-blue-600">
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
          <div className="text-center py-8 text-gray-400">
            <Package size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum produto adicionado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {itens.map((item, idx) => (
              <div key={item.product_id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                {/* Linha do produto — mobile: 2 rows; desktop: single 12-col row */}
                <div className="flex items-start justify-between gap-2 mb-2 sm:hidden">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.code} · {item.unit}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Base: {formatCurrency(item.unit_price)}</p>
                  </div>
                  <button type="button" onClick={() => removerItem(idx)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex gap-2 sm:hidden">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">Qtd</label>
                    <input type="number" min="0.001" step="0.001" value={item.quantity}
                      onChange={e => atualizarItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-center px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1">Desc%</label>
                    <input type="number" min="0" max="100" step="0.5" value={item.discount_pct}
                      onChange={e => atualizarItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                      className="w-full text-center px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <label className="text-xs text-gray-400 block mb-1">Total</label>
                    <p className="text-sm font-bold text-blue-600">
                      {formatCurrency(item.unit_price_final * item.quantity * (1 - item.discount_pct / 100))}
                    </p>
                  </div>
                </div>
                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.code} · {item.unit}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Base: {formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Quantidade</label>
                    <input type="number" min="0.001" step="0.001" value={item.quantity}
                      onChange={e => atualizarItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-center px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Desc%</label>
                    <input type="number" min="0" max="100" step="0.5" value={item.discount_pct}
                      onChange={e => atualizarItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                      className="w-full text-center px-2 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-3 text-right">
                    <label className="text-xs text-gray-400 block mb-1">Total do item</label>
                    <p className="text-base font-bold text-blue-600">
                      {formatCurrency(item.unit_price_final * item.quantity * (1 - item.discount_pct / 100))}
                    </p>
                    {item.unit_price_final !== item.unit_price && (
                      <p className="text-xs text-gray-400">
                        {formatCurrency(item.unit_price_final)}/{item.unit} c/ variações
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 text-right pt-5">
                    <button type="button" onClick={() => removerItem(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Variações */}
                <VariacaoSelector
                  productId={item.product_id}
                  tabelaId={tabelaId}
                  precoBase={item.unit_price}
                  onChange={(sel, precoFinal) => onVariacaoChange(idx, sel, precoFinal)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Totais */}
        {itens.length > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {parseFloat(desconto || '0') > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Desconto ({desconto}%)</span>
                <span>- {formatCurrency(subtotal - total)}</span>
              </div>
            )}
            {comissaoValor > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Sua comissão ({comissaoPct}%)</span>
                <span>{formatCurrency(comissaoValor)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total do Pedido</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Pagamento e Observações */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Condições</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condição de pagamento</label>
          <input value={pagamento} onChange={e => setPagamento(e.target.value)}
            placeholder="ex: 30/60/90 dias, à vista com 5% de desconto..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push('/pedidos')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Criar pedido'}
        </button>
      </div>
    </form>
  )
}
