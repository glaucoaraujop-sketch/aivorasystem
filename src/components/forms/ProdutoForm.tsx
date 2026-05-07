'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProdutosMutations, useCategorias, useTabelasPreco } from '@/hooks/useProdutos'
import { useFornecedores } from '@/hooks/useFornecedores'
import { formatCurrency } from '@/lib/utils'
import type { ProductWithPrices } from '@/hooks/useProdutos'

interface Props {
  produto?: ProductWithPrices
}

export function ProdutoForm({ produto }: Props) {
  const router = useRouter()
  const { criar, atualizar } = useProdutosMutations()
  const categorias = useCategorias()
  const tabelas = useTabelasPreco()
  const { fornecedores } = useFornecedores()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    code:        produto?.code ?? '',
    name:        produto?.name ?? '',
    description: produto?.description ?? '',
    category_id: produto?.category_id ?? '',
    supplier_id: (produto as unknown as { supplier_id?: string })?.supplier_id ?? '',
    brand:       produto?.brand ?? '',
    unit:        produto?.unit ?? 'un',
    weight_kg:   produto?.weight_kg?.toString() ?? '',
    dimensions:  produto?.dimensions ?? '',
    image_url:   produto?.image_url ?? '',
  })

  const [precos, setPrecos] = useState<Record<string, string>>({})

  useEffect(() => {
    if (produto?.product_prices) {
      const map: Record<string, string> = {}
      produto.product_prices.forEach(p => { map[p.price_table_id] = p.price.toString() })
      setPrecos(map)
    }
  }, [produto])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setPreco(tableId: string, value: string) {
    setPrecos(prev => ({ ...prev, [tableId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        brand:       form.brand || null,
        description: form.description || null,
        dimensions:  form.dimensions || null,
        image_url:   form.image_url || null,
        weight_kg:   form.weight_kg ? parseFloat(form.weight_kg) : null,
      }

      const precosArray = Object.entries(precos)
        .filter(([, v]) => v && parseFloat(v) > 0)
        .map(([price_table_id, price]) => ({ price_table_id, price: parseFloat(price) }))

      if (produto) await atualizar(produto.id, payload, precosArray)
      else await criar(payload, precosArray)

      router.push('/produtos')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl w-full">
      {/* Identificação */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Identificação</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
            <input value={form.code} onChange={e => set('code', e.target.value)}
              placeholder="ex: SOF-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Selecionar...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Selecionar...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.lead_time_days} dias)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="un">Unidade (un)</option>
              <option value="m">Metro (m)</option>
              <option value="m2">Metro² (m²)</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="cx">Caixa (cx)</option>
              <option value="pc">Peça (pc)</option>
            </select>
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </section>

      {/* Dimensões */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Dimensões e Imagem</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensões</label>
            <input value={form.dimensions} onChange={e => set('dimensions', e.target.value)}
              placeholder="ex: 200x90x45 cm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            <input type="number" step="0.001" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
              placeholder="ex: 12.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem</label>
            <input type="url" value={form.image_url} onChange={e => set('image_url', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="mt-2 h-24 w-24 object-cover rounded-lg border border-gray-200" />
            )}
          </div>
        </div>
      </section>

      {/* Preços por tabela */}
      {tabelas.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Preços por Tabela</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tabelas.map(t => (
              <div key={t.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.name}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={precos[t.id] ?? ''}
                    onChange={e => setPreco(t.id, e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push('/produtos')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : produto ? 'Salvar alterações' : 'Cadastrar produto'}
        </button>
      </div>
    </form>
  )
}
