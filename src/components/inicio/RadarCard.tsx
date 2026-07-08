'use client'

import Link from 'next/link'
import { Radar, ArrowRight } from 'lucide-react'
import { useRadarCarteira } from '@/hooks/useRadarCarteira'
import { percentAlemDoRitmo, rotuloSegmento } from '@/lib/ai/radar'

const CORES_SEG: Record<string, { cor: string; bg: string }> = {
  esfriando: { cor: '#F6AD55', bg: 'rgba(246,173,85,0.14)' },
  em_risco:  { cor: '#FC8181', bg: 'rgba(252,129,129,0.14)' },
}

export function RadarCard() {
  const { itens, loading } = useRadarCarteira(8)

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
            <p className="text-xs" style={{ color: '#A0AEC0' }}>Ligar esta semana</p>
          </div>
        </div>
        <Link href="/clientes" className="p-1.5 rounded-lg transition-all hover:opacity-70"
          style={{ color: '#A0AEC0' }}>
          <ArrowRight size={16} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-white font-medium">Carteira em dia 👍</p>
          <p className="text-xs mt-0.5" style={{ color: '#56577A' }}>Ninguém saindo do próprio ritmo de compra.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map((it, i) => {
            const seg = CORES_SEG[it.segmento] ?? CORES_SEG.esfriando
            const pct = percentAlemDoRitmo(it.atraso_relativo)
            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{it.cliente}</p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                      style={{ color: seg.cor, background: seg.bg }}>
                      {rotuloSegmento(it.segmento)}
                    </span>
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
      )}
    </div>
  )
}
