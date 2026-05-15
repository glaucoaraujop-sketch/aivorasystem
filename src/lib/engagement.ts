export type EngagementLevel = 'ativo' | 'atencao' | 'alerta' | 'sem_pedido' | 'inativo'

export interface EngagementStatus {
  level: EngagementLevel
  label: string
  color: string
  bg: string
  days: number | null
}

export function clientEngagement(
  active: boolean,
  lastOrderAt: string | null,
  createdAt: string,
): EngagementStatus {
  if (!active) {
    return { level: 'inativo', label: 'Inativo', color: '#A0AEC0', bg: 'rgba(160,174,192,0.12)', days: null }
  }

  // Usa a data do último pedido ou, se nunca comprou, a data de cadastro
  const ref = lastOrderAt ? new Date(lastOrderAt) : new Date(createdAt)
  const days = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24))

  if (days < 45) return { level: 'ativo',      label: 'Ativo',    color: '#01B574', bg: 'rgba(1,181,116,0.15)',    days }
  if (days < 60) return { level: 'atencao',    label: 'Atenção',  color: '#ECC94B', bg: 'rgba(236,201,75,0.15)',   days }
  if (days < 90) return { level: 'alerta',     label: 'Alerta',   color: '#ED8936', bg: 'rgba(237,137,54,0.15)',   days }
  return              { level: 'sem_pedido', label: 'Sem pedido', color: '#FC8181', bg: 'rgba(252,129,129,0.15)', days }
}
