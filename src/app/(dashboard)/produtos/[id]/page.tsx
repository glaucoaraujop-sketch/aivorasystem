'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Package, Tag, Ruler, Weight, Plus, Trash2, Save, Check, X } from 'lucide-react'
import { useProduto, useTabelasPreco, useProdutosMutations } from '@/hooks/useProdutos'
import { ProdutoForm } from '@/components/forms/ProdutoForm'
import { useVariacoes, useVariacoesMutations } from '@/hooks/useVariacoes'
import { formatCurrency } from '@/lib/utils'

const BRAND_COLOR: Record<string, { color: string; bg: string }> = {
  'Rafana':     { color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  'Fine Decor': { color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
  'Feroni':     { color: '#2CD9FF', bg: 'rgba(44,217,255,0.15)'  },
  'Cyrne':      { color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
}

function VariacoesPanel({ productId }: { productId: string }) {
  const { variationTypes, loading, refetch } = useVariacoes(productId)
  const { criarTipo, removerTipo, criarOpcao, removerOpcao } = useVariacoesMutations()
  const [novoTipo, setNovoTipo]             = useState('')
  const [novaOpcao, setNovaOpcao]           = useState<Record<string, string>>({})
  const [novaOpcaoPreco, setNovaOpcaoPreco] = useState<Record<string, string>>({})
  const [saving, setSaving]                 = useState(false)
  const [erro, setErro]                     = useState<string | null>(null)

  async function adicionarTipo() {
    if (!novoTipo.trim()) return
    setSaving(true); setErro(null)
    try { await criarTipo(productId, novoTipo.trim()); setNovoTipo(''); refetch() }
    catch (e: unknown) { setErro(e instanceof Error ? e.message : 'Erro ao criar tipo') }
    finally { setSaving(false) }
  }

  async function adicionarOpcao(typeId: string) {
    const nome = novaOpcao[typeId]?.trim()
    if (!nome) return
    setSaving(true); setErro(null)
    try {
      await criarOpcao(typeId, nome, parseFloat(novaOpcaoPreco[typeId] || '0'))
      setNovaOpcao(p => ({ ...p, [typeId]: '' }))
      setNovaOpcaoPreco(p => ({ ...p, [typeId]: '' }))
      refetch()
    } catch (e: unknown) { setErro(e instanceof Error ? e.message : 'Erro ao criar opção') }
    finally { setSaving(false) }
  }

  async function excluirTipo(id: string) {
    if (!confirm('Excluir este tipo de variação e todas as suas opções?')) return
    await removerTipo(id); refetch()
  }

  async function excluirOpcao(id: string) {
    await removerOpcao(id); refetch()
  }

  return (
    <div className="glass-card rounded-2xl p-5 col-span-1 md:col-span-3">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
          Variações do Produto
        </p>
        <p className="text-xs" style={{ color: '#56577A' }}>Tecido, Modelo, Módulos, Cor…</p>
      </div>

      {erro && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
          {erro}
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: '#56577A' }}>Carregando…</p>
      ) : (
        <div className="space-y-4">
          {variationTypes.map(tipo => (
            <div key={tipo.id} className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-white text-sm">{tipo.name}</p>
                <button onClick={() => excluirTipo(tipo.id)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: '#56577A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FC8181'; (e.currentTarget as HTMLElement).style.background = 'rgba(252,129,129,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#56577A'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {tipo.options.map(opt => (
                  <div key={opt.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm"
                    style={{ background: 'rgba(0,117,255,0.12)', border: '1px solid rgba(0,117,255,0.2)' }}>
                    <span className="text-white text-xs font-medium">{opt.name}</span>
                    {opt.price_add !== 0 && (
                      <span className="text-xs" style={{ color: '#2CD9FF' }}>
                        {opt.price_add > 0 ? '+' : ''}{formatCurrency(opt.price_add)}
                      </span>
                    )}
                    <button onClick={() => excluirOpcao(opt.id)}
                      className="ml-0.5 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#FC8181')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)')}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={novaOpcao[tipo.id] ?? ''}
                  onChange={e => setNovaOpcao(p => ({ ...p, [tipo.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && adicionarOpcao(tipo.id)}
                  placeholder="Nova opção (ex: Suede)"
                  className="input-dark flex-1 px-3 py-2 rounded-xl text-sm"
                />
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#56577A' }}>R$</span>
                  <input
                    type="number" step="0.01"
                    value={novaOpcaoPreco[tipo.id] ?? ''}
                    onChange={e => setNovaOpcaoPreco(p => ({ ...p, [tipo.id]: e.target.value }))}
                    placeholder="+0"
                    className="input-dark w-full pl-7 pr-2 py-2 rounded-xl text-sm"
                  />
                </div>
                <button onClick={() => adicionarOpcao(tipo.id)} disabled={saving}
                  className="px-3 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarTipo()}
              placeholder="Novo tipo de variação (ex: Tecido, Módulos, Cor)"
              className="input-dark flex-1 px-3 py-2.5 rounded-xl text-sm"
              style={{ border: '1px dashed rgba(255,255,255,0.12)' }}
            />
            <button onClick={adicionarTipo} disabled={saving || !novoTipo.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all hover:opacity-90 whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Plus size={14} /> Adicionar tipo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PrecosPanel({ productId, currentPrices }: {
  productId: string
  currentPrices: { price: number; price_table_id: string; price_tables: { name: string } | null }[]
}) {
  const tabelas = useTabelasPreco()
  const { atualizar } = useProdutosMutations()

  const [valores, setValores] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    currentPrices.forEach(p => { map[p.price_table_id] = String(p.price) })
    return map
  })
  const [dirty, setDirty]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  function handleChange(tableId: string, val: string) {
    setValores(prev => ({ ...prev, [tableId]: val }))
    setDirty(true)
    setSaved(false)
  }

  async function salvar() {
    setSaving(true)
    try {
      const precos = Object.entries(valores)
        .filter(([, val]) => parseFloat(val) > 0)
        .map(([price_table_id, val]) => ({ price_table_id, price: parseFloat(val) }))
      await atualizar(productId, {}, precos)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  return (
    <div className="glass-card rounded-2xl p-5 col-span-1 md:col-span-3">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
          Preços por Tabela
        </p>
        {dirty ? (
          <button onClick={salvar} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 2px 12px rgba(0,117,255,0.3)' }}>
            <Save size={12} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        ) : saved ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#01B574' }}>
            <Check size={13} /> Salvo
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabelas.map(t => {
          const temPreco = valores[t.id] && parseFloat(valores[t.id]) > 0
          return (
            <div key={t.id} className="rounded-xl p-3"
              style={{
                background: temPreco ? 'rgba(0,117,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: temPreco ? '1px solid rgba(0,117,255,0.2)' : '1px dashed rgba(255,255,255,0.08)',
              }}>
              <p className="text-xs mb-2" style={{ color: '#A0AEC0' }}>{t.name}</p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#56577A' }}>R$</span>
                <input
                  type="number" step="0.01" min="0"
                  value={valores[t.id] ?? ''}
                  onChange={e => handleChange(t.id, e.target.value)}
                  placeholder="—"
                  className="input-dark w-full pl-7 pr-2 py-2 rounded-lg text-sm font-semibold"
                  style={temPreco ? { color: '#2CD9FF' } : undefined}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { produto, loading } = useProduto(id)
  const [editando, setEditando] = useState(false)

  if (loading) return (
    <div className="max-w-3xl w-full space-y-4 animate-pulse">
      <div className="h-8 rounded-xl w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-48 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )

  if (!produto) return (
    <div className="glass-card rounded-2xl p-16 text-center max-w-md">
      <Package size={32} style={{ color: '#56577A', margin: '0 auto 12px' }} />
      <p className="text-white font-semibold">Produto não encontrado</p>
    </div>
  )

  const accent = BRAND_COLOR[produto.brand ?? ''] ?? { color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)' }

  return (
    <div className="max-w-3xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link
            href="/produtos"
            className="mt-1 p-2 rounded-xl transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white leading-tight">{produto.name}</h1>
            <p className="text-sm font-mono mt-0.5" style={{ color: '#56577A' }}>{produto.code}</p>
          </div>
        </div>
        <button
          onClick={() => setEditando(!editando)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 sm:flex-shrink-0"
          style={editando ? {
            background: 'rgba(252,129,129,0.12)',
            border: '1px solid rgba(252,129,129,0.25)',
            color: '#FC8181',
          } : {
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#A0AEC0',
          }}
        >
          <Edit size={15} />
          {editando ? 'Cancelar edição' : 'Editar'}
        </button>
      </div>

      {editando ? (
        <ProdutoForm produto={produto} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Imagem */}
          <div
            className="md:col-span-1 glass-card rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ minHeight: '200px' }}
          >
            {produto.image_url ? (
              <img src={produto.image_url} alt={produto.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Package size={28} style={{ color: '#56577A' }} />
                </div>
                <p className="text-xs" style={{ color: '#56577A' }}>Sem imagem</p>
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="md:col-span-2 glass-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#A0AEC0' }}>
              Informações
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {produto.brand && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#56577A' }}>Marca</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold"
                    style={{ color: accent.color, background: accent.bg }}>
                    {produto.brand}
                  </span>
                </div>
              )}
              {produto.product_categories && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#56577A' }}>Categoria</p>
                  <p className="flex items-center gap-1.5 font-medium text-white">
                    <Tag size={13} style={{ color: '#A0AEC0' }} />
                    {produto.product_categories.name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: '#56577A' }}>Unidade</p>
                <p className="font-medium text-white">{produto.unit}</p>
              </div>
              {produto.dimensions && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#56577A' }}>Dimensões</p>
                  <p className="flex items-center gap-1.5 font-medium text-white">
                    <Ruler size={13} style={{ color: '#A0AEC0' }} />{produto.dimensions}
                  </p>
                </div>
              )}
              {produto.weight_kg && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#56577A' }}>Peso</p>
                  <p className="flex items-center gap-1.5 font-medium text-white">
                    <Weight size={13} style={{ color: '#A0AEC0' }} />{produto.weight_kg} kg
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs mb-1" style={{ color: '#56577A' }}>Status</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={produto.active
                    ? { color: '#01B574', background: 'rgba(1,181,116,0.15)' }
                    : { color: '#A0AEC0', background: 'rgba(160,174,192,0.12)' }}>
                  {produto.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            {produto.description && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-2" style={{ color: '#56577A' }}>Descrição</p>
                <p className="text-sm leading-relaxed" style={{ color: '#A0AEC0' }}>{produto.description}</p>
              </div>
            )}
          </div>

          {/* Preços */}
          <PrecosPanel productId={id} currentPrices={produto.product_prices ?? []} />

          {/* Variações */}
          <VariacoesPanel productId={id} />
        </div>
      )}
    </div>
  )
}
