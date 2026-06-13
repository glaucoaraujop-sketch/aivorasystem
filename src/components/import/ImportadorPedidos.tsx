'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface ItemExtraido {
  codigo: string
  nome: string
  quantidade: number
  unit_price: number
  discount_pct: number
  total: number
  notas: string
}

interface PedidoExtraido {
  numero: string
  data: string
  cliente_nome: string
  cliente_empresa: string
  fornecedor_nome: string
  payment_terms: string
  delivery_date: string | null
  notes: string
  subtotal: number
  discount_pct: number
  total: number
  itens: ItemExtraido[]
  // resolved after matching
  _clienteId?: string | null
  _fornecedorId?: string | null
  _status?: 'pending' | 'importing' | 'done' | 'error'
  _error?: string
}

interface ImportadorPedidosProps {
  onClose: () => void
  onImported?: () => void
}

const ACCEPTED = '.pdf,.doc,.docx,.xlsx,.xls,.csv'

export function ImportadorPedidos({ onClose, onImported }: ImportadorPedidosProps) {
  const [dragging, setDragging]     = useState(false)
  const [file, setFile]             = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [pedidos, setPedidos]       = useState<PedidoExtraido[]>([])
  const [error, setError]           = useState('')
  const [importing, setImporting]   = useState(false)
  const [done, setDone]             = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (f: File) => {
    setFile(f)
    setError('')
    setPedidos([])
    setExtracting(true)
    setDone(false)

    try {
      const fd = new FormData()
      fd.append('file', f)
      const res = await fetch('/api/import/pedidos', { method: 'POST', body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Erro ao processar arquivo')
      }
      const data = await res.json()
      const extraidos: PedidoExtraido[] = (data.pedidos ?? []).map((p: PedidoExtraido) => ({
        ...p,
        _status: 'pending' as const,
      }))

      // Tentar resolver clientes e fornecedores automaticamente
      const sb = createClient()

      // Remove acentos para busca tolerante (PDF pode ter "MÓVEIS", banco tem "MOVEIS")
      function sem(s: string): string {
        return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
      }

      // Palavras genéricas a ignorar como chave de busca
      const STOPWORDS = new Set([
        'E', 'DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'NO', 'NA', 'OS', 'AS',
        'LTDA', 'EIRELI', 'EIRELE', 'ME', 'SA', 'SS', 'EPP', 'SRL',
        'MOVEIS', 'MOVEL', 'FURNITURE', 'INDUSTRIA', 'COMERCIO', 'COM',
      ])

      // Retorna todas as palavras significativas do nome (para busca multi-tentativa)
      function palavrasChave(s: string): string[] {
        return sem(s).toUpperCase().split(' ').filter(w => w.length > 3 && !STOPWORDS.has(w))
      }

      // Busca por qualquer palavra chave (OR) em um campo
      async function buscarPorPalavras(
        tabela: 'clients' | 'suppliers',
        palavras: string[],
        campos: string[],
      ): Promise<string | null> {
        if (palavras.length === 0) return null
        const partes = palavras.flatMap(w => campos.map(c => `${c}.ilike.%${w}%`))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (sb.from(tabela) as any).select('id').or(partes.join(',')).limit(1)
        return data && data.length > 0 ? (data[0] as { id: string }).id : null
      }

      const resolved = await Promise.all(extraidos.map(async p => {
        let clienteId: string | null = null
        let fornecedorId: string | null = null

        if (p.cliente_nome) {
          const nomeNorm    = sem(p.cliente_nome)
          const empresaNorm = p.cliente_empresa ? sem(p.cliente_empresa) : ''

          // Tentativa 1: nome/empresa normalizado como substring em name ou company_name
          const partes1 = [
            `name.ilike.%${nomeNorm}%`,
            `company_name.ilike.%${nomeNorm}%`,
            ...(empresaNorm ? [`name.ilike.%${empresaNorm}%`, `company_name.ilike.%${empresaNorm}%`] : []),
          ]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: c1 } = await (sb.from('clients') as any).select('id').or(partes1.join(',')).limit(1)
          if (c1 && c1.length > 0) {
            clienteId = (c1[0] as { id: string }).id
          } else {
            // Tentativa 2: palavras-chave individualmente (ex: "TUTTI", "RAFANA")
            const chaves = palavrasChave(p.cliente_nome + ' ' + (p.cliente_empresa ?? ''))
            clienteId = await buscarPorPalavras('clients', chaves, ['name', 'company_name'])
          }
        }

        if (p.fornecedor_nome) {
          const fornNorm = sem(p.fornecedor_nome)

          // Tentativa 1: nome normalizado como substring
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: f1 } = await (sb.from('suppliers') as any).select('id').ilike('name', `%${fornNorm}%`).limit(1)
          if (f1 && f1.length > 0) {
            fornecedorId = (f1[0] as { id: string }).id
          } else {
            // Tentativa 2: cada palavra significativa do nome do fornecedor
            const chaves = palavrasChave(p.fornecedor_nome)
            fornecedorId = await buscarPorPalavras('suppliers', chaves, ['name'])
          }
        }

        return { ...p, _clienteId: clienteId, _fornecedorId: fornecedorId }
      }))

      setPedidos(resolved)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setExtracting(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [processFile])

  async function handleImport() {
    if (pedidos.length === 0) return
    setImporting(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setError('Sessão expirada. Faça login novamente.'); setImporting(false); return }

    const updated = [...pedidos]
    for (let i = 0; i < updated.length; i++) {
      const p = updated[i]
      if (!p._clienteId) {
        updated[i] = { ...p, _status: 'error', _error: 'Cliente não encontrado no sistema' }
        setPedidos([...updated])
        continue
      }

      updated[i] = { ...p, _status: 'importing' }
      setPedidos([...updated])

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order, error: oErr } = await (sb.from('orders') as any)
          .insert({
            user_id: user.id,
            client_id: p._clienteId,
            supplier_id: p._fornecedorId ?? null,
            status: 'confirmado',
            subtotal: p.subtotal || p.total,
            discount_pct: p.discount_pct ?? 0,
            total: p.total,
            payment_terms: p.payment_terms || null,
            delivery_date: p.delivery_date || null,
            notes: p.notes || null,
          })
          .select('id')
          .single()

        if (oErr || !order) throw new Error(oErr?.message || 'Falha ao criar pedido')

        // Produtos sem product_id — registramos os itens nas notas do pedido
        const itensTexto = p.itens.map(it =>
          `• ${it.codigo ? `[${it.codigo}] ` : ''}${it.nome} — Qtd: ${it.quantidade} × ${formatCurrency(it.unit_price)} = ${formatCurrency(it.total)}${it.notas ? ` (${it.notas})` : ''}`
        ).join('\n')

        const notasFinal = [p.notes, '\n--- Itens importados ---\n' + itensTexto].filter(Boolean).join('\n\n')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sb.from('orders') as any).update({ notes: notasFinal }).eq('id', (order as { id: string }).id)

        updated[i] = { ...p, _status: 'done' }
        setPedidos([...updated])
      } catch (e) {
        updated[i] = { ...p, _status: 'error', _error: e instanceof Error ? e.message : 'Erro' }
        setPedidos([...updated])
      }
    }

    setImporting(false)
    setDone(true)
    onImported?.()
  }

  const canImport = pedidos.length > 0 && !extracting && !importing && !done

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'linear-gradient(127deg, rgba(6,11,40,0.98) 19%, rgba(10,14,35,0.95) 77%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,117,255,0.15)' }}>
              <Upload size={16} style={{ color: '#0075FF' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Importar Pedidos</p>
              <p className="text-xs" style={{ color: '#56577A' }}>PDF, DOCX, XLSX ou CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: '#A0AEC0' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Drop zone */}
          {!extracting && pedidos.length === 0 && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-2xl p-10 text-center transition-all"
              style={{
                border: dragging ? '2px dashed #0075FF' : '2px dashed rgba(255,255,255,0.12)',
                background: dragging ? 'rgba(0,117,255,0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,117,255,0.1)' }}>
                <FileText size={24} style={{ color: '#0075FF' }} />
              </div>
              <p className="text-white font-semibold mb-1">Arraste o arquivo ou clique para selecionar</p>
              <p className="text-xs" style={{ color: '#56577A' }}>Suporta PDF, DOCX, XLSX e CSV</p>
            </div>
          )}

          {/* Extracting state */}
          {extracting && (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#0075FF' }} />
              <p className="text-white font-semibold mb-1">Analisando arquivo...</p>
              <p className="text-xs" style={{ color: '#56577A' }}>{file?.name}</p>
              <p className="text-xs mt-1" style={{ color: '#56577A' }}>A AIVA está lendo e extraindo os dados do pedido</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
              <AlertCircle size={18} style={{ color: '#FC8181', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#FC8181' }}>Erro</p>
                <p className="text-xs mt-0.5" style={{ color: '#FC8181', opacity: 0.8 }}>{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {pedidos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{pedidos.length} pedido{pedidos.length > 1 ? 's' : ''} encontrado{pedidos.length > 1 ? 's' : ''}</p>
                {file && <p className="text-xs" style={{ color: '#56577A' }}>{file.name}</p>}
              </div>

              {pedidos.map((p, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {/* Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{p.cliente_empresa || p.cliente_nome || '(sem cliente)'}</p>
                      {p.cliente_empresa && p.cliente_nome !== p.cliente_empresa && (
                        <p className="text-xs" style={{ color: '#56577A' }}>{p.cliente_nome}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p._status === 'importing' && <Loader2 size={14} className="animate-spin" style={{ color: '#0075FF' }} />}
                      {p._status === 'done' && <CheckCircle size={14} style={{ color: '#01B574' }} />}
                      {p._status === 'error' && <AlertCircle size={14} style={{ color: '#FC8181' }} />}
                      <span className="text-sm font-bold text-white">{formatCurrency(p.total)}</span>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#A0AEC0' }}>
                    {p.numero && <span>Nº: <span className="text-white">{p.numero}</span></span>}
                    {p.data && <span>Data: <span className="text-white">{p.data}</span></span>}
                    {p.fornecedor_nome && <span>Fornecedor: <span className="text-white">{p.fornecedor_nome}</span></span>}
                    {p.payment_terms && <span>Pagamento: <span className="text-white">{p.payment_terms}</span></span>}
                  </div>

                  {/* Match status */}
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={p._clienteId
                        ? { color: '#01B574', background: 'rgba(1,181,116,0.1)' }
                        : { color: '#FC8181', background: 'rgba(252,129,129,0.1)' }}>
                      {p._clienteId ? 'Cliente encontrado' : 'Cliente NÃO encontrado'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={p._fornecedorId
                        ? { color: '#01B574', background: 'rgba(1,181,116,0.1)' }
                        : { color: '#F6AD55', background: 'rgba(246,173,85,0.1)' }}>
                      {p._fornecedorId ? 'Fornecedor encontrado' : 'Fornecedor não vinculado'}
                    </span>
                  </div>

                  {/* Items summary */}
                  {p.itens.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium" style={{ color: '#56577A' }}>{p.itens.length} item{p.itens.length > 1 ? 's' : ''}</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {p.itens.map((it, j) => (
                          <div key={j} className="flex items-center justify-between gap-2 text-xs py-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="text-white truncate flex-1">{it.codigo ? `[${it.codigo}] ` : ''}{it.nome}</span>
                            <span style={{ color: '#A0AEC0', flexShrink: 0 }}>{it.quantidade}x</span>
                            <span style={{ color: '#A0AEC0', flexShrink: 0 }}>{formatCurrency(it.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p._status === 'error' && p._error && (
                    <p className="text-xs" style={{ color: '#FC8181' }}>{p._error}</p>
                  )}
                  {p._status === 'done' && (
                    <p className="text-xs font-medium" style={{ color: '#01B574' }}>Importado com sucesso</p>
                  )}
                </div>
              ))}

              {/* Warning for unmatched clients */}
              {pedidos.some(p => !p._clienteId) && !done && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.2)' }}>
                  <AlertCircle size={14} style={{ color: '#F6AD55', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs" style={{ color: '#F6AD55' }}>
                    Pedidos sem cliente encontrado serão ignorados. Cadastre o cliente primeiro e reimporte.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(1,181,116,0.1)', border: '1px solid rgba(1,181,116,0.2)' }}>
              <CheckCircle size={20} style={{ color: '#01B574' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#01B574' }}>Importação concluída</p>
                <p className="text-xs mt-0.5" style={{ color: '#01B574', opacity: 0.8 }}>
                  {pedidos.filter(p => p._status === 'done').length} de {pedidos.length} pedido{pedidos.length > 1 ? 's' : ''} importado{pedidos.filter(p => p._status === 'done').length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => { setFile(null); setPedidos([]); setError(''); setDone(false) }}
            className="text-sm px-4 py-2 rounded-xl transition-all"
            style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.05)' }}
          >
            {done ? 'Importar outro' : 'Limpar'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-xl transition-all"
              style={{ color: '#A0AEC0', background: 'rgba(255,255,255,0.05)' }}
            >
              Fechar
            </button>
            {canImport && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 text-sm px-5 py-2 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                  boxShadow: '0 4px 20px rgba(0,117,255,0.3)',
                }}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                {importing ? 'Importando...' : `Importar ${pedidos.filter(p => p._clienteId).length} pedido${pedidos.filter(p => p._clienteId).length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
