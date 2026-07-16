'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { nomeEmpresaCliente } from '@/lib/nomeCliente'

export type SelecaoCliLoja = { tipo: 'cliente' | 'loja'; id: string; label: string }

// Autocomplete que sugere CLIENTES e LOJAS (PDVs) enquanto digita.
// Ao escolher um cliente → filtra por cliente; um PDV → filtra por loja.
export function ClienteLojaBusca({
  lojas,
  onSelecionar,
}: {
  lojas: { id: string; label: string }[]
  onSelecionar: (s: SelecaoCliLoja | null) => void
}) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const [fixado, setFixado] = useState(false)
  const [clientes, setClientes] = useState<{ id: string; label: string }[]>([])
  const supabase = createClient()
  const boxRef = useRef<HTMLDivElement>(null)

  // Busca clientes no servidor (debounce) enquanto digita.
  useEffect(() => {
    if (fixado) return
    const t = texto.trim()
    if (t.length < 2) { setClientes([]); return }
    const h = setTimeout(async () => {
      const like = `%${t.replace(/[(),]/g, ' ')}%`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('clients') as any)
        .select('id,name,company_name,razao_social')
        .or(`name.ilike.${like},company_name.ilike.${like},razao_social.ilike.${like}`)
        .eq('active', true).limit(8)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClientes(((data ?? []) as any[]).map(c => ({ id: c.id, label: nomeEmpresaCliente(c) })))
    }, 250)
    return () => clearTimeout(h)
  }, [texto, fixado])

  // Fecha ao clicar fora.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const term = texto.trim().toLowerCase()
  const lojasFiltradas = fixado || term.length < 2
    ? []
    : lojas.filter(l => l.label.toLowerCase().includes(term)).slice(0, 8)

  function escolher(s: SelecaoCliLoja) {
    setTexto(s.label); setFixado(true); setAberto(false); onSelecionar(s)
  }
  function limpar() {
    setTexto(''); setFixado(false); setClientes([]); onSelecionar(null)
  }

  return (
    <div ref={boxRef} className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#56577A' }} />
      <input
        value={texto}
        onChange={e => { setTexto(e.target.value); setFixado(false); setAberto(true); onSelecionar(null) }}
        onFocus={() => setAberto(true)}
        placeholder="Digite o cliente ou a loja (PDV)…"
        className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      />
      {texto && (
        <button type="button" onClick={limpar} className="absolute right-2 top-1/2 -translate-y-1/2 p-1" style={{ color: '#A0AEC0' }}>
          <X size={14} />
        </button>
      )}

      {aberto && !fixado && (clientes.length > 0 || lojasFiltradas.length > 0) && (
        <div className="absolute z-20 mt-1 w-full rounded-xl overflow-hidden max-h-64 overflow-y-auto"
          style={{ background: '#0b1230', border: '1px solid rgba(255,255,255,0.1)' }}>
          {clientes.map(c => (
            <button type="button" key={'c' + c.id} onClick={() => escolher({ tipo: 'cliente', id: c.id, label: c.label })}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center justify-between gap-2">
              <span className="truncate">{c.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: '#0075FF', background: 'rgba(0,117,255,0.12)' }}>Cliente</span>
            </button>
          ))}
          {lojasFiltradas.map(l => (
            <button type="button" key={'l' + l.id} onClick={() => escolher({ tipo: 'loja', id: l.id, label: l.label })}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center justify-between gap-2">
              <span className="truncate">{l.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: '#9F7AEA', background: 'rgba(159,122,234,0.14)' }}>PDV</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
