'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Package, Plus, Search, Tag } from 'lucide-react'
import { useProdutos, useCategorias } from '@/hooks/useProdutos'
import { formatCurrency } from '@/lib/utils'

const BRAND_COLORS: Record<string, string> = {
  'Rafana':     'bg-purple-50 border-purple-200 text-purple-700',
  'Fine Decor': 'bg-amber-50 border-amber-200 text-amber-700',
  'Feroni':     'bg-teal-50 border-teal-200 text-teal-700',
  'Cyrne':      'bg-blue-50 border-blue-200 text-blue-700',
}

const BRAND_HEADER: Record<string, string> = {
  'Rafana':     'bg-purple-600',
  'Fine Decor': 'bg-amber-600',
  'Feroni':     'bg-teal-600',
  'Cyrne':      'bg-blue-600',
}

function ProdutoCard({ p }: { p: ReturnType<typeof useProdutos>['produtos'][0] }) {
  const precoMin = p.product_prices?.length
    ? Math.min(...p.product_prices.map(pp => pp.price))
    : null

  return (
    <Link href={`/produtos/${p.id}`}
      className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all overflow-hidden group">
      <div className="h-40 bg-gray-50 flex items-center justify-center border-b border-gray-100">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <Package size={36} className="text-gray-200" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-medium text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors">
            {p.name}
          </p>
          {!p.active && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded flex-shrink-0">inativo</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3 font-mono">{p.code}</p>
        <div className="flex items-center justify-between">
          {p.product_categories && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Tag size={11} />
              {p.product_categories.name}
            </span>
          )}
          {precoMin !== null && (
            <span className="text-sm font-semibold text-blue-600">
              {formatCurrency(precoMin)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function ProdutosPage() {
  const [search, setSearch]       = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [brand, setBrand]         = useState('')

  const { produtos, loading } = useProdutos({ search, category_id: categoriaId || undefined, brand: brand || undefined })
  const categorias = useCategorias()

  const brands = useMemo(() => {
    const set = new Set(produtos.map(p => p.brand).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [produtos])

  const grouped = useMemo(() => {
    if (brand || search || categoriaId) return null
    const map = new Map<string, typeof produtos>()
    for (const p of produtos) {
      const key = p.brand ?? 'Outros'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return map
  }, [produtos, brand, search, categoriaId])

  const isFiltered = !!(brand || search || categoriaId)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Produtos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{produtos.length} produto{produtos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/produtos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          Novo Produto
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Filtro por fábrica */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setBrand('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !brand ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
          }`}>
          Todas as fábricas
        </button>
        {brands.map(b => (
          <button key={b} onClick={() => setBrand(b)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              brand === b
                ? 'bg-gray-900 text-white'
                : `bg-white border ${BRAND_COLORS[b] ?? 'border-gray-200 text-gray-600'} hover:opacity-80`
            }`}>
            {b}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-36 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : produtos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum produto encontrado</p>
          <p className="text-gray-400 text-sm mt-1">
            {isFiltered ? 'Tente outros filtros' : 'Clique em "Novo Produto" para começar'}
          </p>
        </div>
      ) : isFiltered ? (
        /* Lista filtrada — grid simples */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {produtos.map(p => <ProdutoCard key={p.id} p={p} />)}
        </div>
      ) : (
        /* Agrupado por fábrica */
        <div className="space-y-10">
          {grouped && Array.from(grouped.entries()).map(([brandName, items]) => (
            <section key={brandName}>
              <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl ${BRAND_HEADER[brandName] ?? 'bg-gray-700'}`}>
                <h2 className="text-white font-bold text-lg">{brandName}</h2>
                <span className="text-white/70 text-sm">{items.length} produto{items.length !== 1 ? 's' : ''}</span>
                <button onClick={() => setBrand(brandName)}
                  className="ml-auto text-white/80 hover:text-white text-xs font-medium transition-colors">
                  Ver só {brandName} →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map(p => <ProdutoCard key={p.id} p={p} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
