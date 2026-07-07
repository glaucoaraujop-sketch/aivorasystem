'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { soDig, fmtCnpj, semAcento as sem, palavrasChave, aliasTermos } from '@/lib/pedidos/matching'

interface ItemExtraido {
  codigo: string
  nome: string
  familia?: string | null
  quantidade: number
  unit_price: number
  discount_pct: number
  total: number
  notas: string
}

interface PedidoExtraido {
  numero: string
  numero_pedido_fabrica: string | null
  numero_ordem_compra: string | null
  ped_consultor?: string | null
  showroom: string | null
  data: string
  cliente_nome: string
  cliente_empresa: string
  cliente_cnpj: string | null
  cliente_codigo?: string | null
  cliente_ie?: string | null
  cliente_endereco?: string | null
  cliente_bairro?: string | null
  cliente_cidade?: string | null
  cliente_uf?: string | null
  cliente_cep?: string | null
  fornecedor_nome: string
  fornecedor_cnpj: string | null
  payment_terms: string
  prazo_dias?: number | null
  situacao?: string | null
  tabela?: string | null
  frete_tipo?: string | null
  frete_valor?: number | null
  frete_pct?: number | null
  frete_embutido?: boolean | null
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

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xlsx,.xls,.csv'

export function ImportadorPedidos({ onClose, onImported }: ImportadorPedidosProps) {
  const [dragging, setDragging]     = useState(false)
  const [file, setFile]             = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [pedidos, setPedidos]       = useState<PedidoExtraido[]>([])
  const [error, setError]           = useState('')
  const [importing, setImporting]   = useState(false)
  const [done, setDone]             = useState(false)
  const [modo, setModo]             = useState<'arquivo' | 'texto'>('arquivo')
  const [texto, setTexto]           = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processBody = useCallback(async (fd: FormData) => {
    setError('')
    setPedidos([])
    setExtracting(true)
    setDone(false)

    try {
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

      const resolved = await Promise.all(extraidos.map(async p => {
        let clienteId: string | null = null
        let fornecedorId: string | null = null

        // ── Cliente: CNPJ primeiro, nome como fallback ──────────────────
        const cnpjCliente = soDig(p.cliente_cnpj)
        if (cnpjCliente.length >= 11) {
          // Busca pelos dois formatos: dígitos puros e formatado (XX.XXX.XXX/XXXX-XX)
          const cnpjFmt = fmtCnpj(cnpjCliente)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: c0 } = await (sb.from('clients') as any)
            .select('id')
            .or(`cpf_cnpj.eq.${cnpjCliente},cpf_cnpj.eq.${cnpjFmt}`)
            .limit(1)
          if (c0 && c0.length > 0) clienteId = (c0[0] as { id: string }).id
        }

        if (!clienteId && p.cliente_nome) {
          // Fallback 1: nome/empresa normalizado (sem acento)
          const nomeNorm    = sem(p.cliente_nome)
          const empresaNorm = p.cliente_empresa ? sem(p.cliente_empresa) : ''
          const partes = [
            `name.ilike.%${nomeNorm}%`,
            `company_name.ilike.%${nomeNorm}%`,
            ...(empresaNorm ? [`name.ilike.%${empresaNorm}%`, `company_name.ilike.%${empresaNorm}%`] : []),
          ]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: c1 } = await (sb.from('clients') as any).select('id').or(partes.join(',')).limit(1)
          if (c1 && c1.length > 0) {
            clienteId = (c1[0] as { id: string }).id
          } else {
            // Fallback 2: palavras-chave individuais
            const chaves = palavrasChave(p.cliente_nome + ' ' + (p.cliente_empresa ?? ''))
            if (chaves.length > 0) {
              const partes2 = chaves.flatMap(w => [`name.ilike.%${w}%`, `company_name.ilike.%${w}%`])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: c2 } = await (sb.from('clients') as any).select('id').or(partes2.join(',')).limit(1)
              if (c2 && c2.length > 0) clienteId = (c2[0] as { id: string }).id
            }
          }
        }

        // ── Fornecedor: nome (sem CNPJ no cadastro de suppliers normalmente) ──
        if (p.fornecedor_nome) {
          // Passo 0: alias razão social ↔ nome fantasia. Se o nome na nota bate
          // com um fornecedor conhecido, busca por todos os termos equivalentes
          // (acha o cadastro seja pelo nome fantasia ou pela razão social).
          const termosAlias = aliasTermos(p.fornecedor_nome)
          if (termosAlias) {
            const partesAlias = termosAlias.map(t => `name.ilike.%${t}%`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: fa } = await (sb.from('suppliers') as any).select('id').or(partesAlias.join(',')).limit(1)
            if (fa && fa.length > 0) fornecedorId = (fa[0] as { id: string }).id
          }

          const fornNorm = sem(p.fornecedor_nome)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: f1 } = !fornecedorId
            ? await (sb.from('suppliers') as any).select('id').ilike('name', `%${fornNorm}%`).limit(1)
            : { data: null }
          if (fornecedorId) {
            // já resolvido pelo alias
          } else if (f1 && f1.length > 0) {
            fornecedorId = (f1[0] as { id: string }).id
          } else {
            const chaves = palavrasChave(p.fornecedor_nome)
            if (chaves.length > 0) {
              const partes = chaves.map(w => `name.ilike.%${w}%`)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: f2 } = await (sb.from('suppliers') as any).select('id').or(partes.join(',')).limit(1)
              if (f2 && f2.length > 0) fornecedorId = (f2[0] as { id: string }).id
            }
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

  const processFile = useCallback((f: File) => {
    setFile(f)
    const fd = new FormData()
    fd.append('file', f)
    processBody(fd)
  }, [processBody])

  const processText = useCallback(() => {
    if (!texto.trim()) return
    setFile(null)
    const fd = new FormData()
    fd.append('text', texto)
    processBody(fd)
  }, [texto, processBody])

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
            // Número principal lido do documento pela AIVA; se vazio, o banco gera automaticamente
            number: p.numero?.trim() || null,
            status: 'confirmado',
            subtotal: p.subtotal || p.total,
            discount_pct: p.discount_pct ?? 0,
            total: p.total,
            payment_terms: p.payment_terms || null,
            delivery_date: p.delivery_date || null,
            notes: p.notes || null,
            // Campos do padrão fábrica ("Pedido de Venda")
            purchase_order: p.numero_ordem_compra || null,
            ped_consultor: p.ped_consultor || null,
            data_emissao: p.data || null,
            prazo_dias: p.prazo_dias ?? null,
            situacao_financeira: p.situacao || null,
            tabela: p.tabela || null,
            frete_tipo: p.frete_tipo || null,
            frete_valor: p.frete_valor ?? null,
            frete_pct: p.frete_pct ?? null,
            frete_embutido: typeof p.frete_embutido === 'boolean' ? p.frete_embutido : null,
          })
          .select('id')
          .single()

        if (oErr || !order) {
          // number é UNIQUE — pedido com o mesmo número já existe
          if (oErr?.code === '23505' || /duplicate|unique/i.test(oErr?.message ?? '')) {
            throw new Error(`Pedido nº ${p.numero} já existe no sistema`)
          }
          throw new Error(oErr?.message || 'Falha ao criar pedido')
        }

        // Produtos sem product_id — registramos os itens nas notas do pedido
        const itensTexto = p.itens.map(it =>
          `• ${it.codigo ? `[${it.codigo}] ` : ''}${it.nome}${it.familia ? ` {${it.familia}}` : ''} — Qtd: ${it.quantidade} × ${formatCurrency(it.unit_price)} = ${formatCurrency(it.total)}${it.notas ? ` (${it.notas})` : ''}`
        ).join('\n')

        // Dados do pedido capturados pela AIVA (guardados nas observações)
        const dadosTexto = [
          p.numero_pedido_fabrica ? `Nº pedido fábrica: ${p.numero_pedido_fabrica}` : null,
          p.numero_ordem_compra   ? `Nº ordem de compra: ${p.numero_ordem_compra}` : null,
          p.showroom              ? `Showroom: ${p.showroom}` : null,
        ].filter(Boolean).join('\n')

        const notasFinal = [
          p.notes,
          dadosTexto ? '--- Dados do pedido ---\n' + dadosTexto : null,
          '--- Itens importados ---\n' + itensTexto,
        ].filter(Boolean).join('\n\n')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sb.from('orders') as any).update({ notes: notasFinal }).eq('id', (order as { id: string }).id)

        // Enriquece o cadastro do cliente com dados do documento — SÓ preenche
        // campos hoje vazios (nunca sobrescreve o que já existe).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cAtual } = await (sb.from('clients') as any)
          .select('codigo,inscricao_estadual,bairro,address,city,state,cep')
          .eq('id', p._clienteId).single()
        if (cAtual) {
          const patch: Record<string, string> = {}
          const setSeVazio = (campo: string, valor: string | null | undefined) => {
            if (valor && !(cAtual as Record<string, unknown>)[campo]) patch[campo] = valor
          }
          setSeVazio('codigo', p.cliente_codigo)
          setSeVazio('inscricao_estadual', p.cliente_ie)
          setSeVazio('bairro', p.cliente_bairro)
          setSeVazio('address', p.cliente_endereco)
          setSeVazio('city', p.cliente_cidade)
          setSeVazio('state', p.cliente_uf)
          setSeVazio('cep', p.cliente_cep)
          if (Object.keys(patch).length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (sb.from('clients') as any).update(patch).eq('id', p._clienteId)
          }
        }

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
              <p className="text-xs" style={{ color: '#56577A' }}>Arquivo (PDF, imagem, DOCX, XLSX, CSV) ou texto colado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: '#A0AEC0' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Entrada: arquivo ou texto */}
          {!extracting && pedidos.length === 0 && (
            <div className="space-y-4">
              {/* Alternador de modo */}
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {([['arquivo', 'Arquivo'], ['texto', 'Colar texto']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setModo(val)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={modo === val
                      ? { background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#fff' }
                      : { color: '#A0AEC0' }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {modo === 'arquivo' ? (
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
                  <p className="text-xs" style={{ color: '#56577A' }}>Suporta PDF, imagem (PNG/JPG), DOCX, XLSX e CSV</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    placeholder={'Cole aqui o conteúdo do(s) pedido(s)...\n\nEx:\nCliente: 1749 - SETTE MÓVEIS EIRELI\nPedido: 44374\nCPF/CNPJ...: 31.792.444/0001-30\nTransport.: 2327 - CYRNE DECOR LTDA\n...'}
                    rows={12}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/50 resize-y font-mono"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  <button
                    onClick={processText}
                    disabled={!texto.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', boxShadow: '0 4px 20px rgba(0,117,255,0.3)' }}
                  >
                    <FileText size={15} />
                    Analisar texto
                  </button>
                  <p className="text-xs" style={{ color: '#56577A' }}>
                    Cole um ou vários pedidos. A AIVA identifica cada um pelo número de referência.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Extracting state */}
          {extracting && (
            <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#0075FF' }} />
              <p className="text-white font-semibold mb-1">Analisando...</p>
              {file?.name && <p className="text-xs" style={{ color: '#56577A' }}>{file.name}</p>}
              <p className="text-xs mt-1" style={{ color: '#56577A' }}>A AIVA está lendo e extraindo os pedidos. Arquivos com muitas páginas podem levar alguns minutos.</p>
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
                    {p.numero_pedido_fabrica && <span>Nº fábrica: <span className="text-white">{p.numero_pedido_fabrica}</span></span>}
                    {p.numero_ordem_compra && <span>Ordem de compra: <span className="text-white">{p.numero_ordem_compra}</span></span>}
                    {p.showroom && <span>Showroom: <span className="text-white">{p.showroom}</span></span>}
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
            onClick={() => { setFile(null); setTexto(''); setPedidos([]); setError(''); setDone(false) }}
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
