import type { BusinessRules } from './types'

// Regras PADRÃO (fallback). NÃO são a "verdade" — são o ponto de partida quando
// a empresa ainda não configurou suas próprias Business Rules. Qualquer valor
// aqui pode ser sobrescrito por configuração, sem alterar a lógica do motor.
export const DEFAULT_BUSINESS_RULES: BusinessRules = {
  working_days: ['terca', 'quarta', 'quinta'],
  visits_per_day: 4,
  priority_levels: [
    { id: 1, name: 'VIP',    ideal_days: 15, tolerance_days: 3, priority_weight: 100, enabled: true },
    { id: 2, name: 'Ouro',   ideal_days: 22, tolerance_days: 3, priority_weight: 80,  enabled: true },
    { id: 3, name: 'Prata',  ideal_days: 29, tolerance_days: 2, priority_weight: 60,  enabled: true },
    { id: 4, name: 'Bronze', ideal_days: 36, tolerance_days: 2, priority_weight: 40,  enabled: true },
  ],
  score_weights: {
    priority_weight: 1,
    days_since_visit: 2,
    pdvs: 5,
    potencial: 0,        // sem fonte de dados hoje → peso 0 por padrão
    faturamento: 0.001,  // faturamento em R$ → peso pequeno
    recent_visit_penalty: 3,
    already_scheduled_penalty: 100000,
  },
}

// Forma mínima do system_settings (o que o representante já edita na aba Configurações).
export interface SystemSettingsLike {
  priority_1_days?: number | null
  priority_2_days?: number | null
  priority_3_days?: number | null
  priority_4_days?: number | null
  clients_per_day?: number | null
  visit_sun?: boolean | null; visit_mon?: boolean | null; visit_tue?: boolean | null
  visit_wed?: boolean | null; visit_thu?: boolean | null; visit_fri?: boolean | null
  visit_sat?: boolean | null
}

const DIA_MAP: [keyof SystemSettingsLike, string][] = [
  ['visit_mon', 'segunda'], ['visit_tue', 'terca'], ['visit_wed', 'quarta'],
  ['visit_thu', 'quinta'], ['visit_fri', 'sexta'], ['visit_sat', 'sabado'], ['visit_sun', 'domingo'],
]

// Converte as configurações que o usuário JÁ edita (system_settings) em Business
// Rules, sobrepondo o padrão. Mantém tudo config-driven: dias úteis, capacidade e
// cadência ideal vêm da configuração; pesos/tolerâncias caem no padrão até serem
// definidos na tabela business_rules.
export function rulesFromSettings(
  s: SystemSettingsLike | null | undefined,
  base: BusinessRules = DEFAULT_BUSINESS_RULES,
): BusinessRules {
  if (!s) return base
  const dias = DIA_MAP.filter(([k]) => !!s[k]).map(([, d]) => d)
  const idealHints = [s.priority_1_days, s.priority_2_days, s.priority_3_days, s.priority_4_days]
  const priority_levels = base.priority_levels.map((lvl, i) => ({
    ...lvl,
    ideal_days: idealHints[i] != null ? Number(idealHints[i]) : lvl.ideal_days,
  }))
  return {
    ...base,
    working_days: dias.length ? dias : base.working_days,
    // system_settings usa "clients_per_day"; aqui equivale à capacidade/dia (em PDVs)
    visits_per_day: s.clients_per_day != null ? Number(s.clients_per_day) : base.visits_per_day,
    priority_levels,
  }
}
