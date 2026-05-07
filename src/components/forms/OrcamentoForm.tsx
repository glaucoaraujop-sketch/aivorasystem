'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, Package } from 'lucide-react'
import { useOrcamentosMutations } from '@/hooks/useOrcamentos'
import { useTabelasPreco } from '@/hooks/useProdutos'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface ItemForm {
  product_id: string
  name: string
  code: string
  unit: string
  quantity: number
  unit_price: number
  discount_pct: number
  notes: string
}

interface ClienteOption { id: string; name: string; company_name: string | null; price_table_id: string | null }
interface ProdutoOption { id: string; name: string; code: string; unit: string; prices: { price_table_id: string; price: number }[] }

export function OrcamentoForm() {
  const router = useRouter()
  const { criar } = useOrcamentosMutations()
  const tabelas = useTabelasPreco()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Cabeçalho
  const [clienteId, setClienteId] = useState('')
  const [tabelaId, setTabelaId] = useState('')
  const [desconto, setDesconto] = useState('0')
  const [validoAte, setValidoAte] = useState('')
  const [notas, setNotas] = useState('')

  // Busca de clientes
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteOption | null>(null)

  // Busca de produtos
  const [produtos, setProdutos] = useState<ProdutoOption[]>([])
  const [produtoBusca, setProdutoBusca] = useState('')
  const [mostrarProdutos, setMostrarProdutos] = useState(false)

  // Itens do orçamento
  const [itens, setItens] = useState<ItemForm[]>([])

  // Buscar clientes
  useEffect(() => {
    if (clienteBusca.length < 2) { setClientes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name, price_table_id')
      .or(`name.ilike.%${clienteBusca}%,company_name.ilike.%${clienteBusca}%`)
      .eq('active', true).limit(6)
      .then(({ data }: { data: ClienteOption[] }) => setClientes(data ?? []))
  }, [clienteBusca])

  // Ao selecionar cliente, preencher tabela de preço
  function selecionarCliente(c: ClienteOption) {
    setClienteSelecionado(c)
    setClienteId(c.id)
    setClienteBusca('')
    setClientes([])
    if (c.price_table_id) setTabelaId(c.price_table_id)
  }

  // Buscar produtos
  useEffect(() => {
    if (produtoBusca.length < 2) { setProdutos([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('products') as any)
      .select('id, name, code, unit, product_prices(price_table_id, price)')
      .or(`name.ilike.%${produtoBusca}%,code.ilike.%${produtoBusca}%`)
      .eq('active', true).limit(8)
      .then(({ data }: { data: ProdutoOption[] }) => setProdutos(data ?? []))
  }, [produtoBusca])

  function adicionarItem(p: ProdutoOption) {
    const preco = p.prices?.find(pr => pr.price_table_id === tabelaId)?.price
      ?? p.prices?.[0]?.price ?? 0

    setItens(prev => {
      const existe = prev.findIndex(i => i.product_id === p.id)
      if (existe >= 0) {
        const novo = [...prev]
        novo[existe].quantity += 1
        return novo
      }
      return [...prev, { product_id: p.id, name: p.name, code: p.code, unit: p.unit, quantity: 1, unit_price: preco, discount_pct: 0, notes: '' }]
    })
    setProdutoBusca('')
    setProdutos([])
    setMostrarProdutos(false)
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function atualizarItem(idx: number, field: keyof ItemForm, value: string | number) {
    setItens(prev => {
      const novo = [...prev]
      novo[idx] = { ...novo[idx], [field]: value }
      return novo
    })
  }

  // Totais
  const { subtotal, totalComDesconto } = useMemo(() => {
    const subtotal = itens.reduce((acc, item) => {
      const itemTotal = item.unit_price * item.quantity * (1 - item.discount_pct / 100)
      return acc + itemTotal
    }, 0)
    const totalComDesconto = subtotal * (1 - parseFloat(desconto || '0') / 100)
    return { subtotal, totalComDesconto }
  }, [itens, desconto])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setError('Selecione um cliente'); return }
    if (itens.length === 0) { setError('Adicione pelo menos um produto'); return }

    setSaving(true)
    setError('')
    try {
      await criar(
        {
          client_id: clienteId,
          price_table_id: tabelaId || undefined,
          discount_pct: parseFloat(desconto || '0'),
          valid_until: validoAte || undefined,
          notes: notas || undefined,
          subtotal,
          total: totalComDesconto,
        },
        itens.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_pct: i.discount_pct,
          total: i.unit_price * i.quantity * (1 - i.discount_pct / 100),
          notes: i.notes || undefined,
        }))
      )
      router.push('/orcamentos')
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

        {clienteSelecionado ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div>
              <p className="font-medium text-blue-900">{clienteSelecionado.name}</p>
              {clienteSelecionado.company_name && <p className="text-sm text-blue-600">{clienteSelecionado.company_name}</p>}
            </div>
            <button type="button" onClick={() => { setClienteSelecionado(null); setClienteId(''); setTabelaId('') }}
              className="text-sm text-blue-500 hover:text-blue-700">Trocar</button>
          </div>
        ) : (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={clienteBusca}
              onChange={e => setClienteBusca(e.target.value)}
              placeholder="Buscar cliente por nome ou empresa..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            <input type="number" min="0" max="100" step="0.5"
              value={desconto} onChange={e => setDesconto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label>
            <input type="date" value={validoAte} onChange={e => setValidoAte(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Produtos</h2>
          <button type="button" onClick={() => setMostrarProdutos(!mostrarProdutos)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus size={15} />
            Adicionar produto
          </button>
        </div>

        {/* Busca de produto */}
        {mostrarProdutos && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus
              value={produtoBusca}
              onChange={e => setProdutoBusca(e.target.value)}
              placeholder="Buscar produto por nome ou código..."
              className="w-full pl-9 pr-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

        {/* Lista de itens */}
        {itens.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">Nenhum produto adicionado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-2">
              <span className="col-span-4">Produto</span>
              <span className="col-span-2 text-center">Qtd</span>
              <span className="col-span-2 text-right">Preço unit.</span>
              <span className="col-span-1 text-center">Desc%</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1" />
            </div>

            {itens.map((item, idx) => {
              const itemTotal = item.unit_price * item.quantity * (1 - item.discount_pct / 100)
              return (
                <div key={item.product_id} className="bg-gray-50 rounded-lg px-3 py-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center sm:px-2 sm:py-2">
                  {/* Mobile: name + trash */}
                  <div className="col-span-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.code} · {item.unit}</p>
                    </div>
                    <button type="button" onClick={() => removerItem(idx)}
                      className="sm:hidden p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {/* Mobile: inputs row */}
                  <div className="flex gap-2 sm:contents">
                    <div className="flex-1 sm:col-span-2">
                      <label className="sm:hidden text-xs text-gray-400 block mb-1">Qtd</label>
                      <input type="number" min="0.001" step="0.001"
                        value={item.quantity}
                        onChange={e => atualizarItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full text-center px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1 sm:col-span-2">
                      <label className="sm:hidden text-xs text-gray-400 block mb-1">R$ unit.</label>
                      <input type="number" min="0" step="0.01"
                        value={item.unit_price}
                        onChange={e => atualizarItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full text-right px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="w-16 sm:col-span-1">
                      <label className="sm:hidden text-xs text-gray-400 block mb-1">Desc%</label>
                      <input type="number" min="0" max="100" step="0.5"
                        value={item.discount_pct}
                        onChange={e => atualizarItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)}
                        className="w-full text-center px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="flex-1 sm:col-span-2 text-right self-end">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(itemTotal)}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block col-span-1 text-right">
                    <button type="button" onClick={() => removerItem(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Totais */}
        {itens.length > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {parseFloat(desconto || '0') > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Desconto ({desconto}%)</span>
                <span>- {formatCurrency(subtotal - totalComDesconto)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(totalComDesconto)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Observações */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
          placeholder="Condições de pagamento, prazo de entrega, observações..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push('/orcamentos')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Criar orçamento'}
        </button>
      </div>
    </form>
  )
}
