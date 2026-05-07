'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit, Package, Tag, Ruler, Weight, Plus, Trash2, Save, Check } from 'lucide-react'
import { useProduto, useTabelasPreco, useProdutosMutations } from '@/hooks/useProdutos'
import { ProdutoForm } from '@/components/forms/ProdutoForm'
import { useVariacoes, useVariacoesMutations } from '@/hooks/useVariacoes'
import { formatCurrency } from '@/lib/utils'

// Painel para gerenciar variações de um produto
function VariacoesPanel({ productId }: { productId: string }) {
  const { variationTypes, loading, refetch } = useVariacoes(productId)
  const { criarTipo, removerTipo, criarOpcao, removerOpcao } = useVariacoesMutations()

  const [novoTipo, setNovoTipo]         = useState('')
  const [novaOpcao, setNovaOpcao]       = useState<Record<string, string>>({})
  const [novaOpcaoPreco, setNovaOpcaoPreco] = useState<Record<string, string>>({})
  const [saving, setSaving]             = useState(false)

  async function adicionarTipo() {
    if (!novoTipo.trim()) return
    setSaving(true)
    try { await criarTipo(productId, novoTipo.trim()); setNovoTipo(''); refetch() }
    finally { setSaving(false) }
  }

  async function adicionarOpcao(typeId: string) {
    const nome = novaOpcao[typeId]?.trim()
    if (!nome) return
    setSaving(true)
    try {
      await criarOpcao(typeId, nome, parseFloat(novaOpcaoPreco[typeId] || '0'))
      setNovaOpcao(p => ({ ...p, [typeId]: '' }))
      setNovaOpcaoPreco(p => ({ ...p, [typeId]: '' }))
      refetch()
    } finally { setSaving(false) }
  }

  async function excluirTipo(id: string) {
    if (!confirm('Excluir este tipo de variação e todas as suas opções?')) return
    await removerTipo(id); refetch()
  }

  async function excluirOpcao(id: string) {
    await removerOpcao(id); refetch()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 col-span-1 md:col-span-3">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Variações do Produto</p>
        <p className="text-xs text-gray-400">Tecido, Modelo, Módulos, Cor...</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : (
        <div className="space-y-5">
          {variationTypes.map(tipo => (
            <div key={tipo.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-800">{tipo.name}</p>
                <button onClick={() => excluirTipo(tipo.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Opções existentes */}
              <div className="flex flex-wrap gap-2 mb-3">
                {tipo.options.map(opt => (
                  <div key={opt.id} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm">
                    <span className="text-gray-800">{opt.name}</span>
                    {opt.price_add !== 0 && (
                      <span className="text-blue-500 text-xs">
                        {opt.price_add > 0 ? '+' : ''}{formatCurrency(opt.price_add)}
                      </span>
                    )}
                    <button onClick={() => excluirOpcao(opt.id)}
                      className="ml-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar opção */}
              <div className="flex gap-2">
                <input
                  value={novaOpcao[tipo.id] ?? ''}
                  onChange={e => setNovaOpcao(p => ({ ...p, [tipo.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && adicionarOpcao(tipo.id)}
                  placeholder="Nova opção (ex: Suede)"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                  <input
                    type="number" step="0.01"
                    value={novaOpcaoPreco[tipo.id] ?? ''}
                    onChange={e => setNovaOpcaoPreco(p => ({ ...p, [tipo.id]: e.target.value }))}
                    placeholder="+0,00"
                    className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button onClick={() => adicionarOpcao(tipo.id)} disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Adicionar novo tipo */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <input
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarTipo()}
              placeholder="Novo tipo de variação (ex: Tecido, Módulos, Cor)"
              className="flex-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={adicionarTipo} disabled={saving || !novoTipo.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">
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

  // Inicializa uma vez com os preços já existentes — não reseta ao re-renderizar
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    currentPrices.forEach(p => { map[p.price_table_id] = String(p.price) })
    return map
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
    <div className="col-span-1 md:col-span-3 bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Preços por Tabela</p>
        {dirty ? (
          <button onClick={salvar} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Save size={13} /> {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        ) : saved ? (
          <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <Check size={14} /> Preços salvos
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabelas.map(t => {
          const temPreco = valores[t.id] && parseFloat(valores[t.id]) > 0
          return (
            <div key={t.id} className={`rounded-lg p-3 ${temPreco ? 'bg-gray-50' : 'bg-white border border-dashed border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1.5">{t.name}</p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valores[t.id] ?? ''}
                  onChange={e => handleChange(t.id, e.target.value)}
                  placeholder="—"
                  className={`w-full pl-7 pr-2 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
                    temPreco ? 'border-gray-200 text-blue-600' : 'border-gray-200 text-gray-400'
                  }`}
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

  if (loading) return <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
  if (!produto) return <p className="text-gray-500">Produto não encontrado.</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/produtos" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{produto.name}</h1>
          <p className="text-gray-400 text-sm font-mono">{produto.code}</p>
        </div>
        <button onClick={() => setEditando(!editando)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Edit size={15} />
          {editando ? 'Cancelar edição' : 'Editar'}
        </button>
      </div>

      {editando ? (
        <ProdutoForm produto={produto} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {/* Imagem */}
          <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center min-h-48">
            {produto.image_url ? (
              <img src={produto.image_url} alt={produto.name} className="max-h-48 object-contain rounded-lg" />
            ) : (
              <Package size={48} className="text-gray-200" />
            )}
          </div>

          {/* Detalhes */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">Informações</p>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              {produto.brand && (
                <div>
                  <p className="text-gray-400 mb-0.5">Marca</p>
                  <p className="font-medium text-gray-900">{produto.brand}</p>
                </div>
              )}
              {produto.product_categories && (
                <div>
                  <p className="text-gray-400 mb-0.5">Categoria</p>
                  <p className="flex items-center gap-1.5 font-medium text-gray-900">
                    <Tag size={13} className="text-gray-400" />
                    {produto.product_categories.name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-400 mb-0.5">Unidade</p>
                <p className="font-medium text-gray-900">{produto.unit}</p>
              </div>
              {produto.dimensions && (
                <div>
                  <p className="text-gray-400 mb-0.5">Dimensões</p>
                  <p className="flex items-center gap-1.5 font-medium text-gray-900">
                    <Ruler size={13} className="text-gray-400" />{produto.dimensions}
                  </p>
                </div>
              )}
              {produto.weight_kg && (
                <div>
                  <p className="text-gray-400 mb-0.5">Peso</p>
                  <p className="flex items-center gap-1.5 font-medium text-gray-900">
                    <Weight size={13} className="text-gray-400" />{produto.weight_kg} kg
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-400 mb-0.5">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${produto.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {produto.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            {produto.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-400 text-xs mb-1">Descrição</p>
                <p className="text-sm text-gray-700">{produto.description}</p>
              </div>
            )}
          </div>

          {/* Preços editáveis */}
          <PrecosPanel productId={id} currentPrices={produto.product_prices ?? []} />

          {/* Variações */}
          <VariacoesPanel productId={id} />
        </div>
      )}
    </div>
  )
}
