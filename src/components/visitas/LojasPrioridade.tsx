'use client'

import Link from 'next/link'
import { Store, MessageCircle, MapPin, Clock } from 'lucide-react'
import { useLojasRanking, PRIORIDADE_PDV, type LojaRanking } from '@/hooks/useClientLojas'
import { formatCurrency } from '@/lib/utils'

const ORDEM = [1, 2, 3, 4, 0] // 0 = sem classificação

function grupoCfg(p: number) {
  if (p === 0) return { label: 'Sem classificação', color: '#56577A', bg: 'rgba(255,255,255,0.05)' }
  return PRIORIDADE_PDV[p]
}

function LojaLinha({ l }: { l: LojaRanking }) {
  const frio = l.dias_desde_ultima != null && l.dias_desde_ultima >= 30
  return (
    <div className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Store size={13} style={{ color: '#0075FF' }} />
          <span className="font-semibold text-sm text-white truncate">{l.loja}</span>
          <span className="text-xs" style={{ color: '#56577A' }}>· {l.cliente}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs flex-wrap" style={{ color: '#A0AEC0' }}>
          <span className="font-semibold" style={{ color: '#01B574' }}>{formatCurrency(l.faturamento)}</span>
          <span>{l.pedidos} ped.</span>
          {l.dias_desde_ultima != null && (
            <span className="flex items-center gap-1" style={{ color: frio ? '#FC8181' : '#A0AEC0' }}>
              <Clock size={10} /> {l.dias_desde_ultima}d
            </span>
          )}
          {l.cidade && <span className="flex items-center gap-1"><MapPin size={10} /> {l.cidade}{l.uf ? `/${l.uf}` : ''}</span>}
        </div>
      </div>
      {l.whatsapp && (
        <a href={`https://wa.me/55${l.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
          className="p-1.5 rounded-lg flex-shrink-0" style={{ color: '#01B574' }}>
          <MessageCircle size={15} />
        </a>
      )}
    </div>
  )
}

export function LojasPrioridade() {
  const { lojas, loading } = useLojasRanking()
  if (loading || lojas.length === 0) return null

  const porGrupo = new Map<number, LojaRanking[]>()
  for (const l of lojas) {
    const g = l.prioridade ?? 0
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g)!.push(l)
  }
  // dentro do grupo, mais "frios" (dias sem comprar) primeiro; depois maior faturamento
  for (const arr of porGrupo.values()) {
    arr.sort((a, b) => (b.dias_desde_ultima ?? -1) - (a.dias_desde_ultima ?? -1) || b.faturamento - a.faturamento)
  }

  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Store size={16} style={{ color: '#0075FF' }} />
        <h2 className="font-bold text-white text-base">Lojas (PDVs) por classificação</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: '#56577A' }}>
        Filiais físicas priorizadas pela classificação do representante (VIP/Ouro/Prata/Bronze). Classifique cada PDV em Clientes → seção Lojas/PDVs.
      </p>

      <div className="space-y-4">
        {ORDEM.filter(g => porGrupo.has(g)).map(g => {
          const cfg = grupoCfg(g)
          const items = porGrupo.get(g)!
          return (
            <div key={g}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                <span className="text-xs" style={{ color: '#56577A' }}>{items.length} {items.length === 1 ? 'loja' : 'lojas'}</span>
                {g === 0 && <span className="text-[11px]" style={{ color: '#56577A' }}>— defina a classificação em Clientes</span>}
              </div>
              <div className="space-y-1.5">
                {items.map(l => <LojaLinha key={l.loja_id} l={l} />)}
              </div>
            </div>
          )
        })}
      </div>

      <Link href="/clientes" className="inline-block mt-4 text-xs" style={{ color: '#56577A' }}>
        Gerenciar PDVs em Clientes →
      </Link>
    </section>
  )
}
