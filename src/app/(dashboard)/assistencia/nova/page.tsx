'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Upload, X, ImageIcon, ArrowLeft } from 'lucide-react'
import { useAssistenciasMutations } from '@/hooks/useAssistencias'
import { createClient } from '@/lib/supabase/client'

interface ClienteOpt    { id: string; name: string; company_name: string | null }
interface FornecedorOpt { id: string; name: string }
interface ProdutoOpt    { id: string; name: string; code: string | null }

export default function NovaAssistenciaPage() {
  const router = useRouter()
  const { criar, uploadImagem } = useAssistenciasMutations()
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [uploading, setUploading] = useState(false)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [description, setDescription]     = useState('')
  const [notes, setNotes]                 = useState('')

  const [clienteBusca, setClienteBusca]   = useState('')
  const [clientes, setClientes]           = useState<ClienteOpt[]>([])
  const [clienteSel, setClienteSel]       = useState<ClienteOpt | null>(null)

  const [fornecedores, setFornecedores]   = useState<FornecedorOpt[]>([])
  const [fornecedorId, setFornecedorId]   = useState('')

  const [produtoBusca, setProdutoBusca]   = useState('')
  const [produtos, setProdutos]           = useState<ProdutoOpt[]>([])
  const [produtoSel, setProdutoSel]       = useState<ProdutoOpt | null>(null)

  const [imageFile, setImageFile]         = useState<File | null>(null)
  const [imagePreview, setImagePreview]   = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('suppliers') as any).select('id, name').order('name')
      .then(({ data }: { data: FornecedorOpt[] }) => setFornecedores(data ?? []))
  }, [])

  useEffect(() => {
    if (clienteBusca.length < 2) { setClientes([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('clients') as any)
      .select('id, name, company_name').eq('active', true)
      .or(`name.ilike.%${clienteBusca}%,company_name.ilike.%${clienteBusca}%`).limit(6)
      .then(({ data }: { data: ClienteOpt[] }) => setClientes(data ?? []))
  }, [clienteBusca])

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
    setImageFile(null); setImagePreview(null)
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
        client_id:      clienteSel?.id,
        supplier_id:    fornecedorId || undefined,
        product_id:     produtoSel?.id,
        product_name:   produtoSel?.name,
        invoice_number: invoiceNumber.trim(),
        image_url:      imageUrl,
        description:    description || undefined,
        notes:          notes || undefined,
      })
      router.push('/assistencia')
    } catch (err: unknown) {
      setUploading(false)
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const dropdownStyle = { background: 'rgba(6,11,40,0.98)', border: '1px solid rgba(255,255,255,0.1)' }
  const dropdownItem  = (hovered: boolean) => ({ background: hovered ? 'rgba(0,117,255,0.1)' : 'transparent' })

  function SelectedCard({ name, sub, onClear }: { name: string; sub?: string | null; onClear: () => void }) {
    return (
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'rgba(0,117,255,0.1)', border: '1px solid rgba(0,117,255,0.25)' }}>
        <div>
          <p className="font-semibold text-white">{name}</p>
          {sub && <p className="text-sm mt-0.5" style={{ color: '#0075FF' }}>{sub}</p>}
        </div>
        <button type="button" onClick={onClear}
          className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: '#0075FF' }}>
          Trocar
        </button>
      </div>
    )
  }

  function SearchDropdown<T extends { id: string }>({
    value, onChange, placeholder, results, renderItem, onSelect,
  }: {
    value: string; onChange: (v: string) => void; placeholder: string
    results: T[]; renderItem: (item: T) => { name: string; sub?: string | null }
    onSelect: (item: T) => void
  }) {
    return (
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#A0AEC0' }} />
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="input-dark w-full pl-10 pr-4 py-2.5 rounded-xl text-sm" />
        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={dropdownStyle}>
            {results.map(item => {
              const { name, sub } = renderItem(item)
              return (
                <button key={item.id} type="button"
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,117,255,0.1)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                  <p className="text-sm font-semibold text-white">{name}</p>
                  {sub && <p className="text-xs" style={{ color: '#A0AEC0' }}>{sub}</p>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-xl w-full">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/assistencia')}
          className="p-2 rounded-xl transition-all flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#A0AEC0' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#A0AEC0')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-white">Nova Solicitação de Assistência</h1>
          <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Registre um produto com defeito</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nota Fiscal */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Nota Fiscal</p>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Número da NF *</label>
            <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
              placeholder="ex: 001234, NF-001234..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm font-mono" />
          </div>
        </div>

        {/* Fábrica */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Fábrica / Fornecedor</p>
          <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
            className="input-dark w-full px-3 py-2.5 rounded-xl text-sm">
            <option value="">— Selecionar —</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Cliente */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Cliente</p>
          {clienteSel ? (
            <SelectedCard name={clienteSel.name} sub={clienteSel.company_name} onClear={() => setClienteSel(null)} />
          ) : (
            <SearchDropdown
              value={clienteBusca} onChange={setClienteBusca} placeholder="Buscar cliente..."
              results={clientes} renderItem={c => ({ name: c.name, sub: c.company_name })}
              onSelect={c => { setClienteSel(c); setClienteBusca(''); setClientes([]) }} />
          )}
        </div>

        {/* Produto */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Produto</p>
          {produtoSel ? (
            <SelectedCard name={produtoSel.name} sub={produtoSel.code} onClear={() => setProdutoSel(null)} />
          ) : (
            <SearchDropdown
              value={produtoBusca} onChange={setProdutoBusca} placeholder="Buscar produto por nome ou código..."
              results={produtos} renderItem={p => ({ name: p.name, sub: p.code })}
              onSelect={p => { setProdutoSel(p); setProdutoBusca(''); setProdutos([]) }} />
          )}
        </div>

        {/* Imagem */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>
            Foto do Produto Danificado
          </p>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="preview"
                className="w-full max-h-64 object-contain rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
              <button type="button" onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 rounded-full text-white transition-all hover:opacity-80"
                style={{ background: 'rgba(252,129,129,0.8)' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl py-10 transition-all"
              style={{ border: '2px dashed rgba(255,255,255,0.1)', color: '#56577A' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,117,255,0.4)'; (e.currentTarget as HTMLElement).style.color = '#0075FF' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#56577A' }}>
              <ImageIcon size={28} />
              <span className="text-sm font-medium">Clique para enviar uma foto</span>
              <span className="text-xs">JPG, PNG ou WEBP</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {!imagePreview && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: '#0075FF' }}>
              <Upload size={13} /> Selecionar arquivo
            </button>
          )}
        </div>

        {/* Descrição */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>Detalhes do Problema</p>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Descrição do defeito</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Descreva o defeito ou problema apresentado pelo produto..."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#56577A' }}>Observações internas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Informações adicionais, combinados com o cliente, etc."
              className="input-dark w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          </div>
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl"
            style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.push('/assistencia')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}>
            {uploading ? 'Enviando imagem…' : saving ? 'Salvando…' : 'Abrir solicitação'}
          </button>
        </div>
      </form>
    </div>
  )
}
