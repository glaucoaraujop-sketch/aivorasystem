'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart, Plus, Truck, DollarSign, Clock, Upload, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { usePedidos } from '@/hooks/usePedidos'
import { usePedidosResumo } from '@/hooks/usePedidosResumo'
import { useFornecedores } from '@/hooks/useFornecedores'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'
import { ImportadorPedidos } from '@/components/import/ImportadorPedidos'
import { RelatorioModal } from '@/components/pedidos/RelatorioModal'
import { nomeEmpresaCliente } from '@/lib/nomeCliente'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  processado:  { label: 'Processado',  color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
  em_carga:    { label: 'Em Carga',    color: '#9F7AEA', bg: 'rgba(159,122,234,0.15)' },
  em_producao: { label: 'Em Produção', color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
  faturado:    { label: 'Faturado',    color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  cancelado:   { label: 'Cancelado',   color: '#FC8181', bg: 'rgba(252,129,129,0.15)' },
}

const FILTROS: { value: OrderStatus | ''; label: string }[] = [
  { value: '',            label: 'Todos' },
  { value: 'processado',  label: 'Processado' },
  { value: 'em_carga',    label: 'Em Carga' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'faturado',    label: 'Faturado' },
]

export default function PedidosPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [page, setPage] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const [relatorioOpen, setRelatorioOpen] = useState(false)
  const { fornecedores } = useFornecedores()
  const pageSize = 30

  // debounce da busca (não consulta a cada tecla)
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350)
    return () => clearTimeout(t)
  }, [busca])
  // volta pra 1ª página ao mudar filtro/busca
  useEffect(() => { setPage(0) }, [status, buscaDebounced])

  const { pedidos, total, loading, refetch } = usePedidos({ status, busca: buscaDebounced, page, pageSize })
  // KPIs globais agregados no banco (independem da lista paginada)
  const resumo = usePedidosResumo(total)

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize))
  const inicio = total === 0 ? 0 : page * pageSize + 1
  const fim = Math.min(page * pageSize + pageSize, total)

  const metrics = [
    { label: 'Total de Pedidos', value: resumo ? resumo.total_pedidos.toLocaleString('pt-BR') : '—', icon: ShoppingCart, color: '#0075FF', bg: 'rgba(0,117,255,0.15)'   },
    { label: 'Em Aberto',        value: resumo ? resumo.em_aberto.toLocaleString('pt-BR') : '—',     icon: Clock,        color: '#F6AD55', bg: 'rgba(246,173,85,0.15)'  },
    { label: 'Total de Vendas',  value: resumo ? formatCurrency(resumo.total_vendas) : '—',          icon: DollarSign,   color: '#01B574', bg: 'rgba(1,181,116,0.15)'   },
  ]

  return (
    <div className="max-w-5xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">PEDIDOS</h1>
        </div>
        <div className="flex gap-2 sm:flex-shrink-0 flex-wrap">
          <button
            onClick={() => setRelatorioOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <FileText size={15} />
            Relatório
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <Upload size={15} />
            Importar
          </button>
          <Link
            href="/pedidos/novo"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
              boxShadow: '0 4px 20px rgba(0, 117, 255, 0.3)',
            }}
          >
            <Plus size={16} />
            Novo Pedido
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A0AEC0' }}>{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#56577A' }} />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar por número, cliente ou fornecedor..."
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value as OrderStatus | '')}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={status === f.value ? {
                background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)',
                color: '#ffffff',
                boxShadow: '0 2px 12px rgba(0,117,255,0.25)',
              } : {
                background: 'rgba(255,255,255,0.06)',
                color: '#A0AEC0',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-4 rounded-lg w-1/4 mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 rounded-lg w-1/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="h-6 rounded-lg w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ShoppingCart size={28} style={{ color: '#56577A' }} />
          </div>
          <p className="text-white font-semibold text-lg">Nenhum pedido encontrado</p>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>
            {buscaDebounced.trim() ? 'Tente outra pesquisa' : status ? 'Tente outro filtro' : 'Clique em "Novo Pedido" para começar'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pedidos.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <Link
                key={p.id}
                href={`/pedidos/${p.id}`}
                className="flex items-center gap-4 glass-card rounded-2xl p-4 transition-all group"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,117,255,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-mono text-xs" style={{ color: '#56577A' }}>{p.number}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                    {p.finalidade === 'mostruario' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ color: '#9F7AEA', background: 'rgba(159,122,234,0.15)' }}>
                        Mostruário
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {nomeEmpresaCliente(p.clients)}
                  </p>
                  {p.suppliers && (
                    <p className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: '#56577A' }}>
                      <Truck size={11} />
                      {p.suppliers.name}
                      {p.delivery_date && ` · Entrega: ${formatDate(p.delivery_date)}`}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-semibold text-white">{formatCurrency(p.total)}</p>
                  <p className="text-xs" style={{ color: '#56577A' }}>{formatDate(p.created_at)}</p>
                  {p.commission_value && (
                    <p className="text-xs font-medium" style={{ color: '#01B574' }}>
                      comissão: {formatCurrency(p.commission_value)}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs" style={{ color: '#56577A' }}>
            {inicio.toLocaleString('pt-BR')}–{fim.toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="text-xs px-2" style={{ color: '#A0AEC0' }}>
              {page + 1} / {totalPaginas}
            </span>
            <button
              onClick={() => setPage(p => (p + 1 < totalPaginas ? p + 1 : p))}
              disabled={page + 1 >= totalPaginas}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Próxima <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {importOpen && (
        <ImportadorPedidos
          onClose={() => setImportOpen(false)}
          onImported={() => { refetch(); }}
        />
      )}

      <RelatorioModal
        open={relatorioOpen}
        onClose={() => setRelatorioOpen(false)}
        suppliers={fornecedores.map((f) => ({ id: f.id, name: f.name }))}
      />
    </div>
  )
}
