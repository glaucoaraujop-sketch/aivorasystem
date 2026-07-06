import type { BusinessRules } from './types'

// Mapeia os dias das Business Rules (chaves em pt) para o índice do JS
// (0=Domingo … 6=Sábado), para uso em cálculos de data.
const INDICE_DIA: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
}

// Conjunto de índices dos dias úteis de visita (a partir das Business Rules).
export function diasDeVisitaSet(rules: BusinessRules): Set<number> {
  return new Set(
    rules.working_days.map(d => INDICE_DIA[d]).filter(i => i !== undefined),
  )
}

// Avança `date` para o próximo dia de visita (inclusive o próprio, se válido).
export function proximoDiaDeVisita(date: Date, dias: Set<number>): Date {
  if (dias.size === 0) return date
  const d = new Date(date)
  for (let i = 0; i < 7; i++) {
    if (dias.has(d.getDay())) return d
    d.setDate(d.getDate() + 1)
  }
  return d
}

// Cadência ideal (dias) de um nível de prioridade, pelas Business Rules.
export function idealDaysPrioridade(rules: BusinessRules, priorityId: number): number {
  const lvl = rules.priority_levels.find(l => l.id === priorityId)
  return lvl?.ideal_days ?? 30
}
