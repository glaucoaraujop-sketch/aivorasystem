'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Users, FileText, Clock, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { useRelatorios } from '@/hooks/useRelatorios'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_PT: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado',
  recusado: 'Recusado', expirado: 'Expirado',
}
const PIPELINE_COLORS: Record<string, string> = {
  rascunho: '#e5e7eb', enviado: '#93c5fd', aprovado: '#4ade80',
  recusado: '#fca5a5', expirado: '#fdba74',
}

function KpiCard({
  label, value, sub, icon: Icon, trend, linkTo
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  linkTo?: string
}) {
  const card = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${linkTo ? 'hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
          <Icon size={16} className="text-gray-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {sub && (
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp size={13} className="text-green-500" />}
          {trend === 'down' && <TrendingDown size={13} className="text-red-400" />}
          <p className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>{sub}</p>
        </div>
      )}
    </div>
  )
  return linkTo ? <Link href={linkTo}>{card}</Link> : card
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          {p.name === 'faturamento' ? 'Faturamento' : 'Comissão'}: <span className="font-semibold">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function RelatoriosPage() {
  const { kpis, vendasMes, topClientes, pipeline, proximasComissoes, loading } = useRelatorios()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-7 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Variação mês a mês
  const varPct = kpis && kpis.faturamentoMesAnterior > 0
    ? ((kpis.faturamentoMes - kpis.faturamentoMesAnterior) / kpis.faturamentoMesAnterior * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Visão geral do seu negócio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Faturamento do Mês"
          value={formatCurrency(kpis?.faturamentoMes ?? 0)}
          sub={varPct ? `${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs mês anterior` : 'Primeiro mês'}
          trend={varPct ? (Number(varPct) >= 0 ? 'up' : 'down') : 'neutral'}
          icon={TrendingUp}
          linkTo="/pedidos"
        />
        <KpiCard
          label="Comissões a Receber"
          value={formatCurrency(kpis?.comissoesAReceber ?? 0)}
          sub="previstas + aprovadas"
          trend="neutral"
          icon={DollarSign}
          linkTo="/comissoes"
        />
        <KpiCard
          label="Pedidos em Aberto"
          value={String(kpis?.pedidosAbertos ?? 0)}
          sub="aguardando entrega"
          trend="neutral"
          icon={ShoppingCart}
          linkTo="/pedidos"
        />
        <KpiCard
          label="Clientes Ativos"
          value={String(kpis?.clientesAtivos ?? 0)}
          icon={Users}
          linkTo="/clientes"
        />
        <KpiCard
          label="Orçamentos Enviados"
          value={String(kpis?.orcamentosEnviados ?? 0)}
          sub="aguardando resposta"
          trend="neutral"
          icon={FileText}
          linkTo="/orcamentos"
        />
        <KpiCard
          label="Comissões Próximas"
          value={String(proximasComissoes.length)}
          sub="com vencimento próximo"
          icon={Clock}
          linkTo="/comissoes"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendas por mês */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <p className="font-semibold text-gray-900 mb-5">Faturamento — Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vendasMes} barGap={4}>
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="faturamento" name="faturamento" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="comissao"    name="comissao"    fill="#bbf7d0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /><span className="text-xs text-gray-400">Faturamento</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-200 inline-block" /><span className="text-xs text-gray-400">Comissão</span></div>
          </div>
        </div>

        {/* Pipeline orçamentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <p className="font-semibold text-gray-900 mb-4">Pipeline de Orçamentos</p>
          {pipeline.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">Sem dados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pipeline} dataKey="count" nameKey="status" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {pipeline.map(entry => (
                      <Cell key={entry.status} fill={PIPELINE_COLORS[entry.status] ?? '#e5e7eb'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, STATUS_PT[String(name)] ?? name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pipeline.map(p => (
                  <div key={p.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PIPELINE_COLORS[p.status] ?? '#e5e7eb' }} />
                      <span className="text-gray-500">{STATUS_PT[p.status] ?? p.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-700">{p.count}</span>
                      <span className="text-gray-400 ml-1">· {formatCurrency(p.total_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top clientes + Próximas comissões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top clientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900">Top Clientes</p>
            <Link href="/clientes" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {topClientes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda</p>
          ) : (
            <div className="space-y-3">
              {topClientes.map((c, i) => {
                const maxRevenue = topClientes[0]?.total_revenue ?? 1
                const pct = (c.total_revenue / maxRevenue) * 100
                return (
                  <div key={c.client_id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.client_name}</p>
                          {c.company_name && <p className="text-xs text-gray-400 truncate">{c.company_name}</p>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(c.total_revenue)}</p>
                        <p className="text-xs text-gray-400">{c.total_orders} pedido{c.total_orders !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Próximas comissões */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-900">Próximos Recebimentos</p>
            <Link href="/comissoes" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {proximasComissoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma comissão prevista</p>
          ) : (
            <div className="space-y-3">
              {proximasComissoes.map(c => {
                const hoje = new Date().toISOString().split('T')[0]
                const vencida = c.due_date < hoje
                return (
                  <div key={c.id} className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${vencida ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50'}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.client_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.order_number && <p className="text-xs text-gray-400 font-mono">{c.order_number}</p>}
                        <p className={`text-xs ${vencida ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                          {vencida ? 'Vencida ' : ''}{formatDate(c.due_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-green-600">{formatCurrency(c.value)}</p>
                      <p className="text-xs text-gray-400">{c.pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
