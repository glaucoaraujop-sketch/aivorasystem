'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Upload, X, ImageIcon } from 'lucide-react'
import { useAssistenciasMutations } from '@/hooks/useAssistencias'
import { createClient } from '@/lib/supabase/client'

interface ClienteOpt   { id: string; name: string; company_name: string | null }
interface FornecedorOpt { id: string; name: string }
interface ProdutoOpt   { id: string; name: string; code: string | null }

export default function NovaAssistenciaPage() {
  const router = useRouter()
  const { criar, uploadImagem } = useAssistenciasMutations()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // campos principais
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [description, setDescription]     = useState('')
  const [notes, setNotes]                 = useState('')

  // cliente
  const [clienteBusca, setClienteBusca]   = useState('')
  const [clientes, setClientes]           = useState<ClienteOpt[]>([])
  const [clienteSel, setClienteSel]       = useState<ClienteOpt | null>(null)

  // fornecedor
  const [fornecedores, setFornecedores]   = useState<FornecedorOpt[]>([])
  const [fornecedorId, setFornecedorId]   = useState('')

  // produto
  const [produtoBusca, setProdutoBusca]   = useState('')
  const [produtos, setProdutos]           = useState<ProdutoOpt[]>([])
  const [produtoSel, setProdutoSel]       = useState<ProdutoOpt | null>(null)

  // imagem
  const [imageFile, setImageFile]         = useState<File | null>(null)
  const [imagePreview, setImagePreview]   = useState<string | null>(null)
  const [uploading, setUploading]         = useState(false)

  // carrega fornecedores
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('suppliers') as any).select('id, name').order('name')
      .then(({ data }: { data: FornecedorOpt[] }) => setFornecedores(data ?? []))
  }, [])

  // busca clientes
  useEffect(() => {
    if (clienteBusca.length < 2) { setClientes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name').eq('active', true)
      .or(`name.ilike.%${clienteBusca}%,company_name.ilike.%${clienteBusca}%`).limit(6)
      .then(({ data }: { data: ClienteOpt[] }) => setClientes(data ?? []))
  }, [clienteBusca])

  // busca produtos
  useEffect(() => {
    if (produtoBusca.length < 2) { setProdutos([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('products') as any)
      .select('id, name, code').eq('active', true)
      .or(`name.ilike.%${produtoBusca}%,code.ilike.%${produtoBusca}%`).limit(6)
      .then(({ data }: { data: ProdutoOpt[] }) => setProdutos(data ?? []))
  }, [produtoBusca])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invoiceNumber.trim()) { setError('Informe o número da nota fiscal'); return }
    setSaving(true); setError('')

    try {
      let imageUrl: string | undefined
      if (imageFile) {
        setUploading(true)
        const { data: { user } } = await supabase.auth.getUser()
        imageUrl = await uploadImagem(imageFile, user!.id)
        setUploading(false)
      }

      await criar({
        client_id:     clienteSel?.id,
        supplier_id:   fornecedorId || undefined,
        product_id:    produtoSel?.id,
        product_name:  produtoSel?.name,
        invoice_number: invoiceNumber.trim(),
        image_url:     imageUrl,
        description:   description || undefined,
        notes:         notes || undefined,
      })
      router.push('/assistencia')
    } catch (err: unknown) {
      setUploading(false)
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nova Solicitação de Assistência</h1>
        <p className="text-gray-500 text-sm mt-0.5">Registre uma solicitação de assistência técnica para produto com defeito</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl w-full">

        {/* Nota Fiscal */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nota Fiscal</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número da NF *</label>
            <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="ex: 001234, NF-001234..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </section>

        {/* Fábrica */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Fábrica / Fornecedor</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o fornecedor</label>
            <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Selecionar —</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Cliente */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Cliente</h2>
          {clienteSel ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-blue-900">{clienteSel.name}</p>
                {clienteSel.company_name && <p className="text-sm text-blue-600">{clienteSel.company_name}</p>}
              </div>
              <button type="button" onClick={() => setClienteSel(null)}
                className="text-sm text-blue-500 hover:text-blue-700">Trocar</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {clientes.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {clientes.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteSel(c); setClienteBusca(''); setClientes([]) }}
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

        {/* Produto */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Produto</h2>
          {produtoSel ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-blue-900">{produtoSel.name}</p>
                {produtoSel.code && <p className="text-xs text-blue-500 font-mono mt-0.5">{produtoSel.code}</p>}
              </div>
              <button type="button" onClick={() => setProdutoSel(null)}
                className="text-sm text-blue-500 hover:text-blue-700">Trocar</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={produtoBusca} onChange={e => setProdutoBusca(e.target.value)}
                placeholder="Buscar produto por nome ou código..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {produtos.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {produtos.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setProdutoSel(p); setProdutoBusca(''); setProdutos([]) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      {p.code && <p className="text-xs text-gray-500 font-mono">{p.code}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Imagem do dano */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Foto do Produto Danificado</h2>
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="preview" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
              <button type="button" onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl py-10 hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-500">
              <ImageIcon size={32} />
              <span className="text-sm font-medium">Clique para enviar uma foto</span>
              <span className="text-xs">JPG, PNG ou WEBP</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {!imagePreview && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Upload size={14} /> Selecionar arquivo
            </button>
          )}
        </section>

        {/* Descrição */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Detalhes do Problema</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do defeito</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Descreva o defeito ou problema apresentado pelo produto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações internas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Informações adicionais, combinados com o cliente, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </section>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.push('/assistencia')}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {uploading ? 'Enviando imagem...' : saving ? 'Salvando...' : 'Abrir solicitação'}
          </button>
        </div>
      </form>
    </div>
  )
}
