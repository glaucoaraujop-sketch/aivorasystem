'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Trash2, Package } from 'lucide-react'
import { useOrcamentosMutations } from '@/hooks/useOrcamentos'
import { useTabelasPreco } from '@/hooks/useProdutos'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface ItemForm {
  product_id: string; name: string; code: string; unit: string
  quantity: number; unit_price: number; discount_pct: number; notes: string
}
interface ClienteOption { id: string; name: string; company_name: string | null; price_table_id: string | null }
interface ProdutoOption { id: string; name: string; code: string; unit: string; prices: { price_table_id: string; price: number }[] }

const glass = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}
const dropdownStyle = { background: 'rgba(6,11,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }

export function OrcamentoForm() {
  const router = useRouter()
  const { criar } = useOrcamentosMutations()
  const tabelas = useTabelasPreco()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [clienteId, setClienteId]               = useState('')
  const [tabelaId, setTabelaId]                 = useState('')
  const [desconto, setDesconto]                 = useState('0')
  const [validoAte, setValidoAte]               = useState('')
  const [notas, setNotas]                       = useState('')
  const [clientes, setClientes]                 = useState<ClienteOption[]>([])
  const [clienteBusca, setClienteBusca]         = useState('')
  const [clienteSel, setClienteSel]             = useState<ClienteOption | null>(null)
  const [produtos, setProdutos]                 = useState<ProdutoOption[]>([])
  const [produtoBusca, setProdutoBusca]         = useState('')
  const [mostrarProdutos, setMostrarProdutos]   = useState(false)
  const [itens, setItens]                       = useState<ItemForm[]>([])

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
      .select('id, name, code, unit, product_prices(price_table_id, price)')
      .or(`name.ilike.%${produtoBusca}%,code.ilike.%${produtoBusca}%`)
      .eq('active', true).limit(8)
      .then(({ data }: { data: ProdutoOption[] }) => setProdutos(data ?? []))
  }, [produtoBusca])

  function adicionarItem(p: ProdutoOption) {
    const preco = p.prices?.find(pr => pr.price_table_id === tabelaId)?.price ?? p.prices?.[0]?.price ?? 0
    setItens(prev => {
      const idx = prev.findIndex(i => i.product_id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx].quantity += 1; return n }
      return [...prev, { product_id: p.id, name: p.name, code: p.code, unit: p.unit, quantity: 1, unit_price: preco, discount_pct: 0, notes: '' }]
    })
    setProdutoBusca(''); setProdutos([]); setMostrarProdutos(false)
  }

  function removerItem(idx: number) { setItens(prev => prev.filter((_, i) => i !== idx)) }

  function atualizarItem(idx: number, field: keyof ItemForm, value: string | number) {
    setItens(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n })
  }

  const { subtotal, totalComDesconto } = useMemo(() => {
    const subtotal = itens.reduce((acc, item) => acc + item.unit_price * item.quantity * (1 - item.discount_pct / 100), 0)
    return { subtotal, totalComDesconto: subtotal * (1 - parseFloat(desconto || '0') / 100) }
  }, [itens, desconto])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId)         { setError('Selecione um cliente'); return }
    if (itens.length === 0) { setError('Adicione pelo menos um produto'); return }
    setSaving(true); setError('')
    try {
      await criar(
        { client_id: clienteId, price_table_id: tabelaId || undefined, discount_pct: parseFloat(desconto || '0'), valid_until: validoAte || undefined, notes: notas || undefined, subtotal, total: totalComDesconto },
        itens.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, discount_pct: i.discount_pct, total: i.unit_price * i.quantity * (1 - i.discount_pct / 100), notes: i.notes || undefined }))
      )
      router.push('/orcamentos')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl w-full">

      {/* Cliente + Configurações */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Cliente</p>

        {clienteSel ? (
          <div className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'rgba(0,117,255,0.1)', border: '1px solid rgba(0,117,255,0.25)' }}>
            <div>
              <p className="font-semibold text-white">{clienteSel.name}</p>
              {clienteSel.company_name && <p className="text-sm mt-0.5" style={{ color: '#0075FF' }}>{clienteSel.company_name}</p>}
            </div>
            <button type="button" onClick={() => { setClienteSel(null); setClienteId(''); setTabelaId('') }}
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
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Válido até</label>
            <input type="date" value={validoAte} onChange={e => setValidoAte(e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Produtos</p>
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
          <div className="space-y-2">
            {/* Table header — desktop only */}
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
                <div key={item.product_id} className="rounded-xl px-3 py-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center sm:px-2 sm:py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="col-span-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <p className="text-xs font-mono" style={{ color: '#56577A' }}>{item.code} · {item.unit}</p>
                    </div>
                    <button type="button" onClick={() => removerItem(idx)}
                      className="sm:hidden p-1 transition-colors flex-shrink-0"
                      style={{ color: '#56577A' }}
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
                    <button type="button" onClick={() => removerItem(idx)} className="p-1 transition-colors"
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
          <div className="space-y-2 pt-4 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between" style={{ color: '#A0AEC0' }}>
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {parseFloat(desconto || '0') > 0 && (
              <div className="flex justify-between" style={{ color: '#FC8181' }}>
                <span>Desconto ({desconto}%)</span>
                <span>- {formatCurrency(subtotal - totalComDesconto)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base pt-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#2CD9FF' }}>
              <span className="text-white">Total</span>
              <span>{formatCurrency(totalComDesconto)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Observações */}
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
