'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Radar, Snowflake, Flame, TrendingUp, ArrowRight } from 'lucide-react'
import { useRadarCarteira } from '@/hooks/useRadarCarteira'
import { useClientesQuentes } from '@/hooks/useClientesQuentes'
import { percentAlemDoRitmo, rotuloSegmento } from '@/lib/ai/radar'
import { nomeEmpresaCliente } from '@/lib/nomeCliente'

const CORES_SEG: Record<string, { cor: string; bg: string }> = {
  esfriando: { cor: '#F6AD55', bg: 'rgba(246,173,85,0.14)' },
  em_risco:  { cor: '#FC8181', bg: 'rgba(252,129,129,0.14)' },
}

// Valor compacto em reais (R$ 159 mil / R$ 1,2 mi)
function moedaCurta(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`
  return `R$ ${Math.round(v)}`
}

type Aba = 'frios' | 'quentes'

export function RadarCard() {
  const [aba, setAba] = useState<Aba>('frios')
  const { itens: frios, loading: loadingFrios } = useRadarCarteira(8)
  const { itens: quentes, loading: loadingQuentes } = useClientesQuentes(8)

  const loading = aba === 'frios' ? loadingFrios : loadingQuentes

  const TabBtn = ({ id, icon: Icon, label }: { id: Aba; icon: typeof Flame; label: string }) => (
    <button
      onClick={() => setAba(id)}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
      style={aba === id
        ? { background: 'rgba(255,255,255,0.1)', color: '#fff' }
        : { color: '#56577A' }}
    >
      <Icon size={13} /> {label}
    </button>
  )

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(246,173,85,0.14)' }}>
            <Radar size={17} style={{ color: '#F6AD55' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Radar da Carteira</p>
            <p className="text-xs" style={{ color: '#A0AEC0' }}>
              {aba === 'frios' ? 'Ligar esta semana' : 'Quentes · últimas 4 semanas'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <TabBtn id="frios" icon={Snowflake} label="Esfriando" />
          <TabBtn id="quentes" icon={Flame} label="Quentes" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : aba === 'frios' ? (
        frios.length === 0 ? (
          <Vazio titulo="Carteira em dia 👍" sub="Ninguém saindo do próprio ritmo de compra." />
        ) : (
          <div className="space-y-2">
            {frios.map((it, i) => {
              const seg = CORES_SEG[it.segmento] ?? CORES_SEG.esfriando
              const pct = percentAlemDoRitmo(it.atraso_relativo)
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{it.cliente}</p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                        style={{ color: seg.cor, background: seg.bg }}>{rotuloSegmento(it.segmento)}</span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#A0AEC0' }}>
                      {it.fabricas[0] ? `${it.fabricas[0]} · ` : ''}
                      {it.cadencia_media_dias != null ? `compra a cada ~${Math.round(it.cadencia_media_dias)}d` : 'cadência —'}
                      {it.dias_desde_ultimo != null ? ` · há ${Math.round(it.dias_desde_ultimo)}d sem comprar` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: seg.cor }}>{pct}%</p>
                    <p className="text-[10px]" style={{ color: '#56577A' }}>além do ritmo</p>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : quentes.length === 0 ? (
        <Vazio titulo="Sem compras nas últimas 4 semanas" sub="Assim que entrarem pedidos recentes, eles aparecem aqui." />
      ) : (
        <div className="space-y-2">
          {quentes.map((it, i) => {
            const nome = nomeEmpresaCliente({ name: it.client_name, company_name: it.company_name, razao_social: it.razao_social })
            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{nome}</p>
                    {it.crescendo && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                        style={{ color: '#01B574', background: 'rgba(1,181,116,0.14)' }}>
                        <TrendingUp size={10} /> crescendo
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#A0AEC0' }}>
                    {it.pedidos_28d} pedido{it.pedidos_28d > 1 ? 's' : ''}
                    {it.dias_desde_ultimo != null ? ` · última há ${it.dias_desde_ultimo}d` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: '#01B574' }}>{moedaCurta(it.valor_28d)}</p>
                  <p className="text-[10px]" style={{ color: '#56577A' }}>4 semanas</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Link href="/clientes" className="flex items-center justify-end gap-1 mt-3 text-xs transition-all hover:opacity-70"
        style={{ color: '#56577A' }}>
        ver clientes <ArrowRight size={13} />
      </Link>
    </div>
  )
}

function Vazio({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-white font-medium">{titulo}</p>
      <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>{sub}</p>
    </div>
  )
}
