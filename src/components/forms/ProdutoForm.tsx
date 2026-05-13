'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProdutosMutations, useCategorias, useTabelasPreco } from '@/hooks/useProdutos'
import { useFornecedores } from '@/hooks/useFornecedores'
import type { ProductWithPrices } from '@/hooks/useProdutos'

interface Props { produto?: ProductWithPrices }

const glass = {
  background: 'linear-gradient(127.09deg, rgba(6,11,40,0.94) 19.41%, rgba(10,14,35,0.49) 76.65%)',
  backdropFilter: 'blur(120px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-1 sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>{label}</label>
      {children}
    </div>
  )
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
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
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl w-full">

      {/* Identificação */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Identificação</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Código *">
            <input value={form.code} onChange={e => set('code', e.target.value)}
              placeholder="ex: SOF-001" required
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm font-mono" />
          </Field>
          <Field label="Marca">
            <input value={form.brand} onChange={e => set('brand', e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Nome *" span2>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Categoria">
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">Selecionar...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Fornecedor">
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="">Selecionar...</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.lead_time_days} dias)</option>
              ))}
            </select>
          </Field>
          <Field label="Unidade">
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
              <option value="un">Unidade (un)</option>
              <option value="m">Metro (m)</option>
              <option value="m2">Metro² (m²)</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="cx">Caixa (cx)</option>
              <option value="pc">Peça (pc)</option>
            </select>
          </Field>
          <Field label="Descrição" span2>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          </Field>
        </div>
      </section>

      {/* Dimensões e Imagem */}
      <section className="rounded-2xl p-5 space-y-4" style={glass}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Dimensões e Imagem</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Dimensões">
            <input value={form.dimensions} onChange={e => set('dimensions', e.target.value)}
              placeholder="ex: 200x90x45 cm"
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" step="0.001" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
              placeholder="ex: 12.5"
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
          </Field>
          <Field label="URL da Imagem" span2>
            <input type="url" value={form.image_url} onChange={e => set('image_url', e.target.value)}
              placeholder="https://..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm" />
            {form.image_url && (
              <img src={form.image_url} alt="preview"
                className="mt-3 h-24 w-24 object-cover rounded-xl"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
            )}
          </Field>
        </div>
      </section>

      {/* Preços por tabela */}
      {tabelas.length > 0 && (
        <section className="rounded-2xl p-5 space-y-4" style={glass}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Preços por Tabela</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tabelas.map(t => (
              <div key={t.id}>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>{t.name}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: '#56577A' }}>R$</span>
                  <input type="number" step="0.01" min="0"
                    value={precos[t.id] ?? ''}
                    onChange={e => setPrecos(prev => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="0,00"
                    className="input-dark w-full pl-9 pr-3 py-2.5 rounded-xl text-sm" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <p className="text-sm px-4 py-3 rounded-xl"
          style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => router.push('/produtos')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
          {saving ? 'Salvando…' : produto ? 'Salvar alterações' : 'Cadastrar produto'}
        </button>
      </div>
    </form>
  )
}
