'use client'

import { useMemo, useState } from 'react'
import { X, FileText, Calendar, Loader2, Download } from 'lucide-react'
import type { OrderStatus } from '@/types/database'
import {
  buscarPedidosRelatorio,
  dataDaLinha,
  type BaseData,
  type FiltroRelatorio,
  type LinhaRelatorio,
} from '@/lib/relatorioPedidos'
import { gerarRelatorioPedidosPDF } from '@/lib/gerarRelatorioPedidosPDF'

const STATUS_OPCOES: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'processado', label: 'Processado' },
  { value: 'em_carga', label: 'Em Carga' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPCOES.filter((o) => o.value).map((o) => [o.value, o.label]),
)

function isoHoje(offsetDias = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().slice(0, 10)
}
function isoInicioMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function fmtMoeda(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtData(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('pt-BR')
}

export function RelatorioModal({
  open,
  onClose,
  suppliers,
}: {
  open: boolean
  onClose: () => void
  suppliers: { id: string; name: string }[]
}) {
  const [de, setDe] = useState(isoInicioMes())
  const [ate, setAte] = useState(isoHoje())
  const [base, setBase] = useState<BaseData>('emissao')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [supplierId, setSupplierId] = useState('')

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<LinhaRelatorio[] | null>(null)

  const filtros: FiltroRelatorio = useMemo(
    () => ({ de, ate, base, status, supplierId }),
    [de, ate, base, status, supplierId],
  )
  const fabricaNome = supplierId ? suppliers.find((s) => s.id === supplierId)?.name ?? 'Todas' : 'Todas'

  const soma = resultado ? resultado.reduce((s, l) => s + l.total, 0) : 0

  async function gerar() {
    setErro('')
    if (!de || !ate) {
      setErro('Informe o período (data inicial e final).')
      return
    }
    if (de > ate) {
      setErro('A data inicial não pode ser maior que a final.')
      return
    }
    setLoading(true)
    setResultado(null)
    try {
      const linhas = await buscarPedidosRelatorio(filtros)
      setResultado(linhas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar o relatório.')
    } finally {
      setLoading(false)
    }
  }

  function exportar() {
    if (!resultado || resultado.length === 0) return
    gerarRelatorioPedidosPDF(resultado, filtros, fabricaNome)
  }

  // Ao mudar qualquer filtro, invalida o resultado anterior.
  function onFiltroChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setResultado(null)
      setter(v)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={() => !loading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(127deg, rgba(6,11,40,0.98) 19%, rgba(10,14,35,0.95) 77%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,117,255,0.12)' }}>
              <FileText size={17} style={{ color: '#0075FF' }} />
            </div>
            <h2 className="text-lg font-semibold text-white">Gerar relatório de pedidos</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#A0AEC0' }}>
            <X size={18} />
          </button>
        </div>

        {/* Período */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Campo label="De">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#56577A' }} />
              <input type="date" value={de} onChange={(e) => onFiltroChange(setDe)(e.target.value)} className={inputCls + ' pl-9'} style={inputStyle} />
            </div>
          </Campo>
          <Campo label="Até">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#56577A' }} />
              <input type="date" value={ate} onChange={(e) => onFiltroChange(setAte)(e.target.value)} className={inputCls + ' pl-9'} style={inputStyle} />
            </div>
          </Campo>
        </div>

        {/* Base da data */}
        <Campo label="Base da data">
          <div className="flex gap-2">
            {([
              { v: 'emissao', l: 'Emissão' },
              { v: 'faturamento', l: 'Faturamento' },
            ] as { v: BaseData; l: string }[]).map((b) => (
              <button
                key={b.v}
                type="button"
                onClick={() => onFiltroChange(setBase)(b.v)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={
                  base === b.v
                    ? { background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#A0AEC0', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {b.l}
              </button>
            ))}
          </div>
        </Campo>

        {/* Status + Fábrica */}
        <div className="grid grid-cols-2 gap-3 mt-3 mb-1">
          <Campo label="Status">
            <select value={status} onChange={(e) => onFiltroChange(setStatus)(e.target.value as OrderStatus | '')} className={inputCls} style={inputStyle}>
              {STATUS_OPCOES.map((o) => (
                <option key={o.value || 'todos'} value={o.value} style={{ color: '#000' }}>
                  {o.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Fábrica">
            <select value={supplierId} onChange={(e) => onFiltroChange(setSupplierId)(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="" style={{ color: '#000' }}>Todas</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id} style={{ color: '#000' }}>
                  {s.name}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {erro && <p className="text-xs mt-2" style={{ color: '#FC8181' }}>{erro}</p>}

        {/* Ações */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={gerar}
            disabled={loading}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0075FF 0%, #4318FF 100%)' }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {loading ? 'Gerando…' : 'Gerar relatório'}
          </button>
          <button
            onClick={exportar}
            disabled={!resultado || resultado.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(1,181,116,0.15)', color: '#01B574', border: '1px solid rgba(1,181,116,0.3)' }}
          >
            <Download size={15} />
            Exportar PDF
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex gap-4">
                <Resumo label="Pedidos" valor={resultado.length.toLocaleString('pt-BR')} />
                <Resumo label="Valor total" valor={fmtMoeda(soma)} destaque />
              </div>
            </div>

            {resultado.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: '#A0AEC0' }}>
                Nenhum pedido encontrado para esses filtros.
              </p>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0" style={{ background: '#0b1230' }}>
                      <tr style={{ color: '#A0AEC0' }}>
                        <Th>Nº</Th>
                        <Th>Data</Th>
                        <Th>Cliente</Th>
                        <Th>Status</Th>
                        <Th right>Valor</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.slice(0, 200).map((l, i) => (
                        <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <Td>{l.number || '—'}</Td>
                          <Td>{fmtData(dataDaLinha(l, base))}</Td>
                          <Td>{l.cliente}</Td>
                          <Td>
                            <span style={{ color: '#A0AEC0' }}>{STATUS_LABEL[l.status] || l.status}</span>
                          </Td>
                          <Td right>{fmtMoeda(l.total)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {resultado.length > 200 && (
                  <p className="text-xs py-2 text-center" style={{ color: '#56577A', background: '#0b1230' }}>
                    Mostrando 200 de {resultado.length} — o PDF traz todos.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:border-blue-500/50 [color-scheme:dark]'
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: '#A0AEC0' }}>{label}</label>
      {children}
    </div>
  )
}
function Resumo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-xs" style={{ color: '#56577A' }}>{label}</p>
      <p className="font-bold" style={{ color: destaque ? '#01B574' : '#fff', fontSize: destaque ? 18 : 16 }}>{valor}</p>
    </div>
  )
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 text-xs font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-3 py-2 text-white ${right ? 'text-right' : 'text-left'}`}>{children}</td>
}
