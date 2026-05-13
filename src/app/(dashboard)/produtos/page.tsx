'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Package, Plus, Search, Tag } from 'lucide-react'
import { useProdutos, useCategorias } from '@/hooks/useProdutos'
import { formatCurrency } from '@/lib/utils'

const BRAND_ACCENT: Record<string, { color: string; bg: string }> = {
  'Rafana':     { color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  'Fine Decor': { color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
  'Feroni':     { color: '#2CD9FF', bg: 'rgba(44,217,255,0.15)'  },
  'Cyrne':      { color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
}

function ProdutoCard({ p }: { p: ReturnType<typeof useProdutos>['produtos'][0] }) {
  const precoMin = p.product_prices?.length
    ? Math.min(...p.product_prices.map(pp => pp.price))
    : null
  const accent = BRAND_ACCENT[p.brand ?? ''] ?? { color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' }

  return (
    <Link
      href={`/produtos/${p.id}`}
      className="glass-card rounded-2xl overflow-hidden transition-all group"
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div
        className="h-40 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <Package size={36} style={{ color: '#56577A' }} />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-white text-sm leading-snug group-hover:text-blue-400 transition-colors">
            {p.name}
          </p>
          {!p.active && (
            <span
              className="px-1.5 py-0.5 text-xs rounded-full flex-shrink-0"
              style={{ color: '#FC8181', background: 'rgba(252,129,129,0.15)' }}
            >
              inativo
            </span>
          )}
        </div>
        <p className="text-xs font-mono mb-3" style={{ color: '#56577A' }}>{p.code}</p>
        <div className="flex items-center justify-between">
          {p.product_categories && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#A0AEC0' }}>
              <Tag size={11} />
              {p.product_categories.name}
            </span>
          )}
          {precoMin !== null && (
            <span className="text-sm font-black" style={{ color: accent.color }}>
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
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Catálogo</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/produtos/novo"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 sm:flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
            boxShadow: '0 4px 20px rgba(0, 117, 255, 0.3)',
          }}
        >
          <Plus size={16} />
          Novo Produto
        </Link>
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            />
          </div>
          <select
            value={categoriaId}
            onChange={e => setCategoriaId(e.target.value)}
            className="input-dark px-4 py-2.5 rounded-xl text-sm"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Filtro por fábrica */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setBrand('')}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={!brand ? {
              background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 12px rgba(0,117,255,0.25)',
            } : {
              background: 'rgba(255,255,255,0.06)',
              color: '#A0AEC0',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Todas as fábricas
          </button>
          {brands.map(b => {
            const acc = BRAND_ACCENT[b] ?? { color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' }
            return (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={brand === b ? {
                  color: acc.color,
                  background: acc.bg,
                  border: `1px solid ${acc.color}40`,
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  color: '#A0AEC0',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {b}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
              <div className="h-36 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-4 rounded-lg w-3/4 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded-lg w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : produtos.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Package size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhum produto encontrado</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {isFiltered ? 'Tente outros filtros' : 'Clique em "Novo Produto" para começar'}
          </p>
        </div>
      ) : isFiltered ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {produtos.map(p => <ProdutoCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="space-y-10">
          {grouped && Array.from(grouped.entries()).map(([brandName, items]) => {
            const acc = BRAND_ACCENT[brandName] ?? { color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' }
            return (
              <section key={brandName}>
                <div
                  className="flex items-center gap-3 mb-4 px-4 py-3 rounded-2xl"
                  style={{ background: acc.bg, border: `1px solid ${acc.color}30` }}
                >
                  <h2 className="font-black text-lg" style={{ color: acc.color }}>{brandName}</h2>
                  <span className="text-sm" style={{ color: `${acc.color}99` }}>
                    {items.length} produto{items.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setBrand(brandName)}
                    className="ml-auto text-xs font-medium transition-all hover:opacity-80"
                    style={{ color: acc.color }}
                  >
                    Ver só {brandName} →
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {items.map(p => <ProdutoCard key={p.id} p={p} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
