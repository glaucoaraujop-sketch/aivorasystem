'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Users, FileText, Clock, ArrowRight, Store, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useRelatorios } from '@/hooks/useRelatorios'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AiCard } from '@/components/ai/AiCard'
import { useAI } from '@/hooks/useAI'

const STATUS_PT: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado',
  recusado: 'Recusado', expirado: 'Expirado',
}
const PIPELINE_COLORS: Record<string, string> = {
  rascunho: 'rgba(160,174,192,0.6)',
  enviado:  'rgba(0,117,255,0.8)',
  aprovado: 'rgba(1,181,116,0.8)',
  recusado: 'rgba(252,129,129,0.8)',
  expirado: 'rgba(246,173,85,0.8)',
}

function KpiCard({
  label, value, sub, icon: Icon, trend, linkTo,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral'; linkTo?: string
}) {
  const inner = (
    <div className={`glass-card rounded-2xl p-5 h-full transition-all ${linkTo ? 'cursor-pointer' : ''}`}
      onMouseEnter={e => { if (linkTo) { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,117,255,0.3)' } }}
      onMouseLeave={e => { if (linkTo) { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.08)' } }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#A0AEC0' }}>{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,117,255,0.12)' }}>
          <Icon size={15} style={{ color: '#0075FF' }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {sub && (
        <div className="flex items-center gap-1">
          {trend === 'up'   && <TrendingUp  size={12} style={{ color: '#01B574' }} />}
          {trend === 'down' && <TrendingDown size={12} style={{ color: '#FC8181' }} />}
          <p className="text-xs" style={{
            color: trend === 'up' ? '#01B574' : trend === 'down' ? '#FC8181' : '#56577A'
          }}>{sub}</p>
        </div>
      )}
    </div>
  )
  return linkTo ? <Link href={linkTo} className="block">{inner}</Link> : inner
}

const CustomTooltip = ({
  active, payload, label,
}: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 text-sm"
      style={{ background: 'rgba(6,11,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#A0AEC0' }}>
          {p.name === 'faturamento' ? 'Faturamento' : 'Comissão'}:{' '}
          <span className="font-bold text-white">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function RelatoriosPage() {
  const { kpis, vendasMes, topClientes, pipeline, proximasComissoes, loading } = useRelatorios()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inteligencia'>('dashboard')
  const insights = useAI()

  function handleGerarInsights() {
    if (!kpis) return
    insights.generate('/api/ai/insights', { kpis, vendasMes, topClientes, pipeline, proximasComissoes })
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
            <div className="h-3 rounded-lg w-1/2 mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-7 rounded-lg w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  )

  const varPct = kpis && kpis.faturamentoMesAnterior > 0
    ? ((kpis.faturamentoMes - kpis.faturamentoMesAnterior) / kpis.faturamentoMesAnterior * 100).toFixed(1)
    : null

  return (
    <div className="max-w-5xl w-full space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">RELATÓRIOS</h1>
          <p className="text-sm mt-1" style={{ color: '#A0AEC0' }}>Visão geral e inteligência do seu negócio</p>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === 'dashboard'
              ? { background: 'rgba(0,117,255,0.15)', color: '#0075FF', border: '1px solid rgba(0,117,255,0.3)' }
              : { color: '#A0AEC0', border: '1px solid transparent' }
            }
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('inteligencia')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === 'inteligencia'
              ? { background: 'rgba(109,40,217,0.15)', color: '#A78BFA', border: '1px solid rgba(109,40,217,0.3)' }
              : { color: '#A0AEC0', border: '1px solid transparent' }
            }
          >
            <Sparkles size={13} /> AIVA
          </button>
        </div>
      </div>

      {/* Aba Inteligência */}
      {activeTab === 'inteligencia' && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(109,40,217,0.06)', border: '1px solid rgba(109,40,217,0.2)' }}>
            <p className="text-sm font-semibold text-white mb-1">Análise Inteligente do Negócio</p>
            <p className="text-xs" style={{ color: '#A0AEC0' }}>
              A IA analisa seus dados em tempo real — faturamento, clientes, orçamentos e comissões — e gera insights acionáveis para você tomar decisões mais rápidas.
            </p>
          </div>
          <AiCard
            title="Insights do Negócio"
            text={insights.text}
            loading={insights.loading}
            error={insights.error}
            onGenerate={handleGerarInsights}
            onReset={insights.reset}
            generateLabel="Analisar meu negócio agora"
          />
        </div>
      )}

      {/* Aba Dashboard */}
      {activeTab === 'dashboard' && (
      <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Faturamento do Mês"   value={formatCurrency(kpis?.faturamentoMes ?? 0)}
          sub={varPct ? `${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs mês anterior` : 'Primeiro mês'}
          trend={varPct ? (Number(varPct) >= 0 ? 'up' : 'down') : 'neutral'} icon={TrendingUp} linkTo="/pedidos" />
        <KpiCard label="Comissões a Receber"  value={formatCurrency(kpis?.comissoesAReceber ?? 0)}
          sub="previstas + aprovadas" trend="neutral" icon={DollarSign} linkTo="/comissoes" />
        <KpiCard label="Pedidos em Aberto"    value={String(kpis?.pedidosAbertos ?? 0)}
          sub="aguardando entrega" trend="neutral" icon={ShoppingCart} linkTo="/pedidos" />
        <KpiCard label="Clientes Ativos"      value={String(kpis?.clientesAtivos ?? 0)}
          icon={Users} linkTo="/clientes" />
        <KpiCard label="Total de Lojas"       value={String(kpis?.totalLojas ?? 0)}
          sub="lojas atendidas (ativos)" trend="neutral" icon={Store} linkTo="/clientes" />
        <KpiCard label="Orçamentos Enviados"  value={String(kpis?.orcamentosEnviados ?? 0)}
          sub="aguardando resposta" trend="neutral" icon={FileText} linkTo="/orcamentos" />
        <KpiCard label="Comissões Próximas"   value={String(proximasComissoes.length)}
          sub="com vencimento próximo" icon={Clock} linkTo="/comissoes" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendas por mês */}
        <div className="glass-card rounded-2xl p-5 md:col-span-2">
          <p className="font-semibold text-white mb-5">Faturamento — Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={vendasMes} barGap={4}>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#56577A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#56577A' }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="faturamento" name="faturamento" fill="#0075FF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comissao"    name="comissao"    fill="rgba(44,217,255,0.5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#0075FF' }} />
              <span className="text-xs" style={{ color: '#56577A' }}>Faturamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'rgba(44,217,255,0.5)' }} />
              <span className="text-xs" style={{ color: '#56577A' }}>Comissão</span>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="glass-card rounded-2xl p-5">
          <p className="font-semibold text-white mb-4">Pipeline de Orçamentos</p>
          {pipeline.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#56577A' }}>Sem dados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pipeline} dataKey="count" nameKey="status" cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {pipeline.map(entry => (
                      <Cell key={entry.status} fill={PIPELINE_COLORS[entry.status] ?? 'rgba(160,174,192,0.4)'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'rgba(6,11,40,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff' }}
                    formatter={(v, name) => [v, STATUS_PT[String(name)] ?? name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pipeline.map(p => (
                  <div key={p.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ background: PIPELINE_COLORS[p.status] ?? 'rgba(160,174,192,0.4)' }} />
                      <span style={{ color: '#A0AEC0' }}>{STATUS_PT[p.status] ?? p.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-white">{p.count}</span>
                      <span className="ml-1" style={{ color: '#56577A' }}>· {formatCurrency(p.total_value)}</span>
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
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold text-white">Top Clientes</p>
            <Link href="/clientes" className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: '#0075FF' }}>
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {topClientes.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#56577A' }}>Sem dados ainda</p>
          ) : (
            <div className="space-y-4">
              {topClientes.map((c, i) => {
                const pct = (c.total_revenue / (topClientes[0]?.total_revenue ?? 1)) * 100
                return (
                  <div key={c.client_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold w-4" style={{ color: '#56577A' }}>{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{c.client_name}</p>
                          {c.company_name && (
                            <p className="text-xs truncate" style={{ color: '#56577A' }}>{c.company_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold" style={{ color: '#2CD9FF' }}>{formatCurrency(c.total_revenue)}</p>
                        <p className="text-xs" style={{ color: '#56577A' }}>{c.total_orders} pedido{c.total_orders !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0075FF, #2CD9FF)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Próximas comissões */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="font-semibold text-white">Próximos Recebimentos</p>
            <Link href="/comissoes" className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: '#0075FF' }}>
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {proximasComissoes.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#56577A' }}>Nenhuma comissão prevista</p>
          ) : (
            <div className="space-y-2">
              {proximasComissoes.map(c => {
                const hoje   = new Date().toISOString().split('T')[0]
                const vencida = c.due_date < hoje
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={vencida
                      ? { background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.2)' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.client_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.order_number && (
                          <p className="text-xs font-mono" style={{ color: '#56577A' }}>{c.order_number}</p>
                        )}
                        <p className="text-xs" style={{ color: vencida ? '#F6AD55' : '#56577A' }}>
                          {vencida ? 'Vencida · ' : ''}{formatDate(c.due_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold" style={{ color: '#01B574' }}>{formatCurrency(c.value)}</p>
                      <p className="text-xs" style={{ color: '#56577A' }}>{c.pct}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      </div>
      )}
    </div>
  )
}
